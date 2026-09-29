import logging
import math
import re
from dataclasses import dataclass
from typing import Any

import numpy as np
from sqlalchemy import bindparam, delete, select, update
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from scout.db.models import Company, Job, SalaryEstimate, Score
from scout.normalize.location import INDIAN_CITIES, canonical_cities
from scout.salary.parse import inr_band, parse_salary_text, to_inr

logger = logging.getLogger(__name__)

MIN_GROUP = 5
MIN_TOTAL = 20
COMPARABLES_MODEL = "comparables-v1"
PRIOR_MODEL = "prior-v1"
LEVEL_KEYS = [
    ("market", "family", "seniority", "city", "tier"), ("market", "family", "seniority", "city"),
    ("market", "family", "seniority"), ("market", "family"),
]
INDIA_BUCKETS = set(INDIAN_CITIES) | {"remote-india", "india-other"}

FAMILY_RULES: list[tuple[str, re.Pattern[str]]] = [
    ("ml", re.compile(r"\b(machine learning|ml|ai|llm|deep learning|nlp|computer vision|data scien\w*|mlops|applied scientist)\b", re.I)),
    ("data", re.compile(r"\b(data|analytics|etl|bi|warehouse)\b", re.I)),
    ("devops", re.compile(r"\b(devops|sre|site reliability|reliability|cloud|infrastructure|infra)\b", re.I)),
    ("platform", re.compile(r"\b(platform|distributed systems|systems)\b", re.I)),
    ("security", re.compile(r"\b(security|appsec|secops)\b", re.I)),
    ("mobile", re.compile(r"\b(android|ios|mobile|flutter|react native)\b", re.I)),
    ("fullstack", re.compile(r"\b(full[- ]?stack)\b", re.I)),
    ("frontend", re.compile(r"\b(front[- ]?end|ui engineer|web developer|react)\b", re.I)),
    ("backend", re.compile(r"\b(back[- ]?end|server|api|python|java|golang|go|django|node)\b", re.I)),
    ("qa", re.compile(r"\b(qa|sdet|test|quality)\b", re.I)),
    ("embedded", re.compile(r"\b(embedded|firmware|hardware)\b", re.I)),
    ("software", re.compile(r"\b(software|engineer|developer|sde|swe|programmer)\b", re.I)),
]

PRIOR_LPA = {
    "intern": (3, 7), "junior": (6, 12), "mid": (12, 24), "senior": (22, 40), "lead": (30, 55),
    "staff": (40, 70), "principal": (55, 95), "executive": (60, 120),
}
FAMILY_MULT = {
    "ml": 1.2, "platform": 1.05, "backend": 1.0, "data": 1.0, "security": 1.0, "software": 1.0, "devops": 0.95,
    "fullstack": 0.95, "frontend": 0.9, "mobile": 0.9, "embedded": 0.85, "qa": 0.7, "other": 0.75,
}
CITY_MULT = {"Bengaluru": 1.0, "remote-india": 1.0, "Gurugram": 0.97, "Delhi NCR": 0.95, "Hyderabad": 0.95, "Mumbai": 0.95,
             "Pune": 0.9, "Chennai": 0.88, "remote-global": 1.6, "abroad": 2.5}


def title_family(title: str) -> str:
    for family, pattern in FAMILY_RULES:
        if pattern.search(title):
            return family
    return "other"


def city_bucket(location: str | None, remote: bool) -> str:
    cities = canonical_cities(location or "")
    indian = [c for c in cities if c in INDIAN_CITIES]
    if indian:
        return indian[0]
    lowered = (location or "").lower()
    if "india" in lowered:
        return "remote-india" if remote else "india-other"
    if cities:
        return "abroad"
    return "remote-global" if remote else "unknown"


@dataclass
class Features:
    family: str
    seniority: str
    city: str
    tier: int

    @property
    def market(self) -> str:
        return "india" if self.city in INDIA_BUCKETS else "global"

    def key(self, fields: tuple[str, ...]) -> tuple:
        return tuple(getattr(self, f) for f in fields)

    def as_dict(self, fields: tuple[str, ...] | None = None) -> dict[str, Any]:
        return {f: getattr(self, f) for f in (fields or ("market", "family", "seniority", "city", "tier"))}


def features_for(title: str, seniority: str | None, location: str | None, remote: bool, tier: int | None) -> Features:
    return Features(title_family(title), seniority or "mid", city_bucket(location, remote), tier or 2)


@dataclass
class Estimate:
    low: int
    high: int
    confidence: float
    n: int
    basis: dict[str, Any]
    model: str


class ComparablesModel:
    def __init__(self, comparables: list[tuple[int, Features, float]]) -> None:
        self.total = len(comparables)
        self.groups: list[dict[tuple, list[tuple[int, float]]]] = []
        for fields in LEVEL_KEYS:
            index: dict[tuple, list[tuple[int, float]]] = {}
            for job_id, feats, mid in comparables:
                index.setdefault(feats.key(fields), []).append((job_id, mid))
            self.groups.append(index)

    def estimate(self, feats: Features) -> Estimate:
        if self.total >= MIN_TOTAL:
            for depth, fields in enumerate(LEVEL_KEYS):
                members = self.groups[depth].get(feats.key(fields), [])
                if len(members) >= MIN_GROUP:
                    return self._from_group(members, depth, fields, feats)
        return prior_estimate(feats)

    @staticmethod
    def _from_group(members: list[tuple[int, float]], depth: int, fields: tuple[str, ...], feats: Features) -> Estimate:
        values = np.asarray([m for _, m in members], dtype=np.float64)
        p25, median, p75 = (float(np.percentile(values, q)) for q in (25, 50, 75))
        if p75 - p25 < 0.1 * median:
            p25, p75 = median * 0.9, median * 1.1
        spread = (p75 - p25) / median if median else 1.0
        n = len(members)
        confidence = (1 - 1 / math.sqrt(n)) * max(0.2, 1 - spread / 2) * (1 - 0.12 * depth)
        confidence = round(max(0.05, min(0.9, confidence)), 3)
        basis = {
            "group": feats.as_dict(fields),
            "level": depth,
            "keys": list(fields),
            "n": n,
            "p25": round(p25), "median": round(median), "p75": round(p75),
            "comparable_ids": [i for i, _ in members[:10]],
        }
        return Estimate(round(p25), round(p75), confidence, n, basis, COMPARABLES_MODEL)


def prior_estimate(feats: Features) -> Estimate:
    low_lpa, high_lpa = PRIOR_LPA.get(feats.seniority, PRIOR_LPA["mid"])
    mult = FAMILY_MULT.get(feats.family, FAMILY_MULT["other"]) * CITY_MULT.get(feats.city, 0.85)
    low, high = low_lpa * mult * 100_000, high_lpa * mult * 100_000
    confidence = 0.3 if feats.family not in ("other",) and feats.city != "unknown" else 0.2
    basis = {
        "group": feats.as_dict(), "level": None, "keys": ["family", "seniority", "city"], "n": 0,
        "lpa": [round(low / 100_000, 1), round(high / 100_000, 1)], "multiplier": round(mult, 3),
    }
    return Estimate(round(low), round(high), confidence, 0, basis, PRIOR_MODEL)


SALARY_HINT = r"(\$|₹|\minr\M|\musd\M|\mrs\.|lpa|lakh|\mlacs?\M|crore|\mcr\M)"


def extract_description_salaries(session: Session, only_open: bool = True) -> int:
    query = select(Job.id, Job.description_md).where(
        Job.salary_min.is_(None), Job.salary_max.is_(None), Job.description_md.op("~*")(SALARY_HINT)
    )
    if only_open:
        query = query.where(Job.closed_at.is_(None))
    updates = []
    for job_id, description in session.execute(query):
        found = parse_salary_text(description)
        if found:
            updates.append({"b_id": job_id, "smin": found[0], "smax": found[1], "cur": found[2]})
    if updates:
        table = Job.__table__
        session.execute(
            update(table).where(table.c.id == bindparam("b_id")).values(
                salary_min=bindparam("smin"), salary_max=bindparam("smax"), salary_currency=bindparam("cur")
            ),
            updates,
        )
    return len(updates)


def load_comparables(session: Session, tiers: dict[int, int]) -> list[tuple[int, Features, float]]:
    rows = session.execute(
        select(Job.id, Job.title, Job.seniority, Job.location, Job.remote, Job.company_id, Job.salary_min, Job.salary_max, Job.salary_currency)
        .where((Job.salary_min.is_not(None)) | (Job.salary_max.is_not(None)), Job.is_canonical.is_(True))
    ).all()
    out = []
    for r in rows:
        band = inr_band(r.salary_min, r.salary_max, r.salary_currency)
        if band is None:
            continue
        out.append((r.id, features_for(r.title, r.seniority, r.location, r.remote, tiers.get(r.company_id)), (band[0] + band[1]) / 2))
    return out


def target_ids(session: Session, profile_version: int | None, filtered_ids: set[int] | None) -> set[int]:
    ids = set(filtered_ids or ())
    if profile_version is not None:
        ids |= set(session.scalars(select(Score.job_id).where(Score.profile_version == profile_version).distinct()))
    tier1 = select(Company.id).where(Company.tier == 1)
    ids |= set(session.scalars(select(Job.id).where(Job.company_id.in_(tier1), Job.closed_at.is_(None), Job.is_canonical.is_(True))))
    return ids


def estimate_salaries(
    session: Session, profile_version: int | None = None, filtered_ids: set[int] | None = None, all_jobs: bool = False
) -> dict[str, int]:
    extracted = extract_description_salaries(session)
    session.flush()
    tiers = dict(session.execute(select(Company.id, Company.tier)).all())
    model = ComparablesModel(load_comparables(session, tiers))
    query = select(Job.id, Job.title, Job.seniority, Job.location, Job.remote, Job.company_id).where(
        Job.closed_at.is_(None), Job.is_canonical.is_(True), Job.salary_min.is_(None), Job.salary_max.is_(None)
    )
    rows = session.execute(query).all()
    if not all_jobs:
        wanted = target_ids(session, profile_version, filtered_ids)
        rows = [r for r in rows if r.id in wanted]
    session.execute(delete(SalaryEstimate).where(SalaryEstimate.job_id.in_(
        select(Job.id).where((Job.salary_min.is_not(None)) | (Job.salary_max.is_not(None)))
    )))
    payload = []
    counts = {"extracted": extracted, "comparables_total": model.total, COMPARABLES_MODEL: 0, PRIOR_MODEL: 0}
    for r in rows:
        feats = features_for(r.title, r.seniority, r.location, r.remote, tiers.get(r.company_id))
        est = model.estimate(feats)
        counts[est.model] += 1
        payload.append({
            "job_id": r.id, "low": est.low, "high": est.high, "currency": "INR", "confidence": est.confidence,
            "n_comparables": est.n, "basis": est.basis, "model": est.model,
        })
    for start in range(0, len(payload), 1000):
        stmt = insert(SalaryEstimate).values(payload[start:start + 1000])
        stmt = stmt.on_conflict_do_update(
            index_elements=[SalaryEstimate.job_id],
            set_={c: stmt.excluded[c] for c in ("low", "high", "currency", "confidence", "n_comparables", "basis", "model", "created_at")},
        )
        session.execute(stmt)
    counts["estimated"] = len(payload)
    return counts


__all__ = [
    "ComparablesModel", "Estimate", "Features", "city_bucket", "estimate_salaries", "features_for", "inr_band",
    "parse_salary_text", "prior_estimate", "title_family", "to_inr",
]
