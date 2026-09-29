import asyncio

import httpx
import respx

from scout.http import HttpClient
from scout.pipeline import fetch_all
from scout.sources.ats import ASHBY_URL, GREENHOUSE_URL, LEVER_URL, AtsSource
from scout.sources.base import CompanyRef
from scout.sources.boards import (
    ADZUNA_URL, ARBEITNOW_URL, HN_ITEM_URL, HN_SEARCH_URL, REMOTEOK_URL, REMOTIVE_URL,
    AdzunaSource, ArbeitnowSource, HackerNewsSource, RemoteOkSource, RemotiveSource,
)
from tests.conftest import load_fixture

ACME = CompanyRef(1, "Acme", "greenhouse", "acme", 1)
BETA = CompanyRef(2, "Beta", "lever", "beta", 2)
GAMMA = CompanyRef(3, "Gamma", "ashby", "gamma", 2)


def fast_http() -> HttpClient:
    return HttpClient(base_delay=0.001)


def run(coro):
    return asyncio.run(coro)


@respx.mock
def test_greenhouse():
    respx.get(GREENHOUSE_URL.format(slug="acme")).mock(return_value=httpx.Response(200, json=load_fixture("greenhouse.json")))
    result = run(AtsSource("greenhouse", [ACME]).fetch(fast_http()))
    assert len(result.jobs) == 3 and result.ok_company_ids == {1}
    job = result.jobs[0]
    assert job.external_id == "acme:101" and job.company_id == 1
    assert "<strong>Python</strong>" in job.description
    assert job.posted_at is not None


@respx.mock
def test_lever_and_ashby():
    respx.get(LEVER_URL.format(slug="beta")).mock(return_value=httpx.Response(200, json=load_fixture("lever.json")))
    respx.get(ASHBY_URL.format(slug="gamma")).mock(return_value=httpx.Response(200, json=load_fixture("ashby.json")))
    lever = run(AtsSource("lever", [BETA]).fetch(fast_http()))
    ashby = run(AtsSource("ashby", [GAMMA]).fetch(fast_http()))
    assert [j.title for j in lever.jobs] == ["SDE 2 - Backend", "Engineering Manager"]
    assert "Requirements" in lever.jobs[0].description
    assert lever.jobs[1].salary_min == 5000000
    assert len(ashby.jobs) == 1 and ashby.jobs[0].remote is True
    assert "Bengaluru" in ashby.jobs[0].location


@respx.mock
def test_boards():
    respx.get(REMOTIVE_URL).mock(return_value=httpx.Response(200, json=load_fixture("remotive.json")))
    respx.get(REMOTEOK_URL).mock(return_value=httpx.Response(200, json=load_fixture("remoteok.json")))
    respx.get(ARBEITNOW_URL).mock(return_value=httpx.Response(200, json=load_fixture("arbeitnow.json")))
    respx.get(url__startswith=ADZUNA_URL.format(page=1)).mock(return_value=httpx.Response(200, json=load_fixture("adzuna.json")))
    http = fast_http()
    assert len(run(RemotiveSource().fetch(http)).jobs) == 2
    remoteok = run(RemoteOkSource().fetch(http)).jobs
    assert len(remoteok) == 1 and remoteok[0].salary_min == 40000
    assert run(ArbeitnowSource().fetch(http)).jobs[0].location == "Berlin"
    adzuna = run(AdzunaSource("id", "key").fetch(http)).jobs
    assert adzuna[0].company_name == "Theta Tech"


@respx.mock
def test_hn_latest_thread():
    respx.get(HN_SEARCH_URL).mock(return_value=httpx.Response(200, json=load_fixture("hn_search.json")))
    respx.get(HN_ITEM_URL.format(id=45000000)).mock(return_value=httpx.Response(200, json=load_fixture("hn_item.json")))
    jobs = run(HackerNewsSource().fetch(fast_http())).jobs
    assert [j.company_name for j in jobs] == ["Iota AI", "Kappa"]
    assert jobs[0].title == "Senior Backend Engineer"
    assert jobs[0].remote is True
    assert jobs[1].location == "Bengaluru, Onsite"


@respx.mock
def test_retry_then_success():
    route = respx.get(REMOTIVE_URL).mock(side_effect=[httpx.Response(503), httpx.Response(429), httpx.Response(200, json=load_fixture("remotive.json"))])
    result = run(RemotiveSource().fetch(fast_http()))
    assert route.call_count == 3
    assert len(result.jobs) == 2 and result.complete


@respx.mock
def test_failing_source_does_not_fail_run():
    respx.get(REMOTIVE_URL).mock(return_value=httpx.Response(500))
    respx.get(REMOTEOK_URL).mock(side_effect=httpx.ConnectError("boom"))
    respx.get(ARBEITNOW_URL).mock(return_value=httpx.Response(200, json=load_fixture("arbeitnow.json")))
    respx.get(GREENHOUSE_URL.format(slug="acme")).mock(return_value=httpx.Response(404))
    results = run(fetch_all([RemotiveSource(), RemoteOkSource(), ArbeitnowSource(), AtsSource("greenhouse", [ACME])], fast_http()))
    by_name = {r.source: r for r in results}
    assert not by_name["remotive"].complete and by_name["remotive"].errors
    assert not by_name["remoteok"].complete
    assert by_name["arbeitnow"].complete and len(by_name["arbeitnow"].jobs) == 1
    assert by_name["greenhouse"].ok_company_ids == set()
