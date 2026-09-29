import logging
import re

from scout.config import get_settings
from scout.http import HttpClient
from scout.sources.base import FetchResult, RawJob, from_epoch, from_iso

logger = logging.getLogger(__name__)

REMOTIVE_URL = "https://remotive.com/api/remote-jobs?category=software-dev"
REMOTEOK_URL = "https://remoteok.com/api"
ARBEITNOW_URL = "https://www.arbeitnow.com/api/job-board-api"
ADZUNA_URL = "https://api.adzuna.com/v1/api/jobs/in/search/{page}"
HN_SEARCH_URL = "https://hn.algolia.com/api/v1/search_by_date?tags=story,author_whoishiring&hitsPerPage=10"
HN_ITEM_URL = "https://hn.algolia.com/api/v1/items/{id}"


def parse_remotive(data: dict) -> list[RawJob]:
    return [
        RawJob(
            source="remotive",
            external_id=str(item["id"]),
            company_name=item.get("company_name") or "Unknown",
            title=(item.get("title") or "").strip(),
            url=item.get("url", ""),
            location=item.get("candidate_required_location") or "Remote",
            description=item.get("description") or "",
            posted_at=from_iso(item.get("publication_date")),
            remote=True,
            tags=item.get("tags") or [],
        )
        for item in data.get("jobs", [])
    ]


def parse_remoteok(data: list) -> list[RawJob]:
    jobs = []
    for item in data:
        if not isinstance(item, dict) or "id" not in item or "position" not in item:
            continue
        jobs.append(
            RawJob(
                source="remoteok",
                external_id=str(item["id"]),
                company_name=item.get("company") or "Unknown",
                title=(item.get("position") or "").strip(),
                url=item.get("url") or f"https://remoteok.com/remote-jobs/{item['id']}",
                location=item.get("location") or "Remote",
                description=item.get("description") or "",
                posted_at=from_epoch(item.get("epoch")) or from_iso(item.get("date")),
                remote=True,
                salary_min=item.get("salary_min") or None,
                salary_max=item.get("salary_max") or None,
                salary_currency="USD" if item.get("salary_min") else None,
                tags=item.get("tags") or [],
            )
        )
    return jobs


def parse_arbeitnow(data: dict) -> list[RawJob]:
    return [
        RawJob(
            source="arbeitnow",
            external_id=item["slug"],
            company_name=item.get("company_name") or "Unknown",
            title=(item.get("title") or "").strip(),
            url=item.get("url", ""),
            location=item.get("location"),
            description=item.get("description") or "",
            posted_at=from_epoch(item.get("created_at")),
            remote=bool(item.get("remote")) or None,
            tags=item.get("tags") or [],
        )
        for item in data.get("data", [])
    ]


def parse_adzuna(data: dict) -> list[RawJob]:
    jobs = []
    for item in data.get("results", []):
        jobs.append(
            RawJob(
                source="adzuna",
                external_id=str(item["id"]),
                company_name=(item.get("company") or {}).get("display_name") or "Unknown",
                title=(item.get("title") or "").strip(),
                url=item.get("redirect_url", ""),
                location=(item.get("location") or {}).get("display_name"),
                description=item.get("description") or "",
                posted_at=from_iso(item.get("created")),
                salary_min=int(item["salary_min"]) if item.get("salary_min") else None,
                salary_max=int(item["salary_max"]) if item.get("salary_max") else None,
                salary_currency="INR" if item.get("salary_min") else None,
            )
        )
    return jobs


HN_TAG = re.compile(r"<[^>]+>")


def parse_hn_comment(item: dict) -> RawJob | None:
    text = item.get("text") or ""
    if not text or item.get("author") in (None, "whoishiring"):
        return None
    first_block = re.split(r"<p>", text, maxsplit=1)[0]
    header = HN_TAG.sub("", first_block).replace("&#x2F;", "/").replace("&amp;", "&").replace("&#x27;", "'")
    parts = [p.strip() for p in header.split("|") if p.strip()]
    if len(parts) < 2:
        return None
    company = parts[0][:120]
    title = next(
        (p for p in parts[1:] if re.search(r"engineer|developer|sde|scientist|architect|lead|devops|sre|backend|frontend|full", p, re.I)),
        parts[1],
    )[:200]
    location = next(
        (p for p in parts[1:] if re.search(r"remote|onsite|on-site|hybrid|india|bangalore|bengaluru|[A-Z][a-z]+, [A-Z]{2}", p, re.I) and p != title),
        None,
    )
    remote = bool(re.search(r"\bremote\b", header, re.I))
    return RawJob(
        source="hn",
        external_id=str(item["id"]),
        company_name=company,
        title=title,
        url=f"https://news.ycombinator.com/item?id={item['id']}",
        location=location,
        description=text,
        posted_at=from_epoch(item.get("created_at_i")) or from_iso(item.get("created_at")),
        remote=remote or None,
    )


def latest_hn_thread(data: dict) -> int | None:
    for hit in data.get("hits", []):
        if (hit.get("title") or "").lower().startswith("ask hn: who is hiring"):
            return int(hit["objectID"])
    return None


class SimpleSource:
    name = ""

    async def fetch(self, http: HttpClient) -> FetchResult:
        result = FetchResult(source=self.name)
        try:
            result.jobs = await self.collect(http)
        except Exception as exc:
            logger.warning("source %s failed: %s", self.name, exc)
            result.errors.append(f"{self.name}: {type(exc).__name__}: {exc}"[:300])
            result.complete = False
        return result

    async def collect(self, http: HttpClient) -> list[RawJob]:
        raise NotImplementedError


class RemotiveSource(SimpleSource):
    name = "remotive"

    async def collect(self, http: HttpClient) -> list[RawJob]:
        return parse_remotive(await http.get_json(REMOTIVE_URL))


class RemoteOkSource(SimpleSource):
    name = "remoteok"

    async def collect(self, http: HttpClient) -> list[RawJob]:
        return parse_remoteok(await http.get_json(REMOTEOK_URL))


class ArbeitnowSource(SimpleSource):
    name = "arbeitnow"
    max_pages = 5

    async def collect(self, http: HttpClient) -> list[RawJob]:
        jobs: list[RawJob] = []
        url: str | None = ARBEITNOW_URL
        for _ in range(self.max_pages):
            if not url:
                break
            data = await http.get_json(url)
            jobs.extend(parse_arbeitnow(data))
            url = (data.get("links") or {}).get("next")
        return jobs


class AdzunaSource(SimpleSource):
    name = "adzuna"
    pages = 4

    def __init__(self, app_id: str, app_key: str, what: str = "software engineer") -> None:
        self.app_id, self.app_key, self.what = app_id, app_key, what

    async def collect(self, http: HttpClient) -> list[RawJob]:
        jobs: list[RawJob] = []
        for page in range(1, self.pages + 1):
            params = {"app_id": self.app_id, "app_key": self.app_key, "what": self.what, "results_per_page": 50}
            data = await http.get_json(ADZUNA_URL.format(page=page), params=params)
            batch = parse_adzuna(data)
            jobs.extend(batch)
            if len(batch) < 50:
                break
        return jobs


class HackerNewsSource(SimpleSource):
    name = "hn"

    async def collect(self, http: HttpClient) -> list[RawJob]:
        thread_id = latest_hn_thread(await http.get_json(HN_SEARCH_URL))
        if thread_id is None:
            raise RuntimeError("no who-is-hiring thread found")
        thread = await http.get_json(HN_ITEM_URL.format(id=thread_id))
        jobs = []
        for child in thread.get("children") or []:
            job = parse_hn_comment(child)
            if job:
                jobs.append(job)
        return jobs


def board_sources() -> list[SimpleSource]:
    settings = get_settings()
    sources: list[SimpleSource] = [RemotiveSource(), RemoteOkSource(), ArbeitnowSource(), HackerNewsSource()]
    if settings.adzuna_app_id and settings.adzuna_app_key:
        sources.append(AdzunaSource(settings.adzuna_app_id, settings.adzuna_app_key))
    return sources
