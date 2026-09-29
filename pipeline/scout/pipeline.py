import asyncio
import logging
import time
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any

import numpy as np
from sqlalchemy import bindparam, func, select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from scout.config import get_settings
from scout.db.models import Company, Job, Profile, Run, Score
from scout.db.session import get_setting, session_scope
from scout.dedup import DedupItem, find_groups
from scout.embed import get_embedder, job_text
from scout.filters import FilterJob, Preferences, passes
from scout.http import HttpClient
from scout.normalize import NormJob, normalize_job
from scout.notify import Digest, Notifier, get_notifier
from scout.profile import latest_profile
from scout.rank import DEFAULT_WEIGHTS, Calibrator, RankInput, final_score
from scout.scoring import CostGuard, JobInput, ProfileInput, ScorerChain
from scout.sources.ats import PARSERS as ATS_PARSERS
from scout.sources import CompanyRef, FetchResult, Source, all_sources

logger = logging.getLogger(__name__)

EMBED_BATCH = 256
ATS_NAMES = set(ATS_PARSERS)
NOTIFY_MIN_SCORE = 0.45
SCORE_CONCURRENCY = 4


@dataclass
class RunContext:
    counts: dict[str, Any] = field(default_factory=dict)
    errors: list[str] = field(default_factory=list)
    cost_usd: float = 0.0


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def load_company_refs(session: Session) -> list[CompanyRef]:
    rows = session.scalars(select(Company).where(Company.active.is_(True)))
    return [CompanyRef(id=c.id, name=c.name, ats=c.ats, slug=c.slug, tier=c.tier) for c in rows]


async def fetch_all(sources: list[Source], http: HttpClient) -> list[FetchResult]:
    async def guarded(source: Source) -> FetchResult:
        try:
            return await source.fetch(http)
        except Exception as exc:
            logger.exception("source %s crashed", source.name)
            return FetchResult(source=source.name, errors=[f"{source.name}: {type(exc).__name__}: {exc}"[:300]], complete=False)

    return list(await asyncio.gather(*(guarded(s) for s in sources)))


def normalize_all(results: list[FetchResult], ctx: RunContext) -> list[NormJob]:
    seen: set[tuple[str, str]] = set()
    jobs: list[NormJob] = []
    failed = 0
    for result in results:
        for raw in result.jobs:
            if not raw.title or not raw.url or (raw.source, raw.external_id) in seen:
                continue
            try:
                job = normalize_job(raw)
            except Exception as exc:
                failed += 1
                logger.warning("normalize failed %s/%s: %s", raw.source, raw.external_id, exc)
                continue
            seen.add((raw.source, raw.external_id))
            jobs.append(job)
    ctx.counts["normalized"] = len(jobs)
    ctx.counts["normalize_failed"] = failed
    return jobs


UPDATABLE = ["company_id", "company_name", "url", "title", "location", "remote", "seniority", "min_exp", "max_exp",
             "salary_min", "salary_max", "salary_currency", "description_md", "posted_at", "content_hash"]


def upsert_jobs(session: Session, jobs: list[NormJob], ctx: RunContext) -> dict[str, set[int]]:
    now = utcnow()
    existing: dict[tuple[str, str], tuple[int, str]] = {}
    for source in {j.source for j in jobs}:
        rows = session.execute(select(Job.id, Job.external_id, Job.content_hash).where(Job.source == source))
        for job_id, external_id, chash in rows:
            existing[(source, external_id)] = (job_id, chash)
    new_rows, changed, unchanged_ids = [], [], []
    for job in jobs:
        hit = existing.get((job.source, job.external_id))
        if hit is None:
            new_rows.append({**job.row(), "first_seen_at": now, "last_seen_at": now})
        elif hit[1] != job.content_hash:
            changed.append({"b_id": hit[0], **{k: getattr(job, k) for k in UPDATABLE}})
        else:
            unchanged_ids.append(hit[0])
    inserted = 0
    for start in range(0, len(new_rows), 500):
        chunk = new_rows[start:start + 500]
        stmt = insert(Job).values(chunk).on_conflict_do_nothing(index_elements=[Job.source, Job.external_id]).returning(Job.id)
        inserted += len(session.execute(stmt).scalars().all())
    if changed:
        stmt = (
            update(Job.__table__)
            .where(Job.__table__.c.id == bindparam("b_id"))
            .values(**{k: bindparam(k) for k in UPDATABLE}, embedding=None, dedup_group_id=None, is_canonical=True)
        )
        session.execute(stmt, changed)
    seen_ids_by_source: dict[str, set[int]] = {}
    ids_now = {(j.source, j.external_id) for j in jobs}
    rows = session.execute(select(Job.id, Job.source, Job.external_id).where(Job.source.in_({j.source for j in jobs})))
    for job_id, source, external_id in rows:
        if (source, external_id) in ids_now:
            seen_ids_by_source.setdefault(source, set()).add(job_id)
    all_seen = [i for ids in seen_ids_by_source.values() for i in ids]
    for start in range(0, len(all_seen), 5000):
        chunk = all_seen[start:start + 5000]
        session.execute(update(Job).where(Job.id.in_(chunk)).values(last_seen_at=now, missed_runs=0, closed_at=None))
    ctx.counts["inserted"] = inserted
    ctx.counts["updated"] = len(changed)
    ctx.counts["unchanged"] = len(unchanged_ids)
    return seen_ids_by_source


def close_missing(session: Session, results: list[FetchResult], seen: dict[str, set[int]], ctx: RunContext) -> None:
    threshold = get_settings().close_after_missed
    now = utcnow()
    missed_total, closed_total = 0, 0
    for result in results:
        query = select(Job.id).where(Job.source == result.source, Job.closed_at.is_(None))
        if result.source in ATS_NAMES:
            if not result.ok_company_ids:
                continue
            query = query.where(Job.company_id.in_(result.ok_company_ids))
        elif not result.complete or not result.jobs:
            continue
        seen_ids = seen.get(result.source, set())
        missing = [i for i in session.scalars(query) if i not in seen_ids]
        if not missing:
            continue
        missed_total += len(missing)
        session.execute(update(Job).where(Job.id.in_(missing)).values(missed_runs=Job.missed_runs + 1))
        closed = session.execute(
            update(Job).where(Job.id.in_(missing), Job.missed_runs >= threshold).values(closed_at=now).returning(Job.id)
        ).scalars().all()
        closed_total += len(closed)
    ctx.counts["missed"] = missed_total
    ctx.counts["closed"] = closed_total


def embed_missing(session: Session, ctx: RunContext) -> None:
    rows = session.execute(
        select(Job.id, Job.title, Job.company_name, Job.location, Job.description_md)
        .where(Job.embedding.is_(None), Job.closed_at.is_(None))
        .order_by(Job.id)
    ).all()
    embedder = get_embedder()
    done = 0
    for start in range(0, len(rows), EMBED_BATCH):
        chunk = rows[start:start + EMBED_BATCH]
        vectors = embedder.embed([job_text(r.title, r.company_name, r.location, r.description_md) for r in chunk])
        session.execute(
            update(Job.__table__).where(Job.__table__.c.id == bindparam("b_id")).values(embedding=bindparam("vec")),
            [{"b_id": r.id, "vec": v.tolist()} for r, v in zip(chunk, vectors)],
        )
        session.commit()
        done += len(chunk)
    ctx.counts["embedded"] = done


def dedup_open(session: Session, ctx: RunContext) -> None:
    rows = session.execute(
        select(Job.id, Job.company_name, Job.title, Job.location, Job.source, Job.embedding, Job.dedup_group_id, Job.is_canonical)
        .where(Job.closed_at.is_(None))
    ).all()
    items = [DedupItem(r.id, r.company_name, r.title, r.location, r.source, r.embedding) for r in rows]
    groups = find_groups(items)
    current = {r.id: (r.dedup_group_id, r.is_canonical) for r in rows}
    changes = [{"b_id": i, "gid": g, "canon": c} for i, (g, c) in groups.items() if current[i] != (g, c)]
    if changes:
        session.execute(
            update(Job.__table__).where(Job.__table__.c.id == bindparam("b_id")).values(dedup_group_id=bindparam("gid"), is_canonical=bindparam("canon")),
            changes,
        )
    ctx.counts["dedup_updates"] = len(changes)
    ctx.counts["duplicates"] = sum(1 for _, c in groups.values() if not c)
    ctx.counts["open_jobs"] = len(rows)


def spent_today(session: Session) -> float:
    start = utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    return float(session.scalar(select(func.coalesce(func.sum(Score.cost_usd), 0)).where(Score.created_at >= start)) or 0)


def select_candidates(session: Session, profile: Profile, ctx: RunContext) -> list[JobInput]:
    prefs = Preferences.from_dict(profile.preferences)
    tiers = dict(session.execute(select(Company.id, Company.tier)).all())
    rows = session.execute(
        select(Job).where(Job.closed_at.is_(None), Job.is_canonical.is_(True), Job.embedding.is_not(None))
    ).scalars().all()
    kept = []
    rejected: dict[str, int] = {}
    for job in rows:
        ok, reason = passes(FilterJob(job.title, job.company_name, job.location, job.remote, job.seniority, job.min_exp, job.posted_at), prefs)
        if ok:
            kept.append(job)
        else:
            rejected[reason] = rejected.get(reason, 0) + 1
    ctx.counts["filtered_in"] = len(kept)
    ctx.counts["filtered_out"] = rejected
    if not kept or profile.resume_embedding is None:
        return []
    matrix = np.asarray([np.asarray(j.embedding, dtype=np.float32) for j in kept])
    resume = np.asarray(profile.resume_embedding, dtype=np.float32)
    sims = matrix @ resume / (np.linalg.norm(matrix, axis=1) * np.linalg.norm(resume) + 1e-9)
    order = np.argsort(-sims)
    top_k = get_settings().prefilter_top_k
    chosen = set(order[:top_k].tolist())
    tier1 = [i for i in order.tolist() if tiers.get(kept[i].company_id) == 1 and i not in chosen][:top_k]
    chosen.update(tier1)
    candidates = [
        JobInput(
            id=kept[i].id, title=kept[i].title, company_name=kept[i].company_name, location=kept[i].location,
            remote=kept[i].remote, seniority=kept[i].seniority, min_exp=kept[i].min_exp, max_exp=kept[i].max_exp,
            description_md=kept[i].description_md, content_hash=kept[i].content_hash, embed_sim=float(sims[i]),
            tier=tiers.get(kept[i].company_id, 2),
        )
        for i in sorted(chosen, key=lambda i: -sims[i])
    ]
    ctx.counts["prefiltered"] = len(candidates)
    return candidates


def posted_map(session: Session, ids: list[int]) -> dict[int, datetime | None]:
    if not ids:
        return {}
    return dict(session.execute(select(Job.id, Job.posted_at).where(Job.id.in_(ids))).all())


async def score_candidates(
    session: Session, profile: Profile, candidates: list[JobInput], chain: ScorerChain, ctx: RunContext
) -> None:
    cached_keys = set(
        session.execute(
            select(Score.job_id, Score.content_hash).where(
                Score.profile_version == profile.version, Score.job_id.in_([c.id for c in candidates] or [0])
            )
        ).all()
    )
    todo = [c for c in candidates if (c.id, c.content_hash) not in cached_keys]
    ctx.counts["cached"] = len(candidates) - len(todo)
    weights = get_setting(session, "rank_weights", DEFAULT_WEIGHTS) or DEFAULT_WEIGHTS
    calibrator = Calibrator.from_json(get_setting(session, "calibration"))
    posted = posted_map(session, [c.id for c in todo])
    profile_input = ProfileInput(version=profile.version, resume_md=profile.resume_md, preferences=profile.preferences or {})
    semaphore = asyncio.Semaphore(SCORE_CONCURRENCY)
    rows: list[dict] = []
    failed = 0

    async def one(job: JobInput) -> None:
        nonlocal failed
        async with semaphore:
            try:
                result = await chain.score(job, profile_input)
            except Exception as exc:
                failed += 1
                ctx.errors.append(f"score {job.id}: {exc}"[:200])
                return
        out = result.output
        final = final_score(
            RankInput(out.fit_score, job.embed_sim, out.apply_prob, out.seniority_match, job.tier, posted.get(job.id)), weights
        )
        rows.append({
            "job_id": job.id, "profile_version": profile.version, "content_hash": job.content_hash, "model": result.model,
            "embed_sim": job.embed_sim, "fit_score": out.fit_score, "fit_prob": calibrator(final) if calibrator else final,
            "seniority": out.seniority, "seniority_match": out.seniority_match, "apply_prob": out.apply_prob,
            "final_score": final, "reasons": out.reasons, "missing_skills": out.missing_skills,
            "latency_ms": result.latency_ms, "cost_usd": result.cost_usd,
        })

    await asyncio.gather(*(one(c) for c in todo))
    if rows:
        session.execute(insert(Score).values(rows).on_conflict_do_nothing())
    ctx.cost_usd += chain.guard.spent_run
    ctx.counts["scored"] = len(rows)
    ctx.counts["score_failed"] = failed
    ctx.counts["llm_calls"] = chain.stats.llm_calls
    ctx.counts["scorer_calls"] = dict(chain.stats.calls)
    ctx.counts["scorer_failures"] = dict(chain.stats.failures)
    ctx.counts["budget_skips"] = chain.stats.skipped_budget
    ctx.errors.extend(chain.stats.errors[:20])


def top_unnotified(session: Session, profile_version: int, limit: int) -> list[tuple[Job, Score]]:
    best = (
        select(Score.job_id, func.max(Score.final_score).label("best"))
        .where(Score.profile_version == profile_version)
        .group_by(Score.job_id)
        .subquery()
    )
    rows = session.execute(
        select(Job, Score)
        .join(best, best.c.job_id == Job.id)
        .join(Score, (Score.job_id == Job.id) & (Score.final_score == best.c.best) & (Score.profile_version == profile_version))
        .where(Job.closed_at.is_(None), Job.is_canonical.is_(True), Job.notified_at.is_(None), best.c.best >= NOTIFY_MIN_SCORE)
        .order_by(best.c.best.desc())
        .limit(limit * 2)
    ).all()
    unique: dict[int, tuple[Job, Score]] = {}
    for job, score in rows:
        unique.setdefault(job.id, (job, score))
    return list(unique.values())[:limit]


async def notify_top(session: Session, profile: Profile, notifier: Notifier, ctx: RunContext) -> None:
    picks = top_unnotified(session, profile.version, get_settings().notify_top_n)
    digest = [
        Digest(job.id, job.title, job.company_name, job.location, job.url, score.final_score or 0, score.fit_score or 0, list(score.reasons or []))
        for job, score in picks
    ]
    sent = await notifier.send(digest)
    if picks and sent:
        session.execute(update(Job).where(Job.id.in_([j.id for j, _ in picks])).values(notified_at=utcnow()))
    ctx.counts["notified"] = sent
    ctx.counts["notifier"] = notifier.name


def fetch_counts(results: list[FetchResult], ctx: RunContext) -> None:
    ctx.counts["fetched"] = {r.source: len(r.jobs) for r in results}
    ctx.counts["fetched_total"] = sum(len(r.jobs) for r in results)
    for result in results:
        ctx.errors.extend(result.errors)


async def run_pipeline(
    database_url: str | None = None,
    sources: list[Source] | None = None,
    chain: ScorerChain | None = None,
    notifier: Notifier | None = None,
    http: HttpClient | None = None,
) -> dict[str, Any]:
    settings = get_settings()
    started = time.perf_counter()
    ctx = RunContext()
    with session_scope(database_url) as session:
        run = Run(status="running", counts={}, errors=[])
        session.add(run)
        session.flush()
        run_id = run.id
    status = "ok"
    own_http = http is None
    http = http or HttpClient()
    try:
        with session_scope(database_url) as session:
            companies = load_company_refs(session)
        sources = sources if sources is not None else all_sources(companies)
        stage = time.perf_counter()
        results = await fetch_all(sources, http)
        fetch_counts(results, ctx)
        ctx.counts["fetch_s"] = round(time.perf_counter() - stage, 1)
        jobs = normalize_all(results, ctx)
        with session_scope(database_url) as session:
            seen = upsert_jobs(session, jobs, ctx)
            close_missing(session, results, seen, ctx)
            now = utcnow()
            ok_ids = {cid for r in results for cid in r.ok_company_ids}
            if ok_ids:
                session.execute(update(Company).where(Company.id.in_(ok_ids)).values(last_fetched_at=now))
        stage = time.perf_counter()
        with session_scope(database_url) as session:
            embed_missing(session, ctx)
        ctx.counts["embed_s"] = round(time.perf_counter() - stage, 1)
        stage = time.perf_counter()
        with session_scope(database_url) as session:
            dedup_open(session, ctx)
        ctx.counts["dedup_s"] = round(time.perf_counter() - stage, 1)
        with session_scope(database_url) as session:
            profile = latest_profile(session)
            if profile is None:
                ctx.errors.append("no profile: run `scout profile set` to enable scoring")
                status = "partial"
            else:
                ctx.counts["profile_version"] = profile.version
                candidates = select_candidates(session, profile, ctx)
                guard = CostGuard(settings.max_daily_cost_usd, spent_today(session))
                chain = chain or ScorerChain.from_names(settings.scorer_chain.split(","), guard)
                ctx.counts["scorers"] = [s.name for s in chain.scorers]
                stage = time.perf_counter()
                await score_candidates(session, profile, candidates, chain, ctx)
                ctx.counts["score_s"] = round(time.perf_counter() - stage, 1)
        if profile is not None:
            with session_scope(database_url) as session:
                profile = latest_profile(session)
                assert profile is not None
                await notify_top(session, profile, notifier or get_notifier(http), ctx)
        if ctx.errors and status == "ok":
            status = "partial"
    except Exception as exc:
        logger.exception("run failed")
        ctx.errors.append(f"fatal: {type(exc).__name__}: {exc}"[:500])
        status = "failed"
    finally:
        if own_http:
            await http.__aexit__(None, None, None)
        ctx.counts["duration_s"] = round(time.perf_counter() - started, 1)
        with session_scope(database_url) as session:
            run = session.get(Run, run_id)
            assert run is not None
            run.finished_at = utcnow()
            run.status = status
            run.counts = ctx.counts
            run.errors = ctx.errors[:200]
            run.cost_usd = round(ctx.cost_usd, 6)
    return {"run_id": run_id, "status": status, "counts": ctx.counts, "errors": ctx.errors, "cost_usd": ctx.cost_usd}
