import re
from datetime import datetime, timedelta, timezone
from dataclasses import dataclass, field
from typing import Any

from scout.normalize.location import INDIAN_CITIES, canonical_cities

DEFAULT_REMOTE_REGIONS = ["india", "apac", "asia", "anywhere", "worldwide", "global"]
FOREIGN = [
    "us", "u.s.", "u.s", "usa", "united states", "america", "north america", "northern america", "latam", "latin america",
    "canada", "uk", "united kingdom", "europe", "eu", "emea", "germany", "france", "spain", "netherlands", "poland",
    "portugal", "ireland", "brazil", "mexico", "argentina", "australia", "new zealand", "singapore", "japan", "philippines",
    "est", "pst", "cet", "gmt", "san francisco", "new york", "london", "berlin", "toronto", "seattle", "austin",
]
INDIA_HINTS = ["india", "indian", "ist", "utc+5:30", "gmt+5:30", "asia/kolkata"]


@dataclass
class Preferences:
    years_experience: float = 3
    locations: list[str] = field(default_factory=lambda: ["Bengaluru"])
    remote_ok: bool = True
    remote_regions: list[str] = field(default_factory=lambda: list(DEFAULT_REMOTE_REGIONS))
    include_title_keywords: list[str] = field(default_factory=lambda: ["engineer", "developer", "sde", "backend", "programmer"])
    exclude_title_keywords: list[str] = field(default_factory=list)
    seniority: list[str] = field(default_factory=lambda: ["junior", "mid", "senior"])
    exclude_companies: list[str] = field(default_factory=list)
    skills: list[str] = field(default_factory=list)
    target_titles: list[str] = field(default_factory=list)
    max_age_days: int | None = 45

    @classmethod
    def from_dict(cls, data: dict[str, Any] | None) -> "Preferences":
        data = data or {}
        known = {k: v for k, v in data.items() if k in cls.__dataclass_fields__}
        return cls(**known)


@dataclass
class FilterJob:
    title: str
    company_name: str
    location: str | None
    remote: bool
    seniority: str | None
    min_exp: int | None
    posted_at: datetime | None = None
    description: str = ""


def _has_word(text: str, word: str) -> bool:
    return re.search(r"(?<![a-z0-9])" + re.escape(word.lower()) + r"(?![a-z0-9])", text) is not None


def _mentions(text: str, words: list[str]) -> bool:
    return any(_has_word(text, w) for w in words)


def location_ok(job: FilterJob, prefs: Preferences) -> bool:
    location = job.location or ""
    lowered = location.lower()
    cities = canonical_cities(location)
    if cities and any(c in set(prefs.locations) for c in cities):
        return True
    if not (job.remote and prefs.remote_ok):
        return False
    if "remote-india" in lowered or any(c in INDIAN_CITIES for c in cities) or _has_word(lowered, "india"):
        return True
    if _mentions(lowered, FOREIGN):
        return False
    if any(_has_word(lowered, r) for r in prefs.remote_regions):
        return True
    if lowered.strip(" ,()-") in ("", "remote"):
        return _mentions(job.description.lower()[:4000], INDIA_HINTS)
    return False


def passes(job: FilterJob, prefs: Preferences) -> tuple[bool, str]:
    title = job.title.lower()
    if prefs.include_title_keywords and not any(_has_word(title, k) for k in prefs.include_title_keywords):
        return False, "title"
    if any(_has_word(title, k) for k in prefs.exclude_title_keywords):
        return False, "title_excluded"
    if any(c.lower() == job.company_name.lower() for c in prefs.exclude_companies):
        return False, "company"
    if prefs.seniority and job.seniority and job.seniority not in prefs.seniority:
        return False, "seniority"
    if job.min_exp is not None and job.min_exp > prefs.years_experience + 1:
        return False, "experience"
    if not location_ok(job, prefs):
        return False, "location"
    if prefs.max_age_days and job.posted_at is not None:
        posted = job.posted_at if job.posted_at.tzinfo else job.posted_at.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) - posted > timedelta(days=prefs.max_age_days):
            return False, "stale"
    return True, "ok"
