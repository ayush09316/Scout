import logging
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from statistics import median
from typing import Any

import numpy as np
from sqlalchemy import delete, func, select, text
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from scout.db.models import CompanyStat, Job, Profile, SalaryEstimate, Score, SkillGap
from scout.filters import FilterJob, Preferences, passes
from scout.normalize.text import normalize_company
from scout.salary.parse import inr_band
from scout.scoring.heuristic import extract_skills, extract_skills_fast, heuristic_fit, heuristic_raw

logger = logging.getLogger(__name__)

MATCH_MIN_SCORE = 0.4
MAYBE_THRESHOLD = 0.4
WEEKS = 12
TOP_SKILLS = 12
TOP_GAPS = 40
SKILL_TEXT_CHARS = 8000

OPEN_EVENTS = text(
    "SELECT j.company_name, e.at FROM job_events e JOIN jobs j ON j.id = e.job_id "
    "WHERE e.kind IN ('opened', 'reopened') AND j.is_canonical AND e.at >= :since "
    "UNION ALL SELECT j.company_name, j.first_seen_at FROM jobs j WHERE j.is_canonical AND j.first_seen_at >= :since "
    "AND j.first_seen_at > COALESCE((SELECT MIN(r.finished_at) FROM runs r WHERE r.status = 'ok'), '-infinity') "
    "AND NOT EXISTS (SELECT 1 FROM job_events e WHERE e.job_id = j.id AND e.kind = 'opened')"
)
CLOSE_EVENTS = text(
    "SELECT j.company_name, e.at FROM job_events e JOIN jobs j ON j.id = e.job_id "
    "WHERE e.kind = 'closed' AND j.is_canonical AND e.at >= :since "
    "UNION ALL SELECT j.company_name, j.closed_at FROM jobs j WHERE j.is_canonical AND j.closed_at >= :since "
    "AND NOT EXISTS (SELECT 1 FROM job_events e WHERE e.job_id = j.id AND e.kind = 'closed')"
)


def company_key(name: str) -> str:
    return normalize_company(name) or name.strip().lower()


def week_start(at: datetime) -> str:
    day = at.astimezone(timezone.utc).date()
    return (day - timedelta(days=day.weekday())).isoformat()


def best_scores(session: Session, profile_version: int | None) -> dict[int, float]:
    if profile_version is None:
        return {}
    rows = session.execute(
        select(Score.job_id, func.max(Score.final_score)).where(Score.profile_version == profile_version).group_by(Score.job_id)
    )
    return {job_id: float(best or 0) for job_id, best in rows}


@dataclass
class CompanyAgg:
    name: str
    company_ids: Counter
    open_jobs: int = 0
    remote: int = 0
    skills: Counter = None
    locations: Counter = None
    seniority: Counter = None
    salaries: list = None
    matches: int = 0

    def __post_init__(self) -> None:
        self.skills, self.locations, self.seniority, self.salaries = Counter(), Counter(), Counter(), []


def compute_company_stats(session: Session, profile_version: int | None, now: datetime | None = None) -> dict[str, int]:
    now = now or datetime.now(timezone.utc)
    weeks = [week_start(now - timedelta(weeks=i)) for i in range(WEEKS - 1, -1, -1)]
    since = datetime.fromisoformat(weeks[0]).replace(tzinfo=timezone.utc)
    cutoff_30 = now - timedelta(days=30)
    scores = best_scores(session, profile_version)
    estimates = dict(session.execute(
        select(SalaryEstimate.job_id, (SalaryEstimate.low + SalaryEstimate.high) / 2)
    ).all())
    aggs: dict[str, CompanyAgg] = {}
    rows = session.execute(
        select(Job.id, Job.company_id, Job.company_name, Job.title, Job.location, Job.remote, Job.seniority,
               Job.salary_min, Job.salary_max, Job.salary_currency, func.left(Job.description_md, SKILL_TEXT_CHARS).label("desc"))
        .where(Job.closed_at.is_(None), Job.is_canonical.is_(True))
    )
    for r in rows:
        key = company_key(r.company_name)
        agg = aggs.get(key)
        if agg is None:
            agg = aggs[key] = CompanyAgg(r.company_name, Counter())
        if r.company_id:
            agg.company_ids[r.company_id] += 1
        agg.open_jobs += 1
        agg.remote += 1 if r.remote else 0
        agg.skills.update(extract_skills_fast(f"{r.title}\n{r.desc or ''}"))
        if r.location:
            agg.locations[r.location] += 1
        agg.seniority[r.seniority or "mid"] += 1
        band = inr_band(r.salary_min, r.salary_max, r.salary_currency)
        if band:
            agg.salaries.append((band[0] + band[1]) / 2)
        elif r.id in estimates:
            agg.salaries.append(float(estimates[r.id]))
        if scores.get(r.id, 0) >= MATCH_MIN_SCORE:
            agg.matches += 1
    opened: dict[str, Counter] = defaultdict(Counter)
    closed: dict[str, Counter] = defaultdict(Counter)
    opened_30: Counter = Counter()
    closed_30: Counter = Counter()
    names: dict[str, str] = {}
    for query, weekly, recent in ((OPEN_EVENTS, opened, opened_30), (CLOSE_EVENTS, closed, closed_30)):
        for name, at in session.execute(query, {"since": since}):
            key = company_key(name)
            names.setdefault(key, name)
            weekly[key][week_start(at)] += 1
            if at >= cutoff_30:
                recent[key] += 1
    payload = []
    for key in set(aggs) | set(opened) | set(closed):
        agg = aggs.get(key) or CompanyAgg(names[key], Counter())
        payload.append({
            "company_key": key,
            "company_id": agg.company_ids.most_common(1)[0][0] if agg.company_ids else None,
            "company_name": agg.name,
            "open_jobs": agg.open_jobs,
            "opened_30d": opened_30[key],
            "closed_30d": closed_30[key],
            "velocity_series": [{"week": w, "opened": opened[key][w], "closed": closed[key][w]} for w in weeks],
            "top_skills": [{"skill": s, "count": c} for s, c in agg.skills.most_common(TOP_SKILLS)],
            "locations": [{"location": loc, "count": c} for loc, c in agg.locations.most_common(5)],
            "remote_share": round(agg.remote / agg.open_jobs, 3) if agg.open_jobs else 0.0,
            "seniority_mix": dict(agg.seniority),
            "median_salary_inr": int(median(agg.salaries)) if agg.salaries else None,
            "matches": agg.matches,
            "updated_at": now,
        })
    session.execute(delete(CompanyStat))
    for start in range(0, len(payload), 1000):
        session.execute(insert(CompanyStat).values(payload[start:start + 1000]))
    return {"rows": len(payload), "with_open_jobs": sum(1 for p in payload if p["open_jobs"]), "with_matches": sum(1 for p in payload if p["matches"])}


@dataclass
class GapJob:
    id: int
    skills: set[str]
    embed_sim: float
    seniority: str | None
    min_exp: int | None
    filtered_in: bool


def gap_universe(session: Session, profile: Profile) -> list[GapJob]:
    prefs = Preferences.from_dict(profile.preferences)
    resume = np.asarray(profile.resume_embedding, dtype=np.float32) if profile.resume_embedding is not None else None
    rows = session.execute(
        select(Job.id, Job.title, Job.company_name, Job.location, Job.remote, Job.seniority, Job.min_exp, Job.posted_at,
               Job.embedding, func.left(Job.description_md, SKILL_TEXT_CHARS).label("desc"))
        .where(Job.closed_at.is_(None), Job.is_canonical.is_(True))
    )
    out = []
    for r in rows:
        ok, reason = passes(FilterJob(r.title, r.company_name, r.location, r.remote, r.seniority, r.min_exp, r.posted_at, r.desc or ""), prefs)
        if not ok and reason not in ("location", "stale", "seniority", "experience"):
            continue
        sim = 0.0
        if resume is not None and r.embedding is not None:
            vec = np.asarray(r.embedding, dtype=np.float32)
            sim = float(vec @ resume / (np.linalg.norm(vec) * np.linalg.norm(resume) + 1e-9))
        out.append(GapJob(r.id, extract_skills_fast(f"{r.title}\n{r.desc or ''}"), sim, r.seniority, r.min_exp, ok))
    return out


def fit_of(job: GapJob, candidate: set[str], years: float) -> float:
    raw, *_ = heuristic_raw(job.skills, candidate, job.embed_sim, job.seniority, job.min_exp, years)
    return heuristic_fit(raw) / 10


def compute_skill_gaps(jobs: list[GapJob], candidate: set[str], years: float, top: int = TOP_GAPS) -> list[dict[str, Any]]:
    stats: dict[str, dict[str, Any]] = {}
    for job in jobs:
        missing = job.skills - candidate
        if not missing:
            continue
        base = fit_of(job, candidate, years)
        for skill in missing:
            after = fit_of(job, candidate | {skill}, years)
            entry = stats.setdefault(skill, {"mentioning": 0, "unlocked": 0, "gain": 0.0, "examples": []})
            entry["mentioning"] += 1
            entry["gain"] += after - base
            if base < MAYBE_THRESHOLD <= after:
                entry["unlocked"] += 1
            entry["examples"].append((job.filtered_in, after - base, after, job.id))
    ranked = sorted(stats.items(), key=lambda kv: (-kv[1]["unlocked"], -kv[1]["mentioning"], kv[0]))[:top]
    return [
        {
            "skill": skill,
            "jobs_mentioning": s["mentioning"],
            "jobs_unlocked": s["unlocked"],
            "avg_fit_gain": round(s["gain"] / s["mentioning"], 4),
            "example_job_ids": [e[3] for e in sorted(s["examples"], key=lambda e: (not e[0], -e[1], -e[2]))[:5]],
        }
        for skill, s in ranked
    ]


def profile_skills(profile: Profile) -> set[str]:
    listed = {s.lower() for s in (profile.preferences or {}).get("skills", [])}
    return extract_skills(profile.resume_md) | listed


def refresh_skill_gaps(session: Session, profile: Profile) -> dict[str, int]:
    years = float((profile.preferences or {}).get("years_experience", 3))
    jobs = gap_universe(session, profile)
    rows = compute_skill_gaps(jobs, profile_skills(profile), years)
    session.execute(delete(SkillGap).where(SkillGap.profile_version == profile.version))
    if rows:
        session.execute(insert(SkillGap).values([{**r, "profile_version": profile.version} for r in rows]))
    return {"universe": len(jobs), "filtered_in": sum(1 for j in jobs if j.filtered_in), "skills": len(rows)}
