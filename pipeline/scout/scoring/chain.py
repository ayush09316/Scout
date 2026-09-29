import logging
from dataclasses import dataclass, field

from scout.scoring.heuristic import HeuristicScorer
from scout.scoring.llm import GeminiScorer, GroqScorer, JevScorer, LocalScorer
from scout.scoring.types import JobInput, ProfileInput, RateLimited, Scorer, ScoreResult, ScorerError

logger = logging.getLogger(__name__)

REGISTRY: dict[str, type] = {
    "jev": JevScorer,
    "gemini": GeminiScorer,
    "groq": GroqScorer,
    "local": LocalScorer,
    "heuristic": HeuristicScorer,
}


class CostGuard:
    def __init__(self, limit_usd: float, spent_today: float = 0.0) -> None:
        self.limit = limit_usd
        self.spent_today = spent_today
        self.spent_run = 0.0

    @property
    def total(self) -> float:
        return self.spent_today + self.spent_run

    def allows(self) -> bool:
        return self.total < self.limit

    def add(self, cost: float) -> None:
        self.spent_run += cost


@dataclass
class ChainStats:
    calls: dict[str, int] = field(default_factory=dict)
    failures: dict[str, int] = field(default_factory=dict)
    skipped_budget: int = 0
    errors: list[str] = field(default_factory=list)

    @property
    def llm_calls(self) -> int:
        return sum(v for k, v in self.calls.items() if k != "heuristic")


class ScorerChain:
    def __init__(self, scorers: list[Scorer], guard: CostGuard) -> None:
        self.scorers = scorers
        self.guard = guard
        self.stats = ChainStats()
        self._disabled: set[str] = set()

    @classmethod
    def from_names(cls, names: list[str], guard: CostGuard) -> "ScorerChain":
        scorers = [REGISTRY[n]() for n in names if n in REGISTRY]
        if not any(isinstance(s, HeuristicScorer) for s in scorers):
            scorers.append(HeuristicScorer())
        return cls([s for s in scorers if s.available()], guard)

    async def score(self, job: JobInput, profile: ProfileInput) -> ScoreResult:
        last_error: Exception | None = None
        for scorer in self.scorers:
            if scorer.name in self._disabled:
                continue
            if scorer.paid and not self.guard.allows():
                self.stats.skipped_budget += 1
                continue
            try:
                self.stats.calls[scorer.name] = self.stats.calls.get(scorer.name, 0) + 1
                result = await scorer.score(job, profile)
                self.guard.add(result.cost_usd)
                return result
            except RateLimited as exc:
                last_error = exc
                self.stats.failures[scorer.name] = self.stats.failures.get(scorer.name, 0) + 1
                logger.warning("%s rate limited on job %s", scorer.name, job.id)
                if self.stats.failures[scorer.name] >= 5:
                    self._disabled.add(scorer.name)
            except ScorerError as exc:
                last_error = exc
                self.stats.failures[scorer.name] = self.stats.failures.get(scorer.name, 0) + 1
                self.stats.errors.append(f"{scorer.name}: {exc}"[:200])
                logger.warning("%s failed on job %s: %s", scorer.name, job.id, exc)
                if self.stats.failures[scorer.name] >= 10:
                    self._disabled.add(scorer.name)
            except Exception as exc:
                last_error = exc
                self.stats.failures[scorer.name] = self.stats.failures.get(scorer.name, 0) + 1
                self.stats.errors.append(f"{scorer.name}: {type(exc).__name__}: {exc}"[:200])
                logger.warning("%s crashed on job %s: %s", scorer.name, job.id, exc)
        raise ScorerError(f"all scorers failed: {last_error}")
