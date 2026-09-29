import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
from sqlalchemy import func, select, update
from sqlalchemy.orm import Session

from scout.db.models import Company, Profile, Score
from scout.db.session import get_setting, put_setting
from scout.evals import labeled_jobs
from scout.rank import DEFAULT_WEIGHTS, FEATURES, Calibrator, RankInput, features

MIN_SAMPLES = 20
MIN_GAIN = 0.01


def training_rows(session: Session) -> tuple[list[dict[str, float]], list[int], list[float]]:
    profile = session.scalar(select(Profile).order_by(Profile.version.desc()).limit(1))
    if profile is None:
        return [], [], []
    items = labeled_jobs(session, None)
    tiers = dict(session.execute(select(Company.id, Company.tier)).all())
    ids = [i.job.id for i in items]
    best = {}
    for score in session.scalars(select(Score).where(Score.profile_version == profile.version, Score.job_id.in_(ids or [0]))):
        if score.job_id not in best or (score.final_score or 0) > (best[score.job_id].final_score or 0):
            best[score.job_id] = score
    feats, labels, finals = [], [], []
    for item in items:
        score = best.get(item.job.id)
        if score is None:
            continue
        rank_input = RankInput(score.fit_score or 0, score.embed_sim or 0, score.apply_prob or 0, bool(score.seniority_match), tiers.get(item.job.company_id, 2), item.job.posted_at)
        feats.append(features(rank_input))
        labels.append(item.label)
        finals.append(score.final_score or 0)
    return feats, labels, finals


def auc(scores: list[float], labels: list[int]) -> float:
    from sklearn.metrics import roc_auc_score

    if len(set(labels)) < 2:
        return 0.5
    return float(roc_auc_score(labels, scores))


def tune_weights(session: Session, metrics_file: Path | None = None) -> dict[str, Any]:
    feats, labels, _ = training_rows(session)
    current = get_setting(session, "rank_weights", DEFAULT_WEIGHTS) or DEFAULT_WEIGHTS
    result: dict[str, Any] = {
        "at": datetime.now(timezone.utc).isoformat(), "n": len(labels), "positives": int(sum(labels)),
        "adopted": False, "weights": current,
    }
    if len(labels) >= MIN_SAMPLES and 0 < sum(labels) < len(labels):
        from sklearn.linear_model import LogisticRegression
        from sklearn.model_selection import cross_val_predict

        x = np.asarray([[f[k] for k in FEATURES] for f in feats])
        y = np.asarray(labels)
        old_scores = [sum(current.get(k, 0) * f[k] for k in FEATURES) for f in feats]
        folds = max(2, min(5, int(min(y.sum(), len(y) - y.sum()))))
        model = LogisticRegression(C=1.0, max_iter=1000)
        cv_scores = cross_val_predict(model, x, y, cv=folds, method="predict_proba")[:, 1]
        old_auc, new_auc = auc(old_scores, labels), auc(list(cv_scores), labels)
        result.update(auc_old=round(old_auc, 4), auc_new=round(new_auc, 4))
        if new_auc > old_auc + MIN_GAIN:
            model.fit(x, y)
            coefs = np.clip(model.coef_[0], 0, None)
            if coefs.sum() > 0:
                weights = {k: round(float(c / coefs.sum()), 4) for k, c in zip(FEATURES, coefs)}
                put_setting(session, "rank_weights", weights)
                result.update(adopted=True, weights=weights)
    else:
        result["reason"] = "not enough labeled data"
    if metrics_file:
        metrics_file.parent.mkdir(parents=True, exist_ok=True)
        metrics_file.write_text(json.dumps(result, indent=2, default=str) + "\n")
    return result


def calibrate(session: Session) -> dict[str, Any]:
    feats, labels, finals = training_rows(session)
    if len(labels) < 10 or len(set(labels)) < 2:
        return {"n": len(labels), "fitted": False}
    calibrator = Calibrator.fit(finals, labels)
    put_setting(session, "calibration", calibrator.to_json())
    profile_version = session.scalar(select(func.max(Profile.version)))
    rows = session.execute(select(Score.id, Score.final_score).where(Score.profile_version == profile_version)).all()
    for score_id, value in rows:
        session.execute(update(Score).where(Score.id == score_id).values(fit_prob=calibrator(value or 0)))
    return {"n": len(labels), "fitted": True, "points": len(calibrator.xs), "rescored": len(rows)}


