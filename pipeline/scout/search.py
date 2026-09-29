from collections.abc import Sequence
from dataclasses import dataclass

from sqlalchemy import text
from sqlalchemy.orm import Session

from scout.embed import embed_query

RRF_K = 60
CANDIDATES = 50

FTS_SQL = text(
    "SELECT j.id, ts_rank_cd(j.search_tsv, q) AS rank "
    "FROM jobs j, websearch_to_tsquery('english', :q) q "
    "WHERE j.closed_at IS NULL AND j.is_canonical AND j.search_tsv @@ q "
    "ORDER BY rank DESC, j.id DESC LIMIT :n"
)
FTS_ANY_SQL = text(
    "SELECT j.id, ts_rank_cd(j.search_tsv, q) AS rank "
    "FROM jobs j, CAST(replace(CAST(websearch_to_tsquery('english', :q) AS text), ' & ', ' | ') AS tsquery) q "
    "WHERE j.closed_at IS NULL AND j.is_canonical AND j.search_tsv @@ q "
    "ORDER BY rank DESC, j.id DESC LIMIT :n"
)
VECTOR_SQL = text(
    "SELECT j.id, 1 - (j.embedding <=> CAST(:vec AS vector)) AS sim "
    "FROM jobs j "
    "WHERE j.closed_at IS NULL AND j.is_canonical AND j.embedding IS NOT NULL "
    "ORDER BY j.embedding <=> CAST(:vec AS vector), j.id DESC LIMIT :n"
)
DETAILS_SQL = text("SELECT id, title, company_name, location FROM jobs WHERE id = ANY(:ids)")


@dataclass
class Hit:
    job_id: int
    score: float
    fts_rank: int | None
    vector_rank: int | None
    title: str = ""
    company_name: str = ""
    location: str | None = None


def rrf(rankings: Sequence[Sequence[int]], k: int = RRF_K) -> list[tuple[int, float]]:
    scores: dict[int, float] = {}
    for ranking in rankings:
        for position, item in enumerate(ranking, 1):
            scores[item] = scores.get(item, 0.0) + 1.0 / (k + position)
    return sorted(scores.items(), key=lambda kv: (-kv[1], kv[0]))


def vector_literal(vec) -> str:
    return "[" + ",".join(f"{float(v):.6f}" for v in vec) + "]"


def hybrid_search(session: Session, query: str, limit: int = 20, k: int = RRF_K) -> list[Hit]:
    query = query.strip()
    if not query:
        return []
    fts = [r.id for r in session.execute(FTS_SQL, {"q": query, "n": CANDIDATES})]
    if not fts:
        fts = [r.id for r in session.execute(FTS_ANY_SQL, {"q": query, "n": CANDIDATES})]
    vec = vector_literal(embed_query(query))
    semantic = [r.id for r in session.execute(VECTOR_SQL, {"vec": vec, "n": CANDIDATES})]
    fts_pos = {j: i for i, j in enumerate(fts, 1)}
    vec_pos = {j: i for i, j in enumerate(semantic, 1)}
    fused = rrf([fts, semantic], k)[:limit]
    details = {r.id: r for r in session.execute(DETAILS_SQL, {"ids": [j for j, _ in fused]})}
    hits = []
    for job_id, score in fused:
        row = details.get(job_id)
        hits.append(Hit(job_id, round(score, 6), fts_pos.get(job_id), vec_pos.get(job_id),
                        row.title if row else "", row.company_name if row else "", row.location if row else None))
    return hits
