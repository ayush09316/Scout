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
