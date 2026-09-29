from collections import defaultdict
from dataclasses import dataclass
from typing import Any

from rapidfuzz import fuzz

from scout.embed import cosine
from scout.normalize import canonicalize_location, normalize_company, normalize_title

TITLE_THRESHOLD = 90
COSINE_THRESHOLD = 0.92
SOURCE_PRIORITY = {"greenhouse": 0, "lever": 0, "ashby": 0, "adzuna": 2, "remotive": 2, "remoteok": 2, "arbeitnow": 2, "hn": 3}


@dataclass
class DedupItem:
    id: int
    company: str
    title: str
    location: str | None
    source: str = ""
    embedding: Any = None


def dedup_key(item: DedupItem) -> tuple[str, str, str]:
    return normalize_company(item.company), normalize_title(item.title), canonicalize_location(item.location).primary_city


def is_duplicate(a: DedupItem, b: DedupItem, ka: tuple[str, str, str] | None = None, kb: tuple[str, str, str] | None = None) -> bool:
    ka, kb = ka or dedup_key(a), kb or dedup_key(b)
    if ka[0] != kb[0]:
        return False
    if ka == kb:
        return True
    if ka[2] != kb[2] and ka[2] and kb[2]:
        return False
    if fuzz.token_sort_ratio(ka[1], kb[1]) < TITLE_THRESHOLD:
        return False
    if a.embedding is None or b.embedding is None:
        return False
    return cosine(a.embedding, b.embedding) >= COSINE_THRESHOLD


def find_groups(items: list[DedupItem]) -> dict[int, tuple[int, bool]]:
    parent = {item.id: item.id for item in items}

    def root(x: int) -> int:
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    keys = {item.id: dedup_key(item) for item in items}
    by_company: dict[str, list[DedupItem]] = defaultdict(list)
    for item in items:
        by_company[keys[item.id][0]].append(item)
    for bucket in by_company.values():
        for i, a in enumerate(bucket):
            for b in bucket[i + 1:]:
                if root(a.id) != root(b.id) and is_duplicate(a, b, keys[a.id], keys[b.id]):
                    ra, rb = root(a.id), root(b.id)
                    parent[max(ra, rb)] = min(ra, rb)
    members: dict[int, list[DedupItem]] = defaultdict(list)
    for item in items:
        members[root(item.id)].append(item)
    result: dict[int, tuple[int, bool]] = {}
    for group_id, group in members.items():
        canonical = min(group, key=lambda it: (SOURCE_PRIORITY.get(it.source, 1), it.id))
        for item in group:
            result[item.id] = (group_id, item.id == canonical.id)
    return result
