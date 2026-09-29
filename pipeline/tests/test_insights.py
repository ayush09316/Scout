import asyncio
import json
from datetime import datetime, timedelta, timezone

import httpx
import respx
from sqlalchemy import select, text

from scout.db.models import Company, CompanyStat, Feedback, Job, JobEvent, Reminder, SalaryEstimate, Score, SkillGap
from scout.db.session import session_scope
from scout.embed import embed_query, get_embedder, job_text
from scout.insights import GapJob, compute_company_stats, compute_skill_gaps, fit_of, refresh_skill_gaps, week_start
from scout.notify import TelegramNotifier
from scout.http import HttpClient
from scout.profile import create_profile
from scout.reminders import create_reminders, digest_lines, send_due_reminders
from scout.scoring.heuristic import heuristic_output
from scout.scoring.types import JobInput, ProfileInput
from scout.search import hybrid_search, rrf

NOW = datetime(2026, 9, 29, 6, 0, tzinfo=timezone.utc)


def job(session, ext, title, company="Acme Inc", location="Bengaluru", remote=False, description="", closed=None, first_seen=NOW,
        salary=None, company_id=None, seniority="mid"):
    row = Job(
        source="greenhouse", external_id=ext, company_id=company_id, company_name=company, url=f"https://x/{ext}", title=title,
        location=location, remote=remote, seniority=seniority, description_md=description, content_hash=ext,
        first_seen_at=first_seen, last_seen_at=first_seen, closed_at=closed, posted_at=first_seen,
        salary_min=salary[0] if salary else None, salary_max=salary[1] if salary else None, salary_currency="INR" if salary else None,
        embedding=get_embedder().embed([job_text(title, company, location, description)])[0].tolist(),
    )
    session.add(row)
    session.flush()
    return row


def test_company_stats_aggregation(db):
    with session_scope(db) as session:
        company = Company(name="Acme", ats="greenhouse", slug="acme", tier=1)
        session.add(company)
        session.flush()
        a = job(session, "a", "Backend Engineer", description="Python, Django, Postgres", company_id=company.id, salary=(2_000_000, 3_000_000))
        b = job(session, "b", "Platform Engineer", location="Remote-India", remote=True, description="Python, Kubernetes, Go", company_id=company.id, seniority="senior")
        c = job(session, "c", "Data Engineer", description="Spark, Python", company_id=company.id, closed=NOW - timedelta(days=3), first_seen=NOW - timedelta(days=40))
        job(session, "d", "Engineer", company="Other Co", description="Rust")
        session.add(SalaryEstimate(job_id=b.id, low=3_000_000, high=5_000_000, confidence=0.5, model="comparables-v1"))
        session.add(Score(job_id=a.id, profile_version=1, content_hash="a", model="heuristic-v1", final_score=0.55))
        session.add(Score(job_id=b.id, profile_version=1, content_hash="b", model="heuristic-v1", final_score=0.2))
        session.add(JobEvent(job_id=c.id, kind="closed", at=NOW - timedelta(days=2)))
        session.add(JobEvent(job_id=a.id, kind="opened", at=NOW - timedelta(days=1)))
    with session_scope(db) as session:
        result = compute_company_stats(session, 1, now=NOW)
    assert result["rows"] == 2
    with session_scope(db) as session:
        acme = session.get(CompanyStat, "acme")
        assert acme.company_id is not None and acme.company_name == "Acme Inc"
        assert acme.open_jobs == 2
        assert acme.opened_30d == 2
        assert acme.closed_30d == 1
        assert acme.remote_share == 0.5
        assert acme.seniority_mix == {"mid": 1, "senior": 1}
        assert acme.median_salary_inr == 3_250_000
        assert acme.matches == 1
        assert acme.top_skills[0] == {"skill": "python", "count": 2}
        assert {"location": "Bengaluru", "count": 1} in acme.locations
        assert len(acme.velocity_series) == 12
        last = acme.velocity_series[-1]
        assert last["week"] == week_start(NOW) and last["opened"] == 2
        assert sum(w["closed"] for w in acme.velocity_series) == 1
        assert session.get(CompanyStat, "other") is not None


def test_fit_of_matches_heuristic_scorer():
    gap = GapJob(1, {"python", "django", "kafka"}, 0.8, "mid", 2, True)
    base = heuristic_output(
        JobInput(1, "Backend", "Acme", None, False, "mid", 2, None, "python django kafka", "h", 0.8),
        ProfileInput(1, "python django", {"years_experience": 3}),
    )
    assert abs(fit_of(gap, {"python", "django"}, 3) - base.fit_score / 10) < 1e-9


def test_skill_gap_math():
    jobs = [
        GapJob(1, {"python", "kafka"}, 0.55, "mid", None, True),
        GapJob(2, {"python", "kafka", "aws"}, 0.55, "mid", None, True),
        GapJob(3, {"python"}, 0.55, "mid", None, False),
        GapJob(4, {"rust", "kafka", "aws", "go"}, 0.55, "mid", None, False),
    ]
    rows = {r["skill"]: r for r in compute_skill_gaps(jobs, {"python"}, 3)}
    assert set(rows) == {"kafka", "aws", "rust", "go"}
    assert rows["kafka"]["jobs_mentioning"] == 3
    assert rows["kafka"]["jobs_unlocked"] == 1
    assert rows["aws"]["jobs_unlocked"] == 0
    assert abs(rows["kafka"]["avg_fit_gain"] - round((0.2 + 0.4 / 3 + 0.1) / 3, 4)) < 1e-3
    assert rows["kafka"]["example_job_ids"][0] == 1
    assert list(rows)[0] == "kafka"


def test_refresh_skill_gaps_replaces_rows(db):
    prefs = {"years_experience": 3, "locations": ["Bengaluru"], "skills": ["python"]}
    with session_scope(db) as session:
        profile = create_profile(session, "Python backend engineer", prefs)
        job(session, "a", "Backend Engineer", description="python kafka")
        job(session, "b", "Backend Engineer", location="London", description="python kafka aws")
        job(session, "c", "Product Manager", description="kafka")
        session.add(SkillGap(profile_version=profile.version, skill="stale", jobs_mentioning=1, jobs_unlocked=0))
    with session_scope(db) as session:
        result = refresh_skill_gaps(session, profile)
    assert result["universe"] == 2 and result["filtered_in"] == 1
    with session_scope(db) as session:
        skills = {g.skill: g for g in session.scalars(select(SkillGap))}
    assert "stale" not in skills
    assert skills["kafka"].jobs_mentioning == 2


def seed_feedback(url):
    with session_scope(url) as session:
        applied = job(session, "a", "Backend Engineer", company="Acme")
        fresh = job(session, "b", "Platform Engineer", company="Beta")
        later = job(session, "c", "Data Engineer", company="Gamma")
        interview = job(session, "d", "SRE", company="Delta")
        session.add_all([
            Feedback(job_id=applied.id, action="applied", at=NOW - timedelta(days=9)),
            Feedback(job_id=fresh.id, action="applied", at=NOW - timedelta(days=2)),
            Feedback(job_id=later.id, action="applied", at=NOW - timedelta(days=20)),
            Feedback(job_id=later.id, action="rejected", at=NOW - timedelta(days=5)),
            Feedback(job_id=interview.id, action="saved", at=NOW - timedelta(days=4)),
            Feedback(job_id=interview.id, action="interview", at=NOW - timedelta(days=1)),
        ])
        return applied.id, interview.id


def test_reminders_idempotent_and_sent(db):
    applied_id, interview_id = seed_feedback(db)
    with session_scope(db) as session:
        assert asyncio.run(create_reminders(session, now=NOW)) == {"created": 2}
    with session_scope(db) as session:
        assert asyncio.run(create_reminders(session, now=NOW)) == {"created": 0}
        assert asyncio.run(create_reminders(session, now=NOW + timedelta(days=1))) == {"created": 0}
        reminders = {r.kind: r for r in session.scalars(select(Reminder))}
    follow = reminders["follow_up"]
    assert follow.job_id == applied_id and "Acme" in follow.draft and "Backend Engineer" in follow.draft
    assert follow.due_at == (NOW - timedelta(days=2)).replace(hour=0)
    assert reminders["interview_prep"].job_id == interview_id

    with respx.mock() as mock:
        route = mock.post("https://api.telegram.org/bottok/sendMessage").mock(return_value=httpx.Response(200, json={"ok": True}))
        notifier = TelegramNotifier("tok", "42", HttpClient(base_delay=0.001))
        with session_scope(db) as session:
            assert asyncio.run(send_due_reminders(session, notifier, now=NOW)) == {"due": 2, "sent": 2}
        with session_scope(db) as session:
            assert asyncio.run(send_due_reminders(session, notifier, now=NOW)) == {"due": 0, "sent": 0}
        assert route.call_count == 2
        body = json.loads(route.calls[0].request.content)
        buttons = [b["callback_data"] for b in body["reply_markup"]["inline_keyboard"][0]]
        assert buttons == [f"rm:{follow.id}:done", f"rm:{follow.id}:snooze"]
    with session_scope(db) as session:
        assert all(r.sent_at is not None for r in session.scalars(select(Reminder)))


def test_digest_lines(db):
    applied_id, interview_id = seed_feedback(db)
    with session_scope(db) as session:
        session.add(JobEvent(job_id=applied_id, kind="closed", at=NOW))
        session.add(JobEvent(job_id=interview_id, kind="changed", at=NOW))
    with session_scope(db) as session:
        assert digest_lines(session, NOW - timedelta(hours=1)) == ["📉 1 jobs you saved/applied to closed", "✏️ 1 changed"]
        assert digest_lines(session, NOW + timedelta(hours=1)) == []


def test_rrf_ordering():
    fused = rrf([[1, 2, 3], [3, 1, 4]], k=60)
    assert [i for i, _ in fused] == [1, 3, 2, 4]
    assert abs(fused[0][1] - (1 / 61 + 1 / 62)) < 1e-12
    assert rrf([[5], []]) == [(5, 1 / 61)]
    assert [i for i, _ in rrf([[2, 1], [1, 2]])] == [1, 2]


def test_hybrid_search(db):
    with session_scope(db) as session:
        job(session, "a", "Python Backend Engineer", description="fintech payments python django")
        job(session, "b", "Frontend Engineer", description="react css")
        job(session, "c", "Data Engineer", description="python spark", closed=NOW)
    with session_scope(db) as session:
        assert session.execute(text("SELECT count(*) FROM jobs WHERE search_tsv IS NOT NULL")).scalar() == 3
        hits = hybrid_search(session, "python fintech", 5)
    assert hits[0].title == "Python Backend Engineer"
    assert hits[0].fts_rank == 1 and hits[0].vector_rank == 1
    assert all(h.title != "Data Engineer" for h in hits)
    with session_scope(db) as session:
        loose = hybrid_search(session, "python kotlin", 5)
    assert loose[0].fts_rank == 1
    assert embed_query("x").shape == (384,)
