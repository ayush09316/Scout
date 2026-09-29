import asyncio
import html
import logging
from collections.abc import Awaitable, Callable

from scout.http import HttpClient
from scout.sources.base import CompanyRef, FetchResult, RawJob, from_epoch, from_iso

logger = logging.getLogger(__name__)

GREENHOUSE_URL = "https://boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=true"
LEVER_URL = "https://api.lever.co/v0/postings/{slug}?mode=json"
ASHBY_URL = "https://api.ashbyhq.com/posting-api/job-board/{slug}?includeCompensation=true"


def parse_greenhouse(company: CompanyRef, data: dict) -> list[RawJob]:
    jobs = []
    for item in data.get("jobs", []):
        jobs.append(
            RawJob(
                source="greenhouse",
                external_id=f"{company.slug}:{item['id']}",
                company_name=company.name,
                company_id=company.id,
                title=item.get("title", "").strip(),
                url=item.get("absolute_url", ""),
                location=(item.get("location") or {}).get("name"),
                description=html.unescape(item.get("content") or ""),
                posted_at=from_iso(item.get("first_published") or item.get("updated_at")),
            )
        )
    return jobs


def parse_lever(company: CompanyRef, data: list) -> list[RawJob]:
    jobs = []
    for item in data:
        categories = item.get("categories") or {}
        parts = [item.get("description") or ""]
        for block in item.get("lists") or []:
            parts.append(f"<h3>{block.get('text', '')}</h3><ul>{block.get('content', '')}</ul>")
        parts.append(item.get("additional") or "")
        salary = item.get("salaryRange") or {}
        workplace = item.get("workplaceType")
        jobs.append(
            RawJob(
                source="lever",
                external_id=f"{company.slug}:{item['id']}",
                company_name=company.name,
                company_id=company.id,
                title=(item.get("text") or "").strip(),
                url=item.get("hostedUrl", ""),
                location=categories.get("location") or ", ".join(categories.get("allLocations") or []) or None,
                description="".join(parts),
                posted_at=from_epoch(item.get("createdAt"), millis=True),
                remote=True if workplace == "remote" else None,
                salary_min=salary.get("min"),
                salary_max=salary.get("max"),
                salary_currency=salary.get("currency"),
            )
        )
    return jobs


def parse_ashby(company: CompanyRef, data: dict) -> list[RawJob]:
    jobs = []
    for item in data.get("jobs", []):
        if item.get("isListed") is False:
            continue
        locations = [item.get("location") or ""] + [
            (loc.get("location") or "") for loc in item.get("secondaryLocations") or []
        ]
        jobs.append(
            RawJob(
                source="ashby",
                external_id=f"{company.slug}:{item['id']}",
                company_name=company.name,
                company_id=company.id,
                title=(item.get("title") or "").strip(),
                url=item.get("jobUrl") or item.get("applyUrl") or "",
                location=", ".join(loc for loc in locations if loc) or None,
                description=item.get("descriptionHtml") or item.get("descriptionPlain") or "",
                posted_at=from_iso(item.get("publishedAt")),
                remote=True if item.get("isRemote") or item.get("workplaceType") == "Remote" else None,
            )
        )
    return jobs


PARSERS: dict[str, tuple[str, Callable]] = {
    "greenhouse": (GREENHOUSE_URL, parse_greenhouse),
    "lever": (LEVER_URL, parse_lever),
    "ashby": (ASHBY_URL, parse_ashby),
}


async def probe_company(http: HttpClient, ats: str, slug: str) -> tuple[bool, int]:
    template, parser = PARSERS[ats]
    try:
        response = await http.get(template.format(slug=slug))
    except Exception:
        return False, 0
    if response.status_code != 200:
        return False, 0
    try:
        return True, len(parser(CompanyRef(None, slug, ats, slug), response.json()))
    except Exception:
        return False, 0


class AtsSource:
    def __init__(self, ats: str, companies: list[CompanyRef]) -> None:
        self.name = ats
        self.companies = [c for c in companies if c.ats == ats]
        self.template, self.parser = PARSERS[ats]

    async def _one(self, http: HttpClient, company: CompanyRef, result: FetchResult) -> None:
        try:
            data = await http.get_json(self.template.format(slug=company.slug))
            result.jobs.extend(self.parser(company, data))
            if company.id is not None:
                result.ok_company_ids.add(company.id)
        except Exception as exc:
            logger.warning("%s/%s failed: %s", self.name, company.slug, exc)
            result.errors.append(f"{self.name}/{company.slug}: {type(exc).__name__}: {exc}"[:300])
            result.complete = False

    async def fetch(self, http: HttpClient) -> FetchResult:
        result = FetchResult(source=self.name)
        await asyncio.gather(*(self._one(http, c, result) for c in self.companies))
        return result


def ats_sources(companies: list[CompanyRef]) -> list[AtsSource]:
    return [AtsSource(ats, companies) for ats in PARSERS if any(c.ats == ats for c in companies)]


Fetcher = Callable[[HttpClient], Awaitable[FetchResult]]
