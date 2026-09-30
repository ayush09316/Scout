import "server-only";
import { sql, type SQL } from "drizzle-orm";
import { db } from "./db";
import { JOB_COLS, JOB_JOINS, WITH_CS, mapJobs } from "./intel";
import type { JobListItem } from "./queries";
import { fxSqlCase } from "./format";

export type SearchFilters = { remote?: "any" | "remote" | "onsite"; location?: string; seniority?: string; minScore?: number; source?: string; minSalaryLpa?: number; anywhere?: boolean };
export type SearchHit = JobListItem & { headline: string | null; similarity: number | null; ftsRank: number | null; vecRank: number | null; rrf: number };
export type SearchResult = { hits: SearchHit[]; mode: "hybrid" | "keyword"; ms: number; total: number; offset: number };
export type SearchOpts = { limit?: number; offset?: number; candidates?: number };

const QUERY_PREFIX = "Represent this sentence for searching relevant passages: ";

type Extractor = (texts: string[], opts: { pooling: "cls"; normalize: boolean }) => Promise<{ data: Float32Array | number[]; dims: number[] }>;

const g = globalThis as unknown as { __scoutEmbed?: Promise<Extractor | null>; __scoutEmbedFailedAt?: number };

function loadExtractor(): Promise<Extractor | null> {
  if (g.__scoutEmbedFailedAt && Date.now() - g.__scoutEmbedFailedAt < 10 * 60_000) return Promise.resolve(null);
  if (!g.__scoutEmbed) {
    g.__scoutEmbed = (async () => {
      try {
        const t = await import("@huggingface/transformers");
        const p = await t.pipeline("feature-extraction", "Xenova/bge-small-en-v1.5", { dtype: "q8" });
        return p as unknown as Extractor;
      } catch (e) {
        console.error("embedding model failed to load", e);
        g.__scoutEmbedFailedAt = Date.now();
        g.__scoutEmbed = undefined;
        return null;
      }
    })();
  }
  return g.__scoutEmbed;
}

export async function embedQuery(q: string): Promise<number[] | null> {
  if (process.env.SCOUT_DISABLE_EMBED === "1") return null;
  const ex = await loadExtractor();
  if (!ex) return null;
  try {
    const out = await ex([QUERY_PREFIX + q], { pooling: "cls", normalize: true });
    return Array.from(out.data as Float32Array).slice(0, 384);
  } catch {
    return null;
  }
}

function filterSql(f: SearchFilters): SQL {
  const parts: SQL[] = [sql`j.closed_at IS NULL`, sql`j.is_canonical`];
  if (!f.anywhere) parts.push(sql`COALESCE(j.workable_from_india, true)`);
  if (f.remote === "remote") parts.push(sql`j.remote`);
  if (f.remote === "onsite") parts.push(sql`NOT j.remote`);
  if (f.seniority) parts.push(sql`j.seniority = ${f.seniority}`);
  if (f.source) parts.push(sql`j.source = ${f.source}`);
  if (f.location) {
    if (f.location.startsWith("Remote")) parts.push(sql`(j.remote OR j.location ILIKE '%remote%')`);
    else {
      const pats = f.location === "Bengaluru" ? ["%bengaluru%", "%bangalore%"] : f.location === "Gurugram" ? ["%gurugram%", "%gurgaon%"] : [`%${f.location}%`];
      parts.push(sql`(${sql.join(pats.map((p) => sql`j.location ILIKE ${p}`), sql` OR `)})`);
    }
  }
  if (f.minScore) parts.push(sql`COALESCE((SELECT s.fit_prob FROM scores s WHERE s.job_id = j.id AND s.profile_version = (SELECT MAX(version) FROM profile) ORDER BY s.created_at DESC LIMIT 1), 0) * 100 >= ${f.minScore}`);
  if (f.minSalaryLpa)
    parts.push(
      sql`COALESCE(COALESCE(j.salary_max, j.salary_min) * ${sql.raw(fxSqlCase("j.salary_currency"))}, (SELECT COALESCE(se2.high, se2.low) FROM salary_estimates se2 WHERE se2.job_id = j.id)) >= ${f.minSalaryLpa * 100000}`,
    );
  return sql.join(parts, sql` AND `);
}

export async function hybridSearch(q: string, f: SearchFilters = {}, opts: SearchOpts = {}): Promise<SearchResult> {
  const t0 = Date.now();
  const limit = Math.max(1, Math.floor(opts.limit ?? 30));
  const offset = Math.max(0, Math.floor(opts.offset ?? 0));
  const candidates = Math.max(limit, Math.min(500, Math.floor(opts.candidates ?? 200)));
  const query = q.trim().slice(0, 300);
  if (!query) return { hits: [], mode: "keyword", ms: 0, total: 0, offset };
  const vec = await embedQuery(query);
  const where = filterSql(f);
  const vecLit = vec ? `[${vec.map((x) => x.toFixed(6)).join(",")}]` : null;
  const vecCte = vecLit
    ? sql`, vec AS (
        SELECT id, row_number() OVER (ORDER BY d, id DESC) AS rk FROM (
          SELECT j.id, j.embedding <=> ${vecLit}::vector AS d FROM jobs j WHERE ${where} AND j.embedding IS NOT NULL ORDER BY d, j.id DESC LIMIT ${candidates}
        ) v)`
    : sql`, vec AS (SELECT NULL::bigint AS id, NULL::bigint AS rk WHERE false)`;
  const r = await db.transaction(async (tx) => {
    if (vecLit) await tx.execute(sql`SET LOCAL hnsw.iterative_scan = relaxed_order`);
    return tx.execute(sql`
    ${WITH_CS},
    tq0 AS (SELECT websearch_to_tsquery('english', ${query}) AS q),
    hit0 AS (SELECT EXISTS (SELECT 1 FROM jobs j, tq0 WHERE ${where} AND j.search_tsv @@ tq0.q) AS has_hit),
    tq AS (SELECT CASE WHEN (SELECT has_hit FROM hit0) THEN q ELSE CAST(replace(CAST(q AS text), ' & ', ' | ') AS tsquery) END AS q FROM tq0),
    fts AS (
      SELECT id, rank, row_number() OVER (ORDER BY rank DESC, id DESC) AS rk FROM (
        SELECT j.id, ts_rank_cd(j.search_tsv, tq.q) AS rank FROM jobs j, tq WHERE ${where} AND j.search_tsv @@ tq.q ORDER BY rank DESC, j.id DESC LIMIT ${candidates}
      ) f)
    ${vecCte},
    fused_all AS (
      SELECT COALESCE(fts.id, vec.id) AS id, fts.rk AS frk, vec.rk AS vrk,
        COALESCE(1.0 / (60 + fts.rk), 0) + COALESCE(1.0 / (60 + vec.rk), 0) AS rrf
      FROM fts FULL OUTER JOIN vec ON vec.id = fts.id),
    fused AS (SELECT *, COUNT(*) OVER () AS total FROM fused_all ORDER BY rrf DESC, id ASC LIMIT ${limit} OFFSET ${offset})
    SELECT ${JOB_COLS}, fused.frk, fused.vrk, fused.rrf, fused.total AS fused_total,
      ${vecLit ? sql`CASE WHEN j.embedding IS NOT NULL THEN 1 - (j.embedding <=> ${vecLit}::vector) END` : sql`NULL::float`} AS similarity,
      CASE WHEN fused.frk IS NOT NULL THEN ts_headline('english', left(j.title || '. ' || regexp_replace(j.description_md, '[#*_>\`|-]+', ' ', 'g'), 20000), (SELECT q FROM tq),
        'StartSel=<<, StopSel=>>, MaxWords=26, MinWords=12, MaxFragments=2, FragmentDelimiter= … ') END AS headline
    FROM fused JOIN jobs j ON j.id = fused.id ${JOB_JOINS}
    ORDER BY fused.rrf DESC, j.id ASC`);
  });
  const base = mapJobs(r);
  const raw = r as unknown as Record<string, unknown>[];
  const hits = base.map((b, i) => ({
    ...b,
    headline: (raw[i].headline as string) ?? null,
    similarity: raw[i].similarity == null ? null : Number(raw[i].similarity),
    ftsRank: raw[i].frk == null ? null : Number(raw[i].frk),
    vecRank: raw[i].vrk == null ? null : Number(raw[i].vrk),
    rrf: Number(raw[i].rrf),
  }));
  if (!hits.length && offset > 0) {
    const first = await hybridSearch(q, f, { limit: 1, offset: 0, candidates });
    if (first.total > 0) {
      const last = Math.floor((first.total - 1) / limit) * limit;
      return hybridSearch(q, f, { limit, offset: last, candidates });
    }
    return { ...first, hits: [], offset: 0 };
  }
  const total = raw.length ? Number(raw[0].fused_total) : 0;
  return { hits, mode: vecLit ? "hybrid" : "keyword", ms: Date.now() - t0, total, offset };
}
