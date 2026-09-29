from datetime import datetime, timezone

import pytest
from sqlalchemy import select

from scout.db.models import Company, Job, SalaryEstimate
from scout.db.session import session_scope
from scout.salary import (
    COMPARABLES_MODEL, PRIOR_MODEL, ComparablesModel, Features, city_bucket, estimate_salaries, features_for,
    inr_band, parse_salary_text, title_family,
)


@pytest.mark.parametrize("text,expected", [
    ("CTC ₹25-35 LPA plus ESOPs", (2_500_000, 3_500_000, "INR")),
    ("INR 18,00,000 - 24,00,000 per annum", (1_800_000, 2_400_000, "INR")),
    ("Base $120k-$150k + equity", (120_000, 150_000, "USD")),
    ("up to 30 lakh fixed", (3_000_000, 3_000_000, "INR")),
    ("Compensation: 1.2 - 1.5 Cr", (12_000_000, 15_000_000, "INR")),
    ("Rs. 12 to 18 lakhs", (1_200_000, 1_800_000, "INR")),
    ("USD 90,000 - 110,000", (90_000, 110_000, "USD")),
    ("$40-60/hr contract", None),
    ("Pay range $124,000—$186,000 CAD", (124_000, 186_000, "CAD")),
    ("We have 5-7 years of experience and 3 offices", None),
    ("Great culture, no salary listed.", None),
    ("", None),
])
def test_parse_salary_text(text, expected):
    assert parse_salary_text(text) == expected


def test_inr_band_converts_usd(monkeypatch):
    monkeypatch.setenv("USD_INR_RATE", "80")
    assert inr_band(100_000, 150_000, "USD") == (8_000_000.0, 12_000_000.0)
    assert inr_band(2_000_000, None, "INR") == (2_000_000.0, 2_000_000.0)
    assert inr_band(5_000_000, 6_000_000, "JPY") is None


def test_features():
    assert title_family("Senior Backend Engineer") == "backend"
    assert title_family("Machine Learning Engineer") == "ml"
    assert title_family("Full Stack Developer") == "fullstack"
    assert title_family("Site Reliability Engineer") == "devops"
    assert city_bucket("Bengaluru", False) == "Bengaluru"
    assert city_bucket("Remote-India", True) == "remote-india"
    assert city_bucket("Remote", True) == "remote-global"
    assert city_bucket("London", False) == "abroad"


def comps(feats: Features, n: int, base: float, start: int = 0):
    return [(start + i, feats, base + i * 100_000) for i in range(n)]


def test_comparables_backoff():
    exact = Features("backend", "senior", "Bengaluru", 1)
    other_tier = Features("backend", "senior", "Bengaluru", 2)
    other_city = Features("backend", "senior", "Pune", 2)
    fam_only = Features("backend", "junior", "Pune", 2)
    data = comps(exact, 6, 3_000_000) + comps(other_tier, 3, 2_000_000, 100) + comps(other_city, 4, 1_500_000, 200) + comps(fam_only, 10, 800_000, 300)
    model = ComparablesModel(data)

    hit = model.estimate(exact)
    assert hit.model == COMPARABLES_MODEL and hit.basis["level"] == 0 and hit.n == 6
    assert hit.low < hit.high and 2_500_000 <= hit.low
    assert hit.basis["group"] == {"market": "india", "family": "backend", "seniority": "senior", "city": "Bengaluru", "tier": 1}

    tier3 = model.estimate(Features("backend", "senior", "Bengaluru", 3))
    assert model.estimate(Features("backend", "senior", "remote-global", 1)).model == PRIOR_MODEL
    assert tier3.basis["level"] == 1 and tier3.n == 9

    hyd = model.estimate(Features("backend", "senior", "Hyderabad", 2))
    assert hyd.basis["level"] == 2 and hyd.n == 13

    lead = model.estimate(Features("backend", "lead", "Hyderabad", 2))
    assert lead.basis["level"] == 3 and lead.n == 23
    assert lead.confidence < hit.confidence or lead.n > hit.n

    unknown = model.estimate(Features("ml", "senior", "Bengaluru", 1))
    assert unknown.model == PRIOR_MODEL and unknown.confidence <= 0.3


def test_prior_when_too_few_comparables():
    model = ComparablesModel(comps(Features("backend", "senior", "Bengaluru", 1), 6, 3_000_000))
    est = model.estimate(Features("backend", "senior", "Bengaluru", 1))
    assert est.model == PRIOR_MODEL and est.confidence <= 0.3
    assert est.basis["lpa"][0] >= 20 and est.low < est.high


def add_job(session, ext, title, location="Bengaluru", salary=None, description="", company_id=None, currency="INR"):
    session.add(Job(
        source="greenhouse", external_id=ext, company_id=company_id, company_name="Acme", url=f"https://x/{ext}", title=title,
        location=location, remote=False, seniority="senior", salary_min=salary[0] if salary else None,
        salary_max=salary[1] if salary else None, salary_currency=currency if salary else None, description_md=description,
        content_hash=ext, posted_at=datetime.now(timezone.utc),
    ))


def test_estimate_salaries_end_to_end(db):
    with session_scope(db) as session:
        company = Company(name="Acme", ats="greenhouse", slug="acme", tier=1)
        session.add(company)
        session.flush()
        for i in range(25):
            add_job(session, f"s{i}", "Senior Backend Engineer", salary=(3_000_000 + i * 50_000, 4_000_000 + i * 50_000), company_id=company.id)
        add_job(session, "t1", "Senior Backend Engineer", company_id=company.id)
        add_job(session, "t2", "Senior Backend Engineer", description="Pay: ₹40-50 LPA", company_id=company.id)
        add_job(session, "t3", "Senior Backend Engineer")
    with session_scope(db) as session:
        counts = estimate_salaries(session, None, None)
    assert counts["extracted"] == 1
    assert counts[COMPARABLES_MODEL] == 1
    with session_scope(db) as session:
        t1 = session.scalar(select(Job).where(Job.external_id == "t1"))
        t2 = session.scalar(select(Job).where(Job.external_id == "t2"))
        est = session.get(SalaryEstimate, t1.id)
        assert est.model == COMPARABLES_MODEL and est.basis["level"] == 0
        assert est.basis["group"] == {"market": "india", "family": "backend", "seniority": "senior", "city": "Bengaluru", "tier": 1}
        assert 3_000_000 < est.low < est.high < 5_500_000
        assert t2.salary_min == 4_000_000 and session.get(SalaryEstimate, t2.id) is None
    with session_scope(db) as session:
        counts = estimate_salaries(session, None, None, all_jobs=True)
    assert counts["estimated"] == 2


def test_features_for_defaults():
    feats = features_for("Engineer", None, None, True, None)
    assert (feats.family, feats.seniority, feats.city, feats.tier) == ("software", "mid", "remote-global", 2)
