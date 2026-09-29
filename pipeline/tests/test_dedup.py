import numpy as np
import pytest

from scout.dedup import DedupItem, find_groups, is_duplicate


def vec(seed: int, noise: float = 0.0, base: int | None = None) -> np.ndarray:
    rng = np.random.default_rng(base if base is not None else seed)
    v = rng.normal(size=384)
    if noise:
        v = v + np.random.default_rng(seed + 1000).normal(size=384) * noise
    return v / np.linalg.norm(v)


CASES = [
    ("exact key same city", ("Acme", "Backend Engineer", "Bengaluru", vec(1)), ("Acme Inc", "backend engineer", "Bangalore, India", vec(2)), True),
    ("fuzzy title, close embedding", ("Acme", "Senior Backend Engineer - Payments Platform", "Bengaluru", vec(3, base=3)), ("Acme", "Sr. Backend Engineer, Payment Platform", "Bengaluru", vec(4, 0.1, base=3)), True),
    ("fuzzy title, far embedding", ("Acme", "Senior Backend Engineer - Payments Platform", "Bengaluru", vec(5)), ("Acme", "Sr. Backend Engineer, Payment Platform", "Bengaluru", vec(6)), False),
    ("different company", ("Acme", "Backend Engineer", "Bengaluru", vec(7)), ("Globex", "Backend Engineer", "Bengaluru", vec(7)), False),
    ("different city", ("Acme", "Backend Engineer", "Bengaluru", vec(8)), ("Acme", "Backend Engineer", "Mumbai", vec(8)), False),
    ("different title", ("Acme", "Backend Engineer", "Bengaluru", vec(9)), ("Acme", "Data Scientist", "Bengaluru", vec(9)), False),
    ("missing embedding fuzzy", ("Acme", "Senior Backend Engineer - Payments Platform", "Bengaluru", None), ("Acme", "Sr. Backend Engineer, Payment Platform", "Bengaluru", None), False),
    ("alias city exact", ("Acme", "SRE", "Gurgaon", None), ("Acme", "SRE", "Gurugram", None), True),
]


@pytest.mark.parametrize("name, a, b, expected", CASES, ids=[c[0] for c in CASES])
def test_is_duplicate(name, a, b, expected):
    ia = DedupItem(1, a[0], a[1], a[2], "greenhouse", a[3])
    ib = DedupItem(2, b[0], b[1], b[2], "remotive", b[3])
    assert is_duplicate(ia, ib) is expected


def test_find_groups_transitive_and_canonical():
    items = [
        DedupItem(10, "Acme", "Backend Engineer", "Bengaluru", "remotive", vec(1)),
        DedupItem(11, "Acme", "Backend Engineer", "Bangalore", "greenhouse", vec(1)),
        DedupItem(12, "Acme", "backend engineer", "BLR", "hn", vec(1)),
        DedupItem(13, "Acme", "Data Engineer", "Bengaluru", "greenhouse", vec(2)),
    ]
    groups = find_groups(items)
    assert groups[10][0] == groups[11][0] == groups[12][0] == 10
    assert groups[11][1] is True
    assert groups[10][1] is False and groups[12][1] is False
    assert groups[13] == (13, True)
