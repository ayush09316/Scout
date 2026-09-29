import asyncio

import pytest
from sqlalchemy import select

from scout.db.models import Feedback, Job, Label, Score
from scout.db.session import get_setting, session_scope
from scout.evals import gate_check, run_eval
from scout.evals.metrics import expected_calibration_error, p50, precision_at_k, rank_labels, recall_at_k
from scout.rank import DEFAULT_WEIGHTS, Calibrator, RankInput, final_score
from scout.rank.learn import calibrate, tune_weights
from scout.seed import seed_demo


def test_precision_recall():
    ranked = [1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0]
    assert precision_at_k(ranked, 10) == pytest.approx(0.3)
    assert precision_at_k(ranked, 3) == pytest.approx(2 / 3)
    assert recall_at_k(ranked, 10) == pytest.approx(0.75)
    assert recall_at_k(ranked, 50) == 1.0
    assert recall_at_k([0, 0], 10) == 0.0
    assert precision_at_k([], 10) == 0.0
    assert precision_at_k([1, 0], 10) == 0.5


def test_ece():
    assert expected_calibration_error([0.0, 1.0], [0, 1]) == pytest.approx(0.0)
    assert expected_calibration_error([0.9, 0.9], [0, 0]) == pytest.approx(0.9)
    probs, labels = [0.2, 0.2, 0.8, 0.8], [0, 1, 1, 1]
    assert expected_calibration_error(probs, labels) == pytest.approx(0.5 * 0.3 + 0.5 * 0.2)


def test_p50_and_rank():
    assert p50([100, 300, 200]) == 200
    assert p50([]) == 0
    assert rank_labels([0.1, 0.9, 0.5], [0, 1, 1]) == [1, 1, 0]


def test_gate():
    prev = {"scorers": {"heuristic": {"p_at_10": 0.8}}}
    assert gate_check({"scorers": {"heuristic": {"p_at_10": 0.76}}}, prev)[0]
    assert gate_check({"scorers": {"heuristic": {"p_at_10": 0.75}}}, prev)[0]
    assert not gate_check({"scorers": {"heuristic": {"p_at_10": 0.7}}}, prev)[0]
    assert gate_check({"scorers": {"jev": {"p_at_10": 0.1}}}, prev)[0]
    assert gate_check({"scorers": {}}, None)[0]


def test_final_score_bounds_and_calibrator():
    high = final_score(RankInput(10, 1, 1, True, 1, None))
    low = final_score(RankInput(0, 0, 0, False, 3, None))
    assert 0 <= low < high <= 1
    assert set(DEFAULT_WEIGHTS) == {"fit", "embed_sim", "apply", "seniority_match", "tier1", "recency"}
    cal = Calibrator.fit([0.1, 0.2, 0.3, 0.6, 0.7, 0.9], [0, 0, 1, 0, 1, 1])
    values = [cal(x) for x in (0.0, 0.25, 0.5, 0.8, 1.0)]
    assert values == sorted(values)
    assert Calibrator.from_json(cal.to_json())(0.8) == pytest.approx(cal(0.8))


def test_seed_eval_calibrate_tune(db, tmp_path):
    with session_scope(db) as session:
        summary = seed_demo(session, n_jobs=60)
    assert summary["jobs"] == 60
    with session_scope(db) as session:
        report = asyncio.run(run_eval(session, ["heuristic"], "test"))
        assert report["n"] == 15
        metrics = report["scorers"]["heuristic"]
        assert 0 <= metrics["p_at_10"] <= 1 and metrics["cost_per_1k_usd"] == 0
        assert session.scalar(select(Score).where(Score.model == "heuristic-v1")) is not None
    with session_scope(db) as session:
        result = calibrate(session)
        assert result["fitted"]
        assert get_setting(session, "calibration")["x"]
    with session_scope(db) as session:
        tuned = tune_weights(session, tmp_path / "latest.json")
        assert tuned["n"] >= 20
        assert (tmp_path / "latest.json").exists()
        assert "auc_old" in tuned


def test_eval_falls_back_to_feedback(db):
    with session_scope(db) as session:
        seed_demo(session, n_jobs=30)
        for label in session.scalars(select(Label)):
            session.delete(label)
    with session_scope(db) as session:
        feedback_jobs = {f.job_id for f in session.scalars(select(Feedback))}
        report = asyncio.run(run_eval(session, ["heuristic"], "test"))
        embedded = set(session.scalars(select(Job.id).where(Job.id.in_(feedback_jobs), Job.embedding.is_not(None))))
    assert report["n"] == len(embedded)
