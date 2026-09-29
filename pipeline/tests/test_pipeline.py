import asyncio

import httpx
import pytest
import respx
from sqlalchemy import func, select

from scout.companies import CompanyEntry, sync_companies
from scout.db.models import Company, Job, Run, Score
from scout.db.session import session_scope
from scout.http import HttpClient
from scout.notify import ConsoleNotifier
from scout.pipeline import run_pipeline
from scout.profile import create_profile
from scout.scoring import CostGuard, HeuristicScorer, JevScorer, ScorerChain
from scout.scoring.llm import JEV_URL
from scout.sources.ats import GREENHOUSE_URL, LEVER_URL, AtsSource
from scout.sources.base import CompanyRef
from scout.sources.boards import REMOTIVE_URL, RemotiveSource
from tests.conftest import load_fixture
from tests.test_scoring import JEV_OK

PREFS = {
    "years_experience": 3, "locations": ["Bengaluru"], "remote_ok": True,
    "exclude_title_keywords": ["manager", "frontend"], "skills": ["python", "django"],
}


def setup_db(url: str) -> list[CompanyRef]:
    with session_scope(url) as session:
        sync_companies(session, [CompanyEntry("Acme", "greenhouse", "acme", 1), CompanyEntry("Beta", "lever", "beta", 2)])
        create_profile(session, "Backend engineer. Python, Django, PostgreSQL, Celery, Redis. 3 years.", PREFS)
        return [CompanyRef(c.id, c.name, c.ats, c.slug, c.tier) for c in session.scalars(select(Company))]


def sources(companies):
    return [AtsSource("greenhouse", companies), AtsSource("lever", companies), RemotiveSource()]


def run_once(url, companies, chain_factory):
    return asyncio.run(
        run_pipeline(url, sources=sources(companies), chain=chain_factory(), notifier=ConsoleNotifier(), http=HttpClient(base_delay=0.001))
    )


@pytest.fixture()
def routes():
    with respx.mock(assert_all_called=False) as mock:
        mock.get(GREENHOUSE_URL.format(slug="acme")).mock(return_value=httpx.Response(200, json=load_fixture("greenhouse.json")))
        mock.get(LEVER_URL.format(slug="beta")).mock(return_value=httpx.Response(200, json=load_fixture("lever.json")))
        mock.get(REMOTIVE_URL).mock(return_value=httpx.Response(200, json=load_fixture("remotive.json")))
        mock.post(JEV_URL).mock(return_value=httpx.Response(200, json=JEV_OK))
        yield mock


def test_idempotent_double_run(db, routes, monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "or-test")
    companies = setup_db(db)
    chain_factory = lambda: ScorerChain([JevScorer(HttpClient(max_retries=0)), HeuristicScorer()], CostGuard(1.0))  # noqa: E731
    first = run_once(db, companies, chain_factory)
    assert first["status"] == "ok", first["errors"]
    counts = first["counts"]
    assert counts["fetched"] == {"greenhouse": 3, "lever": 2, "remotive": 2}
    assert counts["inserted"] == 7
    assert counts["scored"] > 0
    assert counts["llm_calls"] == counts["scored"]
    jev_calls = routes.routes[-1].call_count
    assert jev_calls == counts["llm_calls"]

    second = run_once(db, companies, chain_factory)
    assert second["counts"]["inserted"] == 0
    assert second["counts"]["updated"] == 0
    assert second["counts"]["scored"] == 0
    assert second["counts"]["llm_calls"] == 0
    assert routes.routes[-1].call_count == jev_calls
    with session_scope(db) as session:
        assert session.scalar(select(func.count()).select_from(Job)) == 7
        assert session.scalar(select(func.count()).select_from(Run)) == 2
        run = session.scalar(select(Run).order_by(Run.id.desc()).limit(1))
        assert run.status == "ok" and run.finished_at is not None
        score = session.scalar(select(Score).limit(1))
        assert score.model == "typesafe/jev-1.13" and score.final_score is not None


def test_filters_exclude_ineligible(db, routes):
    companies = setup_db(db)
    result = run_once(db, companies, lambda: ScorerChain([HeuristicScorer()], CostGuard(1.0)))
    with session_scope(db) as session:
        titles = set(session.scalars(select(Job.title).join(Score, Score.job_id == Job.id)))
    assert "Engineering Manager" not in titles
    assert "Senior Frontend Engineer" not in titles
    assert "Go Engineer" not in titles
    assert "Backend Engineer" in titles
    assert result["counts"]["notified"] >= 0


def test_closing_after_three_missed_runs(db, routes):
    companies = setup_db(db)
    chain_factory = lambda: ScorerChain([HeuristicScorer()], CostGuard(1.0))  # noqa: E731
    run_once(db, companies, chain_factory)
    trimmed = load_fixture("greenhouse.json")
    trimmed["jobs"] = trimmed["jobs"][:2]
    routes.get(GREENHOUSE_URL.format(slug="acme")).mock(return_value=httpx.Response(200, json=trimmed))
    routes.get(LEVER_URL.format(slug="beta")).mock(return_value=httpx.Response(503))
    for expected_missed in (1, 2, 3):
        run_once(db, companies, chain_factory)
        with session_scope(db) as session:
            gone = session.scalar(select(Job).where(Job.external_id == "acme:103"))
            lever_job = session.scalar(select(Job).where(Job.source == "lever").limit(1))
            assert gone.missed_runs == expected_missed
            assert (gone.closed_at is not None) is (expected_missed >= 3)
            assert lever_job.missed_runs == 0 and lever_job.closed_at is None
    routes.get(GREENHOUSE_URL.format(slug="acme")).mock(return_value=httpx.Response(200, json=load_fixture("greenhouse.json")))
    run_once(db, companies, chain_factory)
    with session_scope(db) as session:
        back = session.scalar(select(Job).where(Job.external_id == "acme:103"))
        assert back.closed_at is None and back.missed_runs == 0


def test_run_without_profile_is_partial(db, routes):
    with session_scope(db) as session:
        sync_companies(session, [CompanyEntry("Acme", "greenhouse", "acme", 1)])
        companies = [CompanyRef(c.id, c.name, c.ats, c.slug, c.tier) for c in session.scalars(select(Company))]
    result = run_once(db, companies, lambda: ScorerChain([HeuristicScorer()], CostGuard(1.0)))
    assert result["status"] == "partial"
    assert result["counts"]["inserted"] == 5


def test_dedup_across_sources(db):
    dup = {"jobs": [{"id": 1, "title": "Python Backend Developer", "absolute_url": "https://x/1", "location": {"name": "Worldwide (Remote)"}, "content": "&lt;p&gt;Django, FastAPI. 3+ years.&lt;/p&gt;"}]}
    with respx.mock(assert_all_called=False) as mock:
        mock.get(GREENHOUSE_URL.format(slug="delta-labs")).mock(return_value=httpx.Response(200, json=dup))
        mock.get(REMOTIVE_URL).mock(return_value=httpx.Response(200, json=load_fixture("remotive.json")))
        with session_scope(db) as session:
            sync_companies(session, [CompanyEntry("Delta Labs", "greenhouse", "delta-labs", 2)])
            companies = [CompanyRef(c.id, c.name, c.ats, c.slug, c.tier) for c in session.scalars(select(Company))]
        result = asyncio.run(run_pipeline(db, sources=[AtsSource("greenhouse", companies), RemotiveSource()], chain=ScorerChain([HeuristicScorer()], CostGuard(1.0)), notifier=ConsoleNotifier(), http=HttpClient(base_delay=0.001)))
    assert result["counts"]["duplicates"] == 1
    with session_scope(db) as session:
        rows = session.execute(select(Job.source, Job.dedup_group_id, Job.is_canonical).where(Job.title == "Python Backend Developer")).all()
    assert len({r.dedup_group_id for r in rows}) == 1
    assert {r.source: r.is_canonical for r in rows} == {"greenhouse": True, "remotive": False}
