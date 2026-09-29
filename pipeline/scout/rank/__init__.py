from dataclasses import dataclass
from datetime import datetime, timezone

import numpy as np

DEFAULT_WEIGHTS: dict[str, float] = {
    "fit": 0.45,
    "embed_sim": 0.2,
    "apply": 0.2,
    "seniority_match": 0.08,
    "tier1": 0.04,
    "recency": 0.03,
}
FEATURES = list(DEFAULT_WEIGHTS)


@dataclass
class RankInput:
    fit_score: float
    embed_sim: float
    apply_prob: float
    seniority_match: bool
    tier: int
    posted_at: datetime | None


def features(item: RankInput, now: datetime | None = None) -> dict[str, float]:
    now = now or datetime.now(timezone.utc)
    recency = 0.5
    if item.posted_at:
        age_days = max(0.0, (now - item.posted_at).total_seconds() / 86400)
        recency = float(np.exp(-age_days / 21))
    return {
        "fit": item.fit_score / 10,
        "embed_sim": max(0.0, min(1.0, item.embed_sim)),
        "apply": item.apply_prob,
        "seniority_match": 1.0 if item.seniority_match else 0.0,
        "tier1": 1.0 if item.tier == 1 else 0.0,
        "recency": recency,
    }


def final_score(item: RankInput, weights: dict[str, float] | None = None, now: datetime | None = None) -> float:
    weights = weights or DEFAULT_WEIGHTS
    feats = features(item, now)
    total = sum(max(0.0, weights.get(k, 0.0)) for k in FEATURES) or 1.0
    return round(sum(weights.get(k, 0.0) * feats[k] for k in FEATURES) / total, 4)


class Calibrator:
    def __init__(self, xs: list[float], ys: list[float]) -> None:
        self.xs = np.asarray(xs, dtype=float)
        self.ys = np.asarray(ys, dtype=float)

    @classmethod
    def fit(cls, scores: list[float], labels: list[int]) -> "Calibrator":
        from sklearn.isotonic import IsotonicRegression

        model = IsotonicRegression(out_of_bounds="clip", y_min=0.0, y_max=1.0)
        model.fit(scores, labels)
        return cls(list(model.X_thresholds_), list(model.y_thresholds_))

    def __call__(self, score: float) -> float:
        if len(self.xs) == 0:
            return score
        return float(np.interp(score, self.xs, self.ys))

    def to_json(self) -> dict:
        return {"x": [float(v) for v in self.xs], "y": [float(v) for v in self.ys]}

    @classmethod
    def from_json(cls, data: dict | None) -> "Calibrator | None":
        if not data or not data.get("x"):
            return None
        return cls(data["x"], data["y"])
