import "server-only";
import { rawSql } from "../db";

export const SQL_TABLES = ["jobs", "companies", "scores", "feedback", "company_stats", "skill_gaps", "salary_estimates", "job_events"] as const;
const ALLOWED = new Set<string>(SQL_TABLES);
const MAX_ROWS = 200;

const FORBIDDEN_WORDS = /\b(insert|update|delete|drop|alter|create|truncate|grant|revoke|copy|vacuum|analyze|comment|merge|call|do|execute|prepare|deallocate|listen|unlisten|notify|lock|set|reset|refresh|reindex|cluster|discard|checkpoint|load|into|security|owner|begin|commit|rollback|savepoint)\b/i;
const FORBIDDEN_FNS = /\b(pg_\w*|information_schema|current_setting|set_config|dblink\w*|lo_\w+|txid_\w*|nextval|setval|currval|query_to_xml\w*|xpath|file_fdw|version)\b/i;

export type SqlResult = { columns: string[]; rows: Record<string, unknown>[]; rowCount: number; truncated: boolean; query: string };

export function checkSql(input: string): { ok: true; sql: string } | { ok: false; error: string } {
  let q = input.trim().replace(/;\s*$/, "").trim();
  if (!q) return { ok: false, error: "Empty query" };
  if (q.length > 4000) return { ok: false, error: "Query too long" };
  if (q.includes(";")) return { ok: false, error: "Only a single statement is allowed" };
  if (/--|\/\*/.test(q)) return { ok: false, error: "Comments are not allowed" };
  if (!/^(select|with)\b/i.test(q)) return { ok: false, error: "Only SELECT or WITH queries are allowed" };
  const stripped = q.replace(/'(?:[^']|'')*'/g, "''");
  if (FORBIDDEN_WORDS.test(stripped)) return { ok: false, error: `Forbidden keyword: ${stripped.match(FORBIDDEN_WORDS)![0]}` };
  if (FORBIDDEN_FNS.test(stripped)) return { ok: false, error: `Forbidden function or schema: ${stripped.match(FORBIDDEN_FNS)![0]}` };
  if (/"/.test(stripped)) return { ok: false, error: "Quoted identifiers are not allowed" };
  const ctes = new Set([...stripped.matchAll(/(?:with|,)\s*([a-z_][a-z0-9_]*)\s+as\s*\(/gi)].map((m) => m[1].toLowerCase()));
  for (const m of stripped.matchAll(/\b(?:from|join)\s+([a-z_][a-z0-9_.]*)/gi)) {
    const t = m[1].toLowerCase();
    if (t.includes(".")) return { ok: false, error: `Schema-qualified names are not allowed: ${t}` };
    if (!ALLOWED.has(t) && !ctes.has(t) && !["lateral", "unnest", "generate_series", "jsonb_array_elements", "jsonb_array_elements_text", "jsonb_each", "jsonb_each_text", "jsonb_object_keys"].includes(t))
      return { ok: false, error: `Table not allowed: ${t}. Allowed: ${SQL_TABLES.join(", ")}` };
  }
  q = `SELECT * FROM (${q}) AS _scout_q LIMIT ${MAX_ROWS}`;
  return { ok: true, sql: q };
}

function relations(plan: unknown, out = new Set<string>()) {
  if (Array.isArray(plan)) plan.forEach((p) => relations(p, out));
  else if (plan && typeof plan === "object") {
    for (const [k, v] of Object.entries(plan)) {
      if (k === "Relation Name" && typeof v === "string") out.add(v);
      else relations(v, out);
    }
  }
  return out;
}

function cell(v: unknown): unknown {
  if (v == null) return null;
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "bigint") return Number(v);
  if (typeof v === "string") return v.length > 240 ? v.slice(0, 240) + "…" : v;
  if (typeof v === "object") {
    const s = JSON.stringify(v);
    return s.length > 240 ? s.slice(0, 240) + "…" : v;
  }
  return v;
}

export async function runReadOnlySql(input: string): Promise<SqlResult> {
  const c = checkSql(input);
  if (!c.ok) throw new Error(c.error);
  const rows = await rawSql.begin("read only", async (tx) => {
    await tx.unsafe("SET LOCAL statement_timeout = '3s'");
    const plan = await tx.unsafe(`EXPLAIN (FORMAT JSON) ${c.sql}`);
    const rels = relations((plan as unknown as Record<string, unknown>[])[0]?.["QUERY PLAN"]);
    const bad = [...rels].filter((r) => !ALLOWED.has(r));
    if (bad.length) throw new Error(`Table not allowed: ${bad.join(", ")}`);
    return tx.unsafe(c.sql);
  });
  const list = rows as unknown as Record<string, unknown>[];
  const columns = list.length ? Object.keys(list[0]) : ((rows as unknown as { columns?: { name: string }[] }).columns ?? []).map((x) => x.name);
  return {
    columns,
    rows: list.slice(0, 50).map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, cell(v)]))),
    rowCount: list.length,
    truncated: list.length > 50,
    query: input.trim().replace(/;\s*$/, ""),
  };
}

export const SCHEMA_DOC = `Postgres tables (read-only):
jobs(id, source, company_id, company_name, url, title, location, remote bool, seniority text [junior|mid|senior|staff|lead], min_exp, max_exp, salary_min int INR/yr, salary_max, salary_currency, description_md, posted_at, first_seen_at, last_seen_at, closed_at [NULL = open], is_canonical bool [filter is_canonical AND closed_at IS NULL for open jobs], search_tsv tsvector)
companies(id, name, ats, slug, tier smallint 1-3, active)
scores(job_id, profile_version, model, fit_prob real 0-1, final_score, reasons jsonb[], missing_skills jsonb[], created_at) — use the latest profile_version = (SELECT MAX(profile_version) FROM scores)
feedback(job_id, action [up|down|saved|applied|interview|offer|rejected], note, at)
company_stats(company_key, company_name, open_jobs, opened_30d, closed_30d, velocity_series jsonb, top_skills jsonb, locations jsonb, remote_share real, seniority_mix jsonb, median_salary_inr, matches, updated_at)
skill_gaps(profile_version, skill, jobs_mentioning, jobs_unlocked, avg_fit_gain, example_job_ids jsonb)
salary_estimates(job_id, low int INR/yr, high, currency, confidence 0-1, n_comparables, basis jsonb, model, created_at)
job_events(job_id, kind [opened|changed|closed|reopened|salary_changed], detail jsonb {from:{salary_min,salary_max}, to:{...}, direction}, at)
Salaries are INR per year; 1 LPA = 100000. Full-text: search_tsv @@ websearch_to_tsquery('english', '...'). Location is free text; match cities with ILIKE (Bengaluru also appears as Bangalore).`;
