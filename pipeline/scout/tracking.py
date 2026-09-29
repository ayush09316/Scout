import logging
from dataclasses import dataclass
from typing import Any

from sqlalchemy import select, text
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from scout.db.models import Job, JobEvent, JobVersion

logger = logging.getLogger(__name__)

TRACKED_FIELDS = ("title", "location", "salary_min", "salary_max", "description_md")

VERSION_FROM_JOBS = text(
    "INSERT INTO job_versions (job_id, content_hash, title, location, salary_min, salary_max, description_md) "
    "SELECT id, content_hash, title, location, salary_min, salary_max, description_md FROM jobs WHERE id = ANY(:ids) "
    "ON CONFLICT (job_id, content_hash) DO NOTHING RETURNING job_id"
)


@dataclass
class Snapshot:
    title: str
    location: str | None
    salary_min: int | None
    salary_max: int | None
    description_md: str


def snapshot_rows(session: Session, ids: list[int]) -> dict[int, Snapshot]:
    out: dict[int, Snapshot] = {}
    for start in range(0, len(ids), 5000):
        chunk = ids[start:start + 5000]
        rows = session.execute(
            select(Job.id, Job.title, Job.location, Job.salary_min, Job.salary_max, Job.description_md).where(Job.id.in_(chunk))
        )
        for r in rows:
            out[r.id] = Snapshot(r.title, r.location, r.salary_min, r.salary_max, r.description_md or "")
    return out


def capture_versions(session: Session, ids: list[int]) -> int:
    created = 0
    for start in range(0, len(ids), 5000):
        created += len(session.execute(VERSION_FROM_JOBS, {"ids": ids[start:start + 5000]}).all())
    return created


def add_events(session: Session, rows: list[dict[str, Any]]) -> int:
    for start in range(0, len(rows), 1000):
        session.execute(insert(JobEvent).values(rows[start:start + 1000]))
    return len(rows)


def diff_detail(old: Snapshot, new: Snapshot) -> dict[str, Any]:
    fields = [f for f in ("title", "location", "description_md") if getattr(old, f) != getattr(new, f)]
    detail: dict[str, Any] = {"fields": ["description" if f == "description_md" else f for f in fields]}
    if (old.salary_min, old.salary_max) != (new.salary_min, new.salary_max):
        detail["fields"].append("salary")
    if "title" in fields:
        detail["title"] = {"old": old.title, "new": new.title}
    if "location" in fields:
        detail["location"] = {"old": old.location, "new": new.location}
    detail["description_delta"] = len(new.description_md) - len(old.description_md)
    return detail


def salary_changed(old: Snapshot, new: Snapshot) -> bool:
    return (old.salary_min, old.salary_max) != (new.salary_min, new.salary_max)


def record_opened(session: Session, ids: list[int]) -> dict[str, int]:
    if not ids:
        return {"versions": 0, "opened": 0}
    versions = capture_versions(session, ids)
    opened = add_events(session, [{"job_id": i, "kind": "opened", "detail": {}} for i in ids])
    return {"versions": versions, "opened": opened}


def record_changes(session: Session, old: dict[int, Snapshot], new: dict[int, Snapshot]) -> dict[str, int]:
    events: list[dict[str, Any]] = []
    salary = 0
    for job_id, before in old.items():
        after = new.get(job_id)
        if after is None:
            continue
        events.append({"job_id": job_id, "kind": "changed", "detail": diff_detail(before, after)})
        if salary_changed(before, after):
            salary += 1
            events.append({"job_id": job_id, "kind": "salary_changed", "detail": {
                "old": {"min": before.salary_min, "max": before.salary_max},
                "new": {"min": after.salary_min, "max": after.salary_max},
            }})
    versions = capture_versions(session, list(old))
    add_events(session, events)
    return {"versions": versions, "changed": len(old), "salary_changed": salary}


def record_simple(session: Session, ids: list[int], kind: str, detail: dict | None = None) -> int:
    return add_events(session, [{"job_id": i, "kind": kind, "detail": detail or {}} for i in ids])


def backfill_versions(session: Session) -> int:
    ids = list(session.scalars(
        select(Job.id).where(~select(JobVersion.id).where(JobVersion.job_id == Job.id).exists()).order_by(Job.id)
    ))
    return capture_versions(session, ids)

