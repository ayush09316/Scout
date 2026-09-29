import pytest

from scout.normalize import canonicalize_location, content_hash, html_to_md, normalize_job, parse_experience, seniority_from_title
from scout.normalize.text import normalize_company, normalize_title
from scout.sources.base import RawJob


@pytest.mark.parametrize(
    "raw, expected_display, remote",
    [
        ("Bangalore, Karnataka, India", "Bengaluru", False),
        ("BLR", "Bengaluru", False),
        ("Bengaluru", "Bengaluru", False),
        ("Gurgaon", "Gurugram", False),
        ("Gurugram, Haryana", "Gurugram", False),
        ("New Delhi", "Delhi NCR", False),
        ("Noida, Uttar Pradesh", "Delhi NCR", False),
        ("Bombay", "Mumbai", False),
        ("Mumbai, India", "Mumbai", False),
        ("Remote - India", "Remote-India", True),
        ("Remote, IN", "Remote-India", True),
        ("India (Remote)", "Remote-India", True),
        ("Remote", "Remote", True),
        ("Remote - US", "Remote - US", True),
        ("Bangalore / Remote", "Bengaluru, Remote", True),
        ("Work from home", "Work from home", True),
        ("Berlin, Germany", "Berlin", False),
        ("Austin, TX", "Austin, TX", False),
        ("", None, False),
    ],
)
def test_location_canonicalization(raw, expected_display, remote):
    loc = canonicalize_location(raw)
    assert loc.display == expected_display
    assert loc.remote is remote


def test_remote_from_hint_and_title():
    assert canonicalize_location("Pune", remote_hint=True).remote
    assert canonicalize_location("Hyderabad", title="Backend Engineer (Remote)").remote
    assert not canonicalize_location("Chennai - not remote").remote


def test_india_flag():
    assert canonicalize_location("Hyderabad").india
    assert canonicalize_location("Remote, India").india
    assert not canonicalize_location("London").india


@pytest.mark.parametrize(
    "text, expected",
    [
        ("We need 3+ years of experience in Python", (3, None)),
        ("2-5 yrs experience", (2, 5)),
        ("2 - 5 years", (2, 5)),
        ("3 to 6 years of backend experience", (3, 6)),
        ("Minimum 4 years of professional experience", (4, None)),
        ("at least 5 years experience", (5, None)),
        ("5+ yrs", (5, None)),
        ("No experience requirement listed", (None, None)),
        ("Founded 10 years ago; 2+ years of experience", (2, None)),
    ],
)
def test_experience_regex(text, expected):
    assert parse_experience(text) == expected


@pytest.mark.parametrize(
    "title, level",
    [
        ("Senior Backend Engineer", "senior"),
        ("Sr. Software Engineer", "senior"),
        ("Staff Engineer, Infra", "staff"),
        ("Principal Engineer", "principal"),
        ("Engineering Manager", "lead"),
        ("Tech Lead - Payments", "lead"),
        ("Software Engineering Intern", "intern"),
        ("SDE 2 - Backend", "mid"),
        ("SDE-1", "junior"),
        ("Junior Developer", "junior"),
        ("Backend Engineer", "mid"),
        ("Director of Engineering", "executive"),
    ],
)
def test_seniority_from_title(title, level):
    assert seniority_from_title(title) == level


def test_html_to_md():
    md = html_to_md("<h2>Role</h2><p>Build <strong>APIs</strong></p><ul><li>Python</li><li>Django</li></ul>")
    assert "## Role" in md
    assert "**APIs**" in md
    assert "Python" in md and "<" not in md
    assert html_to_md("plain text stays") == "plain text stays"


def test_normalizers():
    assert normalize_company("Acme Technologies Pvt. Ltd.") == "acme"
    assert normalize_title("Sr. SWE (Backend)") == "senior software engineer"


def test_content_hash_stable_and_sensitive():
    a = content_hash("Acme", "Backend Engineer", "Bengaluru", "desc")
    assert a == content_hash("Acme Inc", "backend engineer", "Bengaluru", "desc")
    assert a != content_hash("Acme", "Backend Engineer", "Bengaluru", "desc v2")


def test_normalize_job_end_to_end():
    raw = RawJob(
        source="greenhouse", external_id="acme:1", company_name="Acme", title="Senior Backend Engineer",
        url="https://x", location="Bangalore", description="<p>Need 4+ years of experience with Django</p>",
    )
    job = normalize_job(raw)
    assert job.location == "Bengaluru"
    assert job.seniority == "senior"
    assert job.min_exp == 4
    assert "Django" in job.description_md
