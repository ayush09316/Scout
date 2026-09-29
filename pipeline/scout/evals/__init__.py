import asyncio
import logging
from dataclasses import dataclass
from typing import Any

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from scout.db.models import Company, EvalReport, Feedback, Job, Label, Profile, Score
from scout.db.session import get_setting
from scout.embed import cosine
from scout.evals.metrics import expected_calibration_error, p50, reliability_bins, precision_at_k, rank_labels, recall_at_k
from scout.rank import DEFAULT_WEIGHTS, Calibrator, RankInput, final_score
from scout.scoring import REGISTRY, JobInput, ProfileInput, Scorer

logger = logging.getLogger(__name__)

POSITIVE_FEEDBACK = {"up", "applied", "interview", "offer", "saved"}
NEGATIVE_FEEDBACK = {"down", "rejected"}
GATE_DROP = 0.05


@dataclass
class LabeledJob:
    job: Job
    label: int
    tier: int


def labeled_jobs(session: Session, split: str | None) -> list[LabeledJob]:
    tiers = dict(session.execute(select(Company.id, Company.tier)).all())
    query = select(Job, Label).join(Label, Label.job_id == Job.id)
    if split:
        query = query.where(Label.split == split)
    rows = session.execute(query).all()
    out = [LabeledJob(job, 1 if label.label == "fit" else 0, tiers.get(job.company_id, 2)) for job, label in rows]
    if out:
        return out
    feedback = session.execute(select(Feedback.job_id, Feedback.action).order_by(Feedback.at)).all()
    latest: dict[int, str] = {}
    for job_id, action in feedback:
        if action in POSITIVE_FEEDBACK | NEGATIVE_FEEDBACK:
            latest[job_id] = action
    if not latest:
        return []
    jobs = session.scalars(select(Job).where(Job.id.in_(list(latest)))).all()
    return [LabeledJob(j, 1 if latest[j.id] in POSITIVE_FEEDBACK else 0, tiers.get(j.company_id, 2)) for j in jobs]


def to_input(item: LabeledJob, profile: Profile) -> JobInput:
    job = item.job
    return JobInput(
        id=job.id, title=job.title, company_name=job.company_name, location=job.location, remote=job.remote,
        seniority=job.seniority, min_exp=job.min_exp, max_exp=job.max_exp, description_md=job.description_md,
        content_hash=job.content_hash, embed_sim=cosine(job.embedding, profile.resume_embedding), tier=item.tier,
    )


async def evaluate_scorer(session: Session, scorer: Scorer, items: list[LabeledJob], profile: Profile) -> dict[str, Any]:
    weights = get_setting(session, "rank_weights", DEFAULT_WEIGHTS) or DEFAULT_WEIGHTS
    calibrator = Calibrator.from_json(get_setting(session, "calibration"))
    profile_input = ProfileInput(profile.version, profile.resume_md, profile.preferences or {})
    cached = {
        s.job_id: s
        for s in session.scalars(
            select(Score).where(
                Score.profile_version == profile.version, Score.model == scorer.model, Score.job_id.in_([i.job.id for i in items])
            )
        )
    }
    finals, probs, labels, latencies, costs = [], [], [], [], []
    semaphore = asyncio.Semaphore(4)
    fresh: list[dict] = []
    errors = 0

    async def one(item: LabeledJob) -> None:
        nonlocal errors
        job_input = to_input(item, profile)
        hit = cached.get(item.job.id)
        if hit is not None and hit.content_hash == item.job.content_hash:
            fit, apply_prob, match, latency, cost = hit.fit_score or 0, hit.apply_prob or 0, bool(hit.seniority_match), hit.latency_ms or 0, float(hit.cost_usd)
        else:
            async with semaphore:
                try:
                    result = await scorer.score(job_input, profile_input)
                except Exception as exc:
                    errors += 1
                    logger.warning("eval %s failed on %s: %s", scorer.name, item.job.id, exc)
                    return
            out = result.output
            fit, apply_prob, match, latency, cost = out.fit_score, out.apply_prob, out.seniority_match, result.latency_ms, result.cost_usd
        final_value = final_score(RankInput(fit, job_input.embed_sim, apply_prob, match, item.tier, item.job.posted_at), weights)
        if hit is None or hit.content_hash != item.job.content_hash:
            fresh.append({
                "job_id": item.job.id, "profile_version": profile.version, "content_hash": item.job.content_hash,
                "model": result.model, "embed_sim": job_input.embed_sim, "fit_score": fit,
                "fit_prob": calibrator(final_value) if calibrator else final_value, "seniority": out.seniority,
                "seniority_match": match, "apply_prob": apply_prob, "final_score": final_value, "reasons": out.reasons,
                "missing_skills": out.missing_skills, "latency_ms": latency, "cost_usd": cost,
            })
        finals.append(final_value)
        probs.append(calibrator(final_value) if calibrator else final_value)
        labels.append(item.label)
        latencies.append(latency)
        costs.append(cost)

    await asyncio.gather(*(one(i) for i in items))
    if fresh:
        session.execute(insert(Score).values(fresh).on_conflict_do_nothing())
    ranked = rank_labels(finals, labels)
    return {
        "model": scorer.model,
        "n": len(labels),
        "errors": errors,
        "p_at_10": round(precision_at_k(ranked, 10), 4),
        "recall_at_50": round(recall_at_k(ranked, 50), 4),
        "ece": round(expected_calibration_error(probs, labels), 4),
        "p50_latency_ms": round(p50(latencies), 1),
        "cost_per_1k_usd": round(sum(costs) / len(costs) * 1000, 4) if costs else 0.0,
        "calibration": reliability_bins(probs, labels),
    }


async def run_eval(session: Session, scorer_names: list[str], split: str | None) -> dict[str, Any] | None:
    profile = session.scalar(select(Profile).order_by(Profile.version.desc()).limit(1))
    if profile is None:
        return None
    items = [i for i in labeled_jobs(session, split) if i.job.embedding is not None]
    if not items and split:
        items = [i for i in labeled_jobs(session, None) if i.job.embedding is not None]
    if not items:
        return None
    scorers = [REGISTRY[n]() for n in scorer_names if n in REGISTRY]
    scorers = [s for s in scorers if s.available()]
    results = {}
    for scorer in scorers:
        results[scorer.name] = await evaluate_scorer(session, scorer, items, profile)
    report = {
        "profile_version": profile.version,
        "split": split or "all",
        "n": len(items),
        "positives": sum(i.label for i in items),
        "primary": scorers[0].name if scorers else None,
        "scorers": results,
        "calibration": results[scorers[0].name]["calibration"] if scorers else [],
    }
    return report


def previous_report(session: Session) -> dict[str, Any] | None:
    row = session.scalar(select(EvalReport).order_by(EvalReport.created_at.desc(), EvalReport.id.desc()).limit(1))
    return row.report if row else None


def gate_check(current: dict[str, Any], previous: dict[str, Any] | None) -> tuple[bool, str]:
    if not previous:
        return True, "no previous report"
    failures = []
    for name, metrics in current.get("scorers", {}).items():
        before = (previous.get("scorers") or {}).get(name)
        if not before:
            continue
        drop = before["p_at_10"] - metrics["p_at_10"]
        if drop > GATE_DROP + 1e-9:
            failures.append(f"{name}: P@10 {before['p_at_10']:.2f} -> {metrics['p_at_10']:.2f}")
    if failures:
        return False, "; ".join(failures)
    return True, "within tolerance"
