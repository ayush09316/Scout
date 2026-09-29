from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Protocol

from scout.http import HttpClient


@dataclass
class CompanyRef:
    id: int | None
    name: str
    ats: str
    slug: str
    tier: int = 2


@dataclass
class RawJob:
    source: str
    external_id: str
    company_name: str
    title: str
    url: str
    location: str | None = None
    description: str = ""
    posted_at: datetime | None = None
    remote: bool | None = None
    company_id: int | None = None
    salary_min: int | None = None
    salary_max: int | None = None
    salary_currency: str | None = None
    tags: list[str] = field(default_factory=list)


@dataclass
class FetchResult:
    source: str
    jobs: list[RawJob] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
    ok_company_ids: set[int] = field(default_factory=set)
    complete: bool = True


class Source(Protocol):
    name: str

    async def fetch(self, http: HttpClient) -> FetchResult: ...


def from_epoch(value: float | int | None, millis: bool = False) -> datetime | None:
    if value is None:
        return None
    try:
        seconds = float(value) / (1000 if millis else 1)
        return datetime.fromtimestamp(seconds, tz=timezone.utc)
    except (TypeError, ValueError, OverflowError):
        return None


def from_iso(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None
    return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
