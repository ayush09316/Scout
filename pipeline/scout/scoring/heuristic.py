import re
import time

from scout.scoring.types import JobInput, ProfileInput, ScoreOutput, ScoreResult

SKILL_VOCAB = [
    "python", "django", "flask", "fastapi", "celery", "postgres", "postgresql", "mysql", "redis", "kafka", "rabbitmq",
    "docker", "kubernetes", "aws", "gcp", "azure", "terraform", "go", "golang", "java", "kotlin", "scala", "rust",
    "typescript", "javascript", "node", "react", "graphql", "grpc", "rest", "microservices", "elasticsearch",
    "mongodb", "spark", "airflow", "sql", "linux", "ci/cd", "llm", "machine learning", "pytorch", "c++", "ruby",
    "rails", "php", "distributed systems", "system design", "snowflake", "dbt",
]
SENIORITY_ORDER = ["intern", "junior", "mid", "senior", "lead", "staff", "principal", "executive"]


def extract_skills(text: str) -> set[str]:
    lowered = text.lower()
    found = set()
    for skill in SKILL_VOCAB:
        if re.search(r"(?<![a-z0-9])" + re.escape(skill) + r"(?![a-z0-9])", lowered):
            found.add("postgres" if skill == "postgresql" else "go" if skill == "golang" else skill)
    return found


def expected_seniority(years: float) -> set[str]:
    if years < 1:
        return {"intern", "junior"}
    if years < 3:
        return {"junior", "mid"}
    if years < 6:
        return {"mid", "senior"}
    if years < 9:
        return {"senior", "lead", "staff"}
    return {"senior", "lead", "staff", "principal"}


def heuristic_output(job: JobInput, profile: ProfileInput) -> ScoreOutput:
    job_skills = extract_skills(f"{job.title}\n{job.description_md}")
    candidate_skills = extract_skills(profile.resume_md) | set(profile.skills)
    overlap = job_skills & candidate_skills
    missing = sorted(job_skills - candidate_skills)
    coverage = len(overlap) / len(job_skills) if job_skills else 0.3
    sim = max(0.0, min(1.0, (job.embed_sim - 0.55) / 0.35))
    seniority = job.seniority if job.seniority in SENIORITY_ORDER else "mid"
    seniority_match = seniority in expected_seniority(profile.years)
    exp_ok = job.min_exp is None or job.min_exp <= profile.years + 1
    raw = 0.5 * sim + 0.4 * coverage + 0.1 * (1.0 if seniority_match and exp_ok else 0.0)
    if not exp_ok:
        raw *= 0.6
    fit = round(10 * max(0.0, min(1.0, raw)), 2)
    reasons = []
    if overlap:
        reasons.append("Matches " + ", ".join(sorted(overlap)[:5]))
    reasons.append(f"Embedding similarity {job.embed_sim:.2f}")
    if not seniority_match:
        reasons.append(f"Level looks {seniority} for {profile.years:g} yrs")
    if job.min_exp is not None:
        reasons.append(f"Asks {job.min_exp}+ years")
    return ScoreOutput(
        fit_score=fit,
        seniority=seniority,
        seniority_match=seniority_match,
        apply_prob=round(max(0.0, min(1.0, raw * (1.0 if seniority_match else 0.7))), 3),
        reasons=reasons[:4],
        missing_skills=missing[:6],
    )


class HeuristicScorer:
    name = "heuristic"
    model = "heuristic-v1"
    paid = False

    def available(self) -> bool:
        return True

    async def score(self, job: JobInput, profile: ProfileInput) -> ScoreResult:
        started = time.perf_counter()
        output = heuristic_output(job, profile)
        return ScoreResult(output=output, model=self.model, latency_ms=int((time.perf_counter() - started) * 1000))
