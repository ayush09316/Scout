import numpy as np


def precision_at_k(ranked_labels: list[int], k: int) -> float:
    if not ranked_labels:
        return 0.0
    top = ranked_labels[:k]
    return sum(top) / len(top)


def recall_at_k(ranked_labels: list[int], k: int) -> float:
    positives = sum(ranked_labels)
    if positives == 0:
        return 0.0
    return sum(ranked_labels[:k]) / positives


def expected_calibration_error(probs: list[float], labels: list[int], bins: int = 10) -> float:
    if not probs:
        return 0.0
    p = np.clip(np.asarray(probs, dtype=float), 0, 1)
    y = np.asarray(labels, dtype=float)
    edges = np.linspace(0, 1, bins + 1)
    index = np.clip(np.digitize(p, edges[1:-1], right=True), 0, bins - 1)
    total = 0.0
    for b in range(bins):
        mask = index == b
        if mask.any():
            total += mask.sum() / len(p) * abs(p[mask].mean() - y[mask].mean())
    return float(total)


def reliability_bins(probs: list[float], labels: list[int], bins: int = 10) -> list[dict[str, float]]:
    if not probs:
        return []
    p = np.clip(np.asarray(probs, dtype=float), 0, 1)
    y = np.asarray(labels, dtype=float)
    edges = np.linspace(0, 1, bins + 1)
    index = np.clip(np.digitize(p, edges[1:-1], right=True), 0, bins - 1)
    out = []
    for b in range(bins):
        mask = index == b
        if mask.any():
            out.append({"bin": round((edges[b] + edges[b + 1]) / 2, 2), "predicted": round(float(p[mask].mean()), 4),
                        "observed": round(float(y[mask].mean()), 4), "count": int(mask.sum())})
    return out


def p50(values: list[float]) -> float:
    return float(np.median(values)) if values else 0.0


def rank_labels(scores: list[float], labels: list[int]) -> list[int]:
    order = sorted(range(len(scores)), key=lambda i: (-scores[i], i))
    return [labels[i] for i in order]
