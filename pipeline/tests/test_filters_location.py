import pytest

from scout.filters import FilterJob, Preferences, location_ok


def job(location: str, remote: bool = True, description: str = "") -> FilterJob:
    return FilterJob("Backend Engineer", "Acme", location, remote, "mid", 2, None, description)


@pytest.mark.parametrize("location,description,expected", [
    ("Bengaluru", "", True),
    ("Remote, India", "", True),
    ("Hyderabad, Remote", "", True),
    ("Remote (Global)", "", True),
    ("REMOTE Worldwide", "", True),
    ("U.S. Anywhere", "", False),
    ("Northern America, LATAM, Europe, APAC", "", False),
    ("Remote - US", "", False),
    ("Remote, EMEA", "", False),
    ("Bengaluru, San Francisco, Remote", "", True),
    ("Remote", "", False),
    ("Remote", "Open to candidates in India, IST overlap", True),
    ("San Francisco", "", False),
])
def test_location_is_india_or_truly_global(location, description, expected):
    remote = location != "San Francisco" and location != "Bengaluru"
    assert location_ok(job(location, remote, description), Preferences()) is expected


def test_mark_workable_flags_open_jobs(db):
    from sqlalchemy import create_engine
    from sqlalchemy.orm import Session
    from scout.db.models import Job
    from scout.pipeline import mark_workable

    engine = create_engine(db)
    db_session = Session(engine)
    rows = [("Remote - US", True), ("Bengaluru", False), ("Remote, India", True)]
    for i, (loc, remote) in enumerate(rows):
        db_session.add(Job(source="t", external_id=str(i), company_name="Acme", url="u", title="Backend Engineer",
                           location=loc, remote=remote, content_hash=str(i)))
    db_session.commit()
    assert mark_workable(db_session) == 2
    flags = {j.location: j.workable_from_india for j in db_session.query(Job).all()}
    db_session.close()
    engine.dispose()
    assert flags == {"Remote - US": False, "Bengaluru": True, "Remote, India": True}
