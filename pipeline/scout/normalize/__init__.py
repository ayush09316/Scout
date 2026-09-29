import hashlib
from dataclasses import dataclass
from datetime import datetime

from scout.normalize.experience import parse_experience, seniority_from_title
from scout.normalize.location import Location, canonicalize_location
from scout.normalize.text import html_to_md, normalize_company, normalize_title
from scout.sources.base import RawJob

MAX_DESCRIPTION = 20000


@dataclass
class NormJob:
    source: str
    external_id: str
    company_id: int | None
    company_name: str
    url: str
    title: str
    location: str | None
    remote: bool
    seniority: str
    min_exp: int | None
    max_exp: int | None
    salary_min: int | None
    salary_max: int | None
    salary_currency: str | None
    description_md: str
    posted_at: datetime | None
    content_hash: str

    def row(self) -> dict:
        return dict(self.__dict__)


def content_hash(company: str, title: str, location: str | None, description: str) -> str:
    payload = "\x1f".join([normalize_company(company), normalize_title(title), location or "", description.strip()])
    return hashlib.sha256(payload.encode()).hexdigest()[:32]


def normalize_job(raw: RawJob) -> NormJob:
    description = html_to_md(raw.description)[:MAX_DESCRIPTION]
    loc = canonicalize_location(raw.location, raw.remote, raw.title)
    min_exp, max_exp = parse_experience(f"{raw.title}\n{description}")
    return NormJob(
        source=raw.source,
        external_id=raw.external_id[:300],
        company_id=raw.company_id,
        company_name=raw.company_name.strip()[:200],
        url=raw.url,
        title=raw.title[:300],
        location=loc.display,
        remote=loc.remote,
        seniority=seniority_from_title(raw.title),
        min_exp=min_exp,
        max_exp=max_exp,
        salary_min=raw.salary_min,
        salary_max=raw.salary_max,
        salary_currency=raw.salary_currency,
        description_md=description,
        posted_at=raw.posted_at,
        content_hash=content_hash(raw.company_name, raw.title, loc.display, description),
    )


__all__ = [
    "Location", "NormJob", "canonicalize_location", "content_hash", "html_to_md", "normalize_company",
    "normalize_job", "normalize_title", "parse_experience", "seniority_from_title",
]
