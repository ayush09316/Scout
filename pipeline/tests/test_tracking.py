import copy

import httpx
from sqlalchemy import func, select

from scout.db.models import Job, JobEvent, JobVersion
from scout.db.session import session_scope
from scout.scoring import CostGuard, HeuristicScorer, ScorerChain
from scout.sources.ats import GREENHOUSE_URL, LEVER_URL
from scout.tracking import backfill_versions
from tests.conftest import load_fixture
from tests.test_pipeline import routes, run_once, setup_db  # noqa: F401


def chain():
    return ScorerChain([HeuristicScorer()], CostGuard(1.0))


def events(url, external_id=None):
    with session_scope(url) as session:
        query = select(JobEvent.kind, JobEvent.detail).join(Job, Job.id == JobEvent.job_id).order_by(JobEvent.id)
        if external_id:
            query = query.where(Job.external_id == external_id)
        return [(k, d) for k, d in session.execute(query)]


def test_opened_changed_salary_closed_reopened(db, routes):  # noqa: F811
    companies = setup_db(db)
    first = run_once(db, companies, chain)
    assert first["counts"]["tracking"]["opened"] == 7
    assert first["counts"]["tracking"]["versions"] == 7
    assert [k for k, _ in events(db)].count("opened") == 7

    second = run_once(db, companies, chain)
    assert second["counts"]["tracking"].get("opened", 0) == 0
    assert len(events(db)) == 7

    edited = load_fixture("greenhouse.json")
    target = copy.deepcopy(edited["jobs"][0])
    edited["jobs"][0]["content"] = target["content"] + "<p>Salary: ₹25-35 LPA. Extra paragraph.</p>"
    edited["jobs"][0]["title"] = target["title"] + " II"
    routes.get(GREENHOUSE_URL.format(slug="acme")).mock(return_value=httpx.Response(200, json=edited))
    third = run_once(db, companies, chain)
    assert third["counts"]["tracking"]["changed"] == 1
    assert third["counts"]["tracking"]["salary_changed"] == 1
    ext = f"acme:{target['id']}"
    kinds = events(db, ext)
    changed = next(d for k, d in kinds if k == "changed")
    assert set(changed["fields"]) >= {"title", "description", "salary"}
    assert changed["description_delta"] > 0
    assert changed["title"]["new"].endswith(" II")
    salary = next(d for k, d in kinds if k == "salary_changed")
    assert salary == {"old": {"min": None, "max": None}, "new": {"min": 2500000, "max": 3500000}}
    with session_scope(db) as session:
        job_id = session.scalar(select(Job.id).where(Job.external_id == ext))
        assert session.scalar(select(func.count()).select_from(JobVersion).where(JobVersion.job_id == job_id)) == 2

    trimmed = copy.deepcopy(edited)
    trimmed["jobs"] = trimmed["jobs"][:2]
    routes.get(GREENHOUSE_URL.format(slug="acme")).mock(return_value=httpx.Response(200, json=trimmed))
    routes.get(LEVER_URL.format(slug="beta")).mock(return_value=httpx.Response(503))
    for _ in range(3):
        run_once(db, companies, chain)
    assert [k for k, _ in events(db, "acme:103")] == ["opened", "closed"]

    routes.get(GREENHOUSE_URL.format(slug="acme")).mock(return_value=httpx.Response(200, json=edited))
    back = run_once(db, companies, chain)
    assert back["counts"]["tracking"]["reopened"] == 1
    assert [k for k, _ in events(db, "acme:103")] == ["opened", "closed", "reopened"]
    with session_scope(db) as session:
        job = session.scalar(select(Job).where(Job.external_id == "acme:103"))
        assert job.closed_at is None and job.missed_runs == 0


def test_backfill_versions_skips_events(db, routes):  # noqa: F811
    companies = setup_db(db)
    run_once(db, companies, chain)
    with session_scope(db) as session:
        session.execute(JobVersion.__table__.delete())
        session.execute(JobEvent.__table__.delete())
    with session_scope(db) as session:
        assert backfill_versions(session) == 7
    with session_scope(db) as session:
        assert backfill_versions(session) == 0
        assert session.scalar(select(func.count()).select_from(JobEvent)) == 0
