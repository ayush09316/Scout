from dataclasses import dataclass, field
from typing import Literal, Protocol

from pydantic import BaseModel, Field

Seniority = Literal["intern", "junior", "mid", "senior", "staff", "principal", "lead", "executive"]


class ScoreOutput(BaseModel):
    fit_score: float = Field(ge=0, le=10)
    seniority: Seniority = "mid"
    seniority_match: bool = True
    apply_prob: float = Field(ge=0, le=1)
    reasons: list[str] = Field(default_factory=list, max_length=6)
    missing_skills: list[str] = Field(default_factory=list, max_length=10)


@dataclass
class JobInput:
    id: int
    title: str
    company_name: str
    location: str | None
    remote: bool
    seniority: str | None
    min_exp: int | None
    max_exp: int | None
    description_md: str
    content_hash: str
    embed_sim: float = 0.0
    tier: int = 2


@dataclass
class ProfileInput:
    version: int
    resume_md: str
    preferences: dict = field(default_factory=dict)

    @property
    def years(self) -> float:
        return float(self.preferences.get("years_experience", 3))

    @property
    def skills(self) -> list[str]:
        return [s.lower() for s in self.preferences.get("skills", [])]


@dataclass
class ScoreResult:
    output: ScoreOutput
    model: str
    latency_ms: int
    cost_usd: float = 0.0


class ScorerError(Exception):
    pass


class RateLimited(ScorerError):
    pass


class Scorer(Protocol):
    name: str
    model: str
    paid: bool

    def available(self) -> bool: ...

    async def score(self, job: JobInput, profile: ProfileInput) -> ScoreResult: ...
