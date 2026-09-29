from datetime import datetime, timedelta, timezone

from scout.filters import FilterJob, Preferences, passes


def job(days: int | None) -> FilterJob:
    posted = datetime.now(timezone.utc) - timedelta(days=days) if days is not None else None
    return FilterJob("Backend Engineer", "Acme", "Bengaluru", False, "mid", 2, posted)


def test_stale_postings_are_dropped():
    prefs = Preferences(max_age_days=45)
    assert passes(job(10), prefs) == (True, "ok")
    assert passes(job(400), prefs) == (False, "stale")
    assert passes(job(None), prefs) == (True, "ok")
