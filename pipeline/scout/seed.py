import random
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.orm import Session

from scout.db.models import Company, EvalReport, Feedback, Job, Label, Profile, Run, Score
from scout.db.session import put_setting
from scout.embed import HashEmbedder, cosine, job_text
from scout.normalize import content_hash
from scout.normalize.experience import seniority_from_title
from scout.rank import DEFAULT_WEIGHTS, RankInput, final_score
from scout.scoring.heuristic import SKILL_VOCAB

DEMO_SOURCE = "demo"

COMPANIES = [
    ("Razorpay", 1), ("CRED", 1), ("Groww", 1), ("Zerodha", 1), ("Postman", 1), ("Atlan", 1), ("Hasura", 2),
    ("Freshworks", 2), ("Swiggy", 2), ("Meesho", 2), ("Sarvam", 1), ("Supabase", 2), ("PostHog", 2), ("Stripe", 1),
    ("Databricks", 2), ("GitLab", 2),
]
TITLES = [
    "Backend Engineer", "Software Engineer II, Payments", "SDE 2 - Backend", "Senior Backend Engineer (Python)",
    "Python Developer", "Platform Engineer", "Software Engineer, Infrastructure", "Staff Software Engineer",
    "Backend Engineer - Django", "Site Reliability Engineer", "Data Engineer", "Full Stack Engineer",
    "Frontend Engineer (React)", "Engineering Manager, Core", "Senior Software Engineer, APIs", "Founding Backend Engineer",
]
LOCATIONS = ["Bengaluru", "Bengaluru, Remote", "Remote-India", "Gurugram", "Mumbai", "Remote", "Pune", "Hyderabad"]
STACKS = [
    ["python", "django", "postgres", "celery", "redis"],
    ["python", "fastapi", "kafka", "kubernetes", "aws"],
    ["go", "grpc", "kubernetes", "postgres"],
    ["java", "spring", "mysql", "microservices"],
    ["typescript", "react", "node", "graphql"],
    ["python", "airflow", "spark", "snowflake", "dbt"],
]
RESUME = """# Demo Candidate
Backend engineer, 3 years. Python, Django, DRF, PostgreSQL, Celery, Redis, Docker, AWS.
Built payment reconciliation, webhook ingestion and order pipelines for a B2B marketplace."""
PREFS = {
    "years_experience": 3, "locations": ["Bengaluru"], "remote_ok": True,
    "skills": ["python", "django", "postgres", "celery", "redis", "docker", "aws"],
    "target_titles": ["backend engineer", "software engineer", "sde 2"],
}


def description(stack: list[str], years: int, rng: random.Random) -> str:
    extra = rng.sample([s for s in SKILL_VOCAB if s not in stack], 2)
    return (
        f"## About the role\nYou will design and run services that handle millions of requests a day.\n\n"
        f"## Requirements\n- {years}+ years of experience building backend systems\n"
        + "".join(f"- Strong with {s}\n" for s in stack)
        + f"- Nice to have: {', '.join(extra)}\n\n## Benefits\nHealth cover, learning budget, hybrid work."
    )


def seed_demo(session: Session, n_jobs: int = 80, seed: int = 7) -> dict[str, int]:
    rng = random.Random(seed)
    embedder = HashEmbedder()
    now = datetime.now(timezone.utc)
    company_ids: dict[str, tuple[int, int]] = {}
    for name, tier in COMPANIES:
        stmt = insert(Company).values(name=name, ats="demo", slug=name.lower(), tier=tier, active=False)
        stmt = stmt.on_conflict_do_update(index_elements=[Company.ats, Company.slug], set_={"tier": tier}).returning(Company.id)
        company_ids[name] = (session.execute(stmt).scalar_one(), tier)
    session.execute(delete(Job).where(Job.source == DEMO_SOURCE))
    version = (session.scalar(select(func.max(Profile.version))) or 0) + 1
    resume_vec = embedder.embed([RESUME])[0]
    profile = Profile(version=version, resume_md=RESUME, resume_embedding=resume_vec.tolist(), preferences=PREFS)
    session.add(profile)
    jobs: list[Job] = []
    for i in range(n_jobs):
        company, (company_id, tier) = rng.choice(list(company_ids.items()))
        title = rng.choice(TITLES)
        stack = rng.choice(STACKS)
        years = rng.choice([1, 2, 3, 3, 4, 5, 7])
        location = rng.choice(LOCATIONS)
        body = description(stack, years, rng)
        posted = now - timedelta(days=rng.randint(0, 25), hours=rng.randint(0, 23))
        job = Job(
            source=DEMO_SOURCE, external_id=f"demo-{i}", company_id=company_id, company_name=company,
            url=f"https://example.com/jobs/{company.lower()}/{i}", title=title, location=location,
            remote="Remote" in location, seniority=seniority_from_title(title), min_exp=years, max_exp=years + 3,
            salary_min=rng.choice([None, 1800000, 2500000, 3200000]), salary_max=None, salary_currency="INR",
            description_md=body, posted_at=posted, first_seen_at=posted, last_seen_at=now, missed_runs=0,
            content_hash=content_hash(company, title, location, body), is_canonical=True,
            embedding=embedder.embed([job_text(title, company, location, body)])[0].tolist(),
            closed_at=now - timedelta(days=1) if rng.random() < 0.05 else None,
        )
        session.add(job)
        jobs.append(job)
    session.flush()
    for job in jobs:
        job.dedup_group_id = job.id
    scored = 0
    for job in jobs:
        tier = company_ids[job.company_name][1]
        sim = cosine(job.embedding, resume_vec)
        python_stack = "django" in job.description_md or "fastapi" in job.description_md
        fit = min(10.0, max(0.0, rng.gauss(7.4 if python_stack else 4.2, 1.3)))
        apply_prob = round(min(1.0, max(0.0, fit / 10 + rng.uniform(-0.15, 0.1))), 3)
        match = (job.min_exp or 0) <= 4 and job.seniority in ("junior", "mid", "senior")
        final = final_score(RankInput(fit, sim, apply_prob, match, tier, job.posted_at), DEFAULT_WEIGHTS)
        missing = [s for s in ("kafka", "kubernetes", "go", "spark", "graphql") if s in job.description_md][:3]
        model = rng.choice(["typesafe/jev-1.13", "typesafe/jev-1.13", "gemini-2.5-flash", "heuristic-v1"])
        session.add(Score(
            job_id=job.id, profile_version=version, content_hash=job.content_hash, model=model,
            embed_sim=sim, fit_score=round(fit, 2), fit_prob=final, seniority=job.seniority, seniority_match=match,
            apply_prob=apply_prob, final_score=final,
            reasons=[f"Stack overlap with resume ({'strong' if python_stack else 'weak'})", f"Asks {job.min_exp}+ years"],
            missing_skills=missing, latency_ms=rng.randint(300, 1400), cost_usd=0 if model == "heuristic-v1" else round(rng.uniform(0.00002, 0.00006), 6),
        ))
        scored += 1
    ranked = rng.sample(jobs, min(24, len(jobs)))
    feedback_rows = 0
    actions = ["up", "up", "down", "saved", "applied", "interview", "rejected", "offer"]
    for job in ranked[:24]:
        action = rng.choice(actions)
        session.add(Feedback(job_id=job.id, action=action, at=now - timedelta(days=rng.randint(0, 10))))
        feedback_rows += 1
    labels = 0
    for idx, job in enumerate(jobs[:60]):
        python_stack = "django" in job.description_md or "fastapi" in job.description_md
        label = "fit" if python_stack and (job.min_exp or 0) <= 4 else "no"
        session.add(Label(job_id=job.id, label=label, split="test" if idx % 4 == 0 else "dev"))
        labels += 1
    for day in range(14, 0, -1):
        started = now - timedelta(days=day, hours=-2)
        fetched = rng.randint(3200, 4100)
        session.add(Run(
            started_at=started, finished_at=started + timedelta(minutes=rng.randint(4, 9)), status="ok" if day % 6 else "partial",
            counts={
                "fetched_total": fetched, "inserted": rng.randint(40, 220), "duplicates": rng.randint(80, 160),
                "filtered_in": rng.randint(300, 500), "prefiltered": 60, "scored": rng.randint(20, 60),
                "llm_calls": rng.randint(20, 60), "notified": 10, "duration_s": rng.randint(240, 540),
            },
            errors=[] if day % 6 else ["lever/somecompany: HTTPStatusError: 404"],
            cost_usd=round(rng.uniform(0.001, 0.004), 6),
        ))
    for weeks, p10 in ((3, 0.6), (2, 0.7), (1, 0.7), (0, 0.8)):
        session.add(EvalReport(created_at=now - timedelta(days=7 * weeks), report={
            "profile_version": version, "split": "test", "n": 60, "positives": 22, "primary": "jev",
            "scorers": {
                "jev": {"model": "typesafe/jev-1.13", "n": 60, "p_at_10": p10, "recall_at_50": 0.91, "ece": 0.07, "p50_latency_ms": 820, "cost_per_1k_usd": 0.035},
                "gemini": {"model": "gemini-2.5-flash", "n": 60, "p_at_10": p10 - 0.1, "recall_at_50": 0.86, "ece": 0.11, "p50_latency_ms": 1450, "cost_per_1k_usd": 0.62},
                "heuristic": {"model": "heuristic-v1", "n": 60, "p_at_10": 0.5, "recall_at_50": 0.77, "ece": 0.18, "p50_latency_ms": 1, "cost_per_1k_usd": 0.0},
            },
        }))
    put_setting(session, "rank_weights", DEFAULT_WEIGHTS)
    return {"companies": len(company_ids), "jobs": len(jobs), "scores": scored, "feedback": feedback_rows, "labels": labels, "runs": 14, "eval_reports": 4, "profile_version": version}
