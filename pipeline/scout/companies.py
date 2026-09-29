import asyncio
from dataclasses import dataclass
from pathlib import Path

import yaml
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from scout.db.models import Company
from scout.http import HttpClient
from scout.sources.ats import PARSERS, probe_company


@dataclass
class CompanyEntry:
    name: str
    ats: str
    slug: str
    tier: int = 2


def load_companies_file(path: Path) -> list[CompanyEntry]:
    data = yaml.safe_load(path.read_text()) or {}
    entries = []
    for item in data.get("companies", []):
        if item.get("ats") not in PARSERS:
            continue
        entries.append(CompanyEntry(name=item["name"], ats=item["ats"], slug=str(item["slug"]), tier=int(item.get("tier", 2))))
    return entries


def sync_companies(session: Session, entries: list[CompanyEntry], deactivate_missing: bool = True) -> tuple[int, int]:
    keys = {(e.ats, e.slug) for e in entries}
    for entry in entries:
        stmt = insert(Company).values(name=entry.name, ats=entry.ats, slug=entry.slug, tier=entry.tier, active=True)
        stmt = stmt.on_conflict_do_update(
            index_elements=[Company.ats, Company.slug],
            set_={"name": entry.name, "tier": entry.tier, "active": True},
        )
        session.execute(stmt)
    deactivated = 0
    if deactivate_missing:
        for company in session.scalars(select(Company).where(Company.active.is_(True))):
            if (company.ats, company.slug) not in keys:
                company.active = False
                deactivated += 1
    return len(entries), deactivated


async def verify_companies(entries: list[CompanyEntry]) -> list[tuple[CompanyEntry, bool, int]]:
    async with HttpClient(max_retries=1) as http:
        results = await asyncio.gather(*(probe_company(http, e.ats, e.slug) for e in entries))
    return [(entry, ok, count) for entry, (ok, count) in zip(entries, results)]
