import "server-only";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { BADGES_SQL, COMPANY_KEY_SQL, SALARY_JSON, type JobListItem } from "./queries";
import type { JobEventKind, PrepPack, ReminderKind, VelocityPoint } from "./db/schema";
import { fxSqlCase, type Salary } from "./format";
import { CITIES } from "./places";
import { SKILLS, displaySkill } from "./skills";
import { mapJobRow } from "./job-map";

const rows = <T,>(r: unknown) => r as T[];
const iso = (d: Date | string | null | undefined) => (d == null ? null : new Date(d).toISOString());
const n = (v: unknown) => (v == null ? null : Number(v));

const KEY_SQL = sql.raw(`trim(both '-' from regexp_replace(lower(j.company_name), '[^a-z0-9]+', '-', 'g'))`);

const CURRENT_SCORE = sql`
  SELECT DISTINCT ON (s.job_id) s.*
  FROM scores s
  WHERE s.profile_version = (SELECT COALESCE(MAX(version), 0) FROM profile)
  ORDER BY s.job_id, s.created_at DESC, s.id DESC`;

const LAST_ACTION = sql`SELECT DISTINCT ON (job_id) job_id, action, at FROM feedback ORDER BY job_id, at DESC, id DESC`;

export const JOB_COLS = sql`j.id, j.title, j.company_name, j.url, j.location, j.remote, j.seniority, j.source, j.posted_at, j.first_seen_at, j.closed_at,
  cs.fit_prob, cs.final_score, cs.reasons, cs.missing_skills, cs.model, la.action AS last_action, ${SALARY_JSON}, ${BADGES_SQL}, ${COMPANY_KEY_SQL}`;

export const JOB_JOINS = sql`LEFT JOIN cs ON cs.job_id = j.id LEFT JOIN la ON la.job_id = j.id LEFT JOIN salary_estimates se ON se.job_id = j.id`;

export const WITH_CS = sql`WITH cs AS (${CURRENT_SCORE}), la AS (${LAST_ACTION})`;

export function mapJobs(r: unknown): JobListItem[] {
  return rows<Record<string, unknown>>(r).map(mapJobRow);
}

export type SkillCount = { skill: string; count: number };

export type CompanyIntel = {
  key: string;
  name: string;
  domain: string | null;
  source: "stats" | "live";
  openJobs: number;
  opened30d: number;
  closed30d: number;
  velocity: VelocityPoint[];
  topSkills: SkillCount[];
  locations: { location: string; count: number }[];
  remoteShare: number;
  seniorityMix: Record<string, number>;
  medianSalary: number | null;
  matches: number;
  updatedAt: string | null;
};

function normList<T extends string>(raw: unknown, key: T): ({ count: number } & Record<T, string>)[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((x) => {
      if (typeof x === "string") return { [key]: x, count: 0 } as { count: number } & Record<T, string>;
      if (Array.isArray(x)) return { [key]: String(x[0]), count: Number(x[1] ?? 0) } as { count: number } & Record<T, string>;
      const o = x as Record<string, unknown>;
      return { [key]: String(o[key] ?? o.name ?? o.skill ?? o.location ?? ""), count: Number(o.count ?? o.n ?? 0) } as { count: number } & Record<T, string>;
    })
    .filter((x) => x[key]);
}

function normVelocity(raw: unknown): VelocityPoint[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((x, i) => {
    if (typeof x === "number") return { week: `W${i + 1}`, opened: x, closed: 0 };
    const o = x as Record<string, unknown>;
    return { week: String(o.week ?? o.week_start ?? `W${i + 1}`).slice(0, 10), opened: Number(o.opened ?? o.new ?? o.count ?? 0), closed: Number(o.closed ?? 0) };
  });
}

function domainOf(url: string | null) {
  if (!url) return null;
  try {
    const h = new URL(url).hostname.replace(/^www\./, "");
    return /greenhouse|lever|ashbyhq|workable|remotive|remoteok|arbeitnow|ycombinator/.test(h) ? null : h;
  } catch {
    return null;
  }
}

const SKILL_SQL = SKILLS.slice(0, 70).map((s) => ({ name: s.name, q: (s.name === "C++" ? "cplusplus" : s.name === "C#" ? "csharp" : s.name).replace(/[^A-Za-z0-9 ]/g, " ").trim() }));

async function liveSkillCounts(where: ReturnType<typeof sql>, limit = 10): Promise<SkillCount[]> {
  const cols = sql.join(
    SKILL_SQL.map((s, i) => sql`COUNT(*) FILTER (WHERE j.search_tsv @@ plainto_tsquery('english', ${s.q}))::int AS ${sql.raw(`s${i}`)}`),
    sql`, `,
  );
  const r = await db.execute(sql`SELECT ${cols} FROM jobs j WHERE ${where}`);
  const row = rows<Record<string, number>>(r)[0] ?? {};
  return SKILL_SQL.map((s, i) => ({ skill: s.name, count: Number(row[`s${i}`] ?? 0) }))
    .filter((x) => x.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

async function companyScope(key: string) {
  const statR = await db.execute(sql`SELECT * FROM company_stats WHERE company_key = ${key}`);
  const st = rows<Record<string, unknown>>(statR)[0] ?? null;
  const where = st
    ? st.company_id != null
      ? sql`(j.company_id = ${Number(st.company_id)} OR lower(j.company_name) = lower(${String(st.company_name)}))`
      : sql`lower(j.company_name) = lower(${String(st.company_name)})`
    : sql`${KEY_SQL} = ${key}`;
  return { st, where };
}

export async function getCompanyIntel(key: string): Promise<CompanyIntel | null> {
  const { st, where } = await companyScope(key);
  const baseR = await db.execute(sql`
    SELECT
      (array_agg(j.company_name ORDER BY j.last_seen_at DESC))[1] AS name,
      (array_agg(j.url ORDER BY j.last_seen_at DESC))[1] AS url,
      COUNT(*) FILTER (WHERE j.closed_at IS NULL AND j.is_canonical)::int AS open_jobs,
      COUNT(*) FILTER (WHERE j.first_seen_at > now() - interval '30 days' AND j.is_canonical)::int AS opened_30d,
      COUNT(*) FILTER (WHERE j.closed_at > now() - interval '30 days' AND j.is_canonical)::int AS closed_30d,
      COALESCE(AVG(CASE WHEN j.remote THEN 1 ELSE 0 END) FILTER (WHERE j.closed_at IS NULL AND j.is_canonical), 0)::float AS remote_share
    FROM jobs j WHERE ${where}`);
  const base = rows<{ name: string | null; url: string | null; open_jobs: number; opened_30d: number; closed_30d: number; remote_share: number }>(baseR)[0];
  if (!st && !base?.name) return null;

  const openWhere = sql`${where} AND j.closed_at IS NULL AND j.is_canonical`;
  if (st) {
    return {
      key,
      name: String(st.company_name),
      domain: domainOf(base?.url ?? null),
      source: "stats",
      openJobs: Number(st.open_jobs),
      opened30d: Number(st.opened_30d),
      closed30d: Number(st.closed_30d),
      velocity: normVelocity(st.velocity_series),
      topSkills: normList(st.top_skills, "skill").map((x) => ({ ...x, skill: displaySkill(x.skill) })),
      locations: normList(st.locations, "location"),
      remoteShare: Number(st.remote_share),
      seniorityMix: (st.seniority_mix as Record<string, number>) ?? {},
      medianSalary: n(st.median_salary_inr),
      matches: Number(st.matches),
      updatedAt: iso(st.updated_at as Date),
    };
  }

  const [velR, locR, senR, salR, matchR, skills] = await Promise.all([
    db.execute(sql`
      SELECT to_char(w, 'YYYY-MM-DD') AS week,
        (SELECT COUNT(*)::int FROM jobs j WHERE ${where} AND j.is_canonical AND j.first_seen_at >= w AND j.first_seen_at < w + interval '7 days') AS opened,
        (SELECT COUNT(*)::int FROM jobs j WHERE ${where} AND j.is_canonical AND j.closed_at >= w AND j.closed_at < w + interval '7 days') AS closed
      FROM generate_series(date_trunc('week', now()) - interval '11 weeks', date_trunc('week', now()), interval '7 days') w ORDER BY w`),
    db.execute(sql`SELECT COALESCE(NULLIF(j.location, ''), 'Unspecified') AS location, COUNT(*)::int AS count FROM jobs j WHERE ${openWhere} GROUP BY 1 ORDER BY 2 DESC LIMIT 5`),
    db.execute(sql`SELECT COALESCE(j.seniority, 'unknown') AS s, COUNT(*)::int AS c FROM jobs j WHERE ${openWhere} GROUP BY 1`),
    db.execute(sql`
      SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY v)::int AS median FROM (
        SELECT COALESCE((j.salary_min + COALESCE(j.salary_max, j.salary_min)) / 2 * ${sql.raw(fxSqlCase("j.salary_currency"))}, (se.low + se.high) / 2) AS v
        FROM jobs j LEFT JOIN salary_estimates se ON se.job_id = j.id
        WHERE ${openWhere}
      ) x WHERE v IS NOT NULL`),
    db.execute(sql`WITH cs AS (${CURRENT_SCORE}) SELECT COUNT(*)::int AS c FROM jobs j JOIN cs ON cs.job_id = j.id WHERE ${openWhere} AND cs.final_score >= 0.4`),
    liveSkillCounts(openWhere, 12),
  ]);
  return {
    key,
    name: base.name!,
    domain: domainOf(base.url),
    source: "live",
    openJobs: base.open_jobs,
    opened30d: base.opened_30d,
    closed30d: base.closed_30d,
    velocity: rows<VelocityPoint>(velR),
    topSkills: skills,
    locations: rows<{ location: string; count: number }>(locR),
    remoteShare: Number(base.remote_share),
    seniorityMix: Object.fromEntries(rows<{ s: string; c: number }>(senR).map((x) => [x.s, x.c])),
    medianSalary: n(rows<{ median: number | null }>(salR)[0]?.median),
    matches: rows<{ c: number }>(matchR)[0]?.c ?? 0,
    updatedAt: null,
  };
}

export async function getCompanyJobs(key: string, limit = 40): Promise<JobListItem[]> {
  const { where } = await companyScope(key);
  const r = await db.execute(sql`
    ${WITH_CS}
    SELECT ${JOB_COLS} FROM jobs j ${JOB_JOINS}
    WHERE ${where} AND j.closed_at IS NULL AND j.is_canonical
    ORDER BY cs.final_score DESC NULLS LAST, j.first_seen_at DESC, j.id DESC LIMIT ${limit}`);
  return mapJobs(r);
}

export type SkillGap = { skill: string; jobsMentioning: number; jobsUnlocked: number; avgFitGain: number; examples: { id: number; title: string; companyName: string }[]; updatedAt: string };

export async function getSkillGaps(limit = 25): Promise<{ version: number | null; gaps: SkillGap[] }> {
  const r = await db.execute(sql`
    SELECT g.*, (SELECT MAX(version) FROM profile) AS pv FROM skill_gaps g
    WHERE g.profile_version = (SELECT COALESCE(MAX(profile_version), 0) FROM skill_gaps WHERE profile_version <= COALESCE((SELECT MAX(version) FROM profile), 2147483647))
    ORDER BY g.jobs_unlocked DESC, g.avg_fit_gain DESC LIMIT ${limit}`);
  const gs = rows<{ skill: string; jobs_mentioning: number; jobs_unlocked: number; avg_fit_gain: number; example_job_ids: unknown; updated_at: Date; profile_version: number }>(r);
  const ids = [...new Set(gs.flatMap((g) => (Array.isArray(g.example_job_ids) ? g.example_job_ids.map(Number) : [])).filter(Number.isFinite))];
  const jobsR = ids.length
    ? await db.execute(sql`SELECT id, title, company_name FROM jobs WHERE id IN (${sql.join(ids.map((i) => sql`${i}`), sql`, `)})`)
    : [];
  const byId = new Map(rows<{ id: string; title: string; company_name: string }>(jobsR).map((j) => [Number(j.id), j]));
  return {
    version: gs[0]?.profile_version ?? null,
    gaps: gs.map((g) => ({
      skill: displaySkill(g.skill),
      jobsMentioning: Number(g.jobs_mentioning),
      jobsUnlocked: Number(g.jobs_unlocked),
      avgFitGain: Number(g.avg_fit_gain),
      updatedAt: iso(g.updated_at)!,
      examples: (Array.isArray(g.example_job_ids) ? g.example_job_ids.map(Number) : [])
        .map((id) => byId.get(id))
        .filter((j): j is NonNullable<typeof j> => !!j)
        .slice(0, 4)
        .map((j) => ({ id: Number(j.id), title: j.title, companyName: j.company_name })),
    })),
  };
}

export type MarketOverview = { openJobs: number; remoteShare: number; topSkills: SkillCount[]; cities: { city: string; count: number }[]; topCompanies: { name: string; key: string; count: number }[] };

export async function getMarketOverview(): Promise<MarketOverview> {
  const open = sql`j.closed_at IS NULL AND j.is_canonical`;
  const cityCols = sql.join(
    CITIES.map((c, i) => {
      const pats = c === "Bengaluru" ? ["%bengaluru%", "%bangalore%"] : c === "Gurugram" ? ["%gurugram%", "%gurgaon%"] : [`%${c.toLowerCase()}%`];
      return sql`COUNT(*) FILTER (WHERE ${sql.join(pats.map((p) => sql`j.location ILIKE ${p}`), sql` OR `)})::int AS ${sql.raw(`c${i}`)}`;
    }),
    sql`, `,
  );
  const [baseR, topR, skills] = await Promise.all([
    db.execute(sql`SELECT COUNT(*)::int AS open, COALESCE(AVG(CASE WHEN j.remote THEN 1 ELSE 0 END), 0)::float AS remote, ${cityCols} FROM jobs j WHERE ${open}`),
    db.execute(sql`SELECT j.company_name AS name, j.count, ${COMPANY_KEY_SQL} FROM (
      SELECT j.company_name, MIN(j.company_id) AS company_id, COUNT(*)::int AS count FROM jobs j WHERE ${open} GROUP BY 1 ORDER BY 3 DESC LIMIT 8) j`),
    liveSkillCounts(open, 12),
  ]);
  const b = rows<Record<string, number>>(baseR)[0] ?? {};
  return {
    openJobs: Number(b.open ?? 0),
    remoteShare: Number(b.remote ?? 0),
    topSkills: skills,
    cities: CITIES.map((c, i) => ({ city: c, count: Number(b[`c${i}`] ?? 0) })).filter((c) => c.count > 0).sort((a, b) => b.count - a.count),
    topCompanies: rows<{ name: string; count: number; company_key: string }>(topR).map((c) => ({ name: c.name, count: c.count, key: c.company_key })),
  };
}

export type JobEvent = { id: number; kind: JobEventKind; detail: Record<string, unknown>; at: string };
export type JobVersion = { id: number; title: string; location: string | null; salaryMin: number | null; salaryMax: number | null; descriptionMd: string; capturedAt: string };

export async function getJobHistory(jobId: number): Promise<{ events: JobEvent[]; versions: JobVersion[] }> {
  const [e, v] = await Promise.all([
    db.execute(sql`SELECT id, kind, detail, at FROM job_events WHERE job_id = ${jobId} ORDER BY at DESC, id DESC LIMIT 100`),
    db.execute(sql`SELECT id, title, location, salary_min, salary_max, description_md, captured_at FROM job_versions WHERE job_id = ${jobId} ORDER BY captured_at DESC, id DESC LIMIT 30`),
  ]);
  return {
    events: rows<{ id: string; kind: JobEventKind; detail: Record<string, unknown> | null; at: Date }>(e).map((x) => ({ id: Number(x.id), kind: x.kind, detail: x.detail ?? {}, at: iso(x.at)! })),
    versions: rows<{ id: string; title: string; location: string | null; salary_min: number | null; salary_max: number | null; description_md: string; captured_at: Date }>(v).map((x) => ({
      id: Number(x.id),
      title: x.title,
      location: x.location,
      salaryMin: n(x.salary_min),
      salaryMax: n(x.salary_max),
      descriptionMd: x.description_md,
      capturedAt: iso(x.captured_at)!,
    })),
  };
}

export type ReminderItem = { id: number; jobId: number; kind: ReminderKind; dueAt: string; draft: string | null; sentAt: string | null; title: string; companyName: string };

export async function getDueReminders(): Promise<ReminderItem[]> {
  try {
    const r = await db.execute(sql`
      SELECT r.id, r.job_id, r.kind, r.due_at, r.draft, r.sent_at, j.title, j.company_name
      FROM reminders r JOIN jobs j ON j.id = r.job_id
      WHERE r.dismissed_at IS NULL AND (r.sent_at IS NOT NULL OR r.due_at <= now())
      ORDER BY r.due_at DESC LIMIT 30`);
    return rows<{ id: string; job_id: string; kind: ReminderKind; due_at: Date; draft: string | null; sent_at: Date | null; title: string; company_name: string }>(r).map((x) => ({
      id: Number(x.id),
      jobId: Number(x.job_id),
      kind: x.kind,
      dueAt: iso(x.due_at)!,
      draft: x.draft,
      sentAt: iso(x.sent_at),
      title: x.title,
      companyName: x.company_name,
    }));
  } catch {
    return [];
  }
}

export async function getLatestVariant(jobId: number) {
  const r = await db.execute(sql`SELECT * FROM resume_variants WHERE job_id = ${jobId} ORDER BY created_at DESC, id DESC LIMIT 1`);
  const x = rows<{ id: string; body_md: string; keyword_before: number; keyword_after: number; added_keywords: string[]; model: string; created_at: Date; profile_version: number }>(r)[0];
  return x
    ? { id: Number(x.id), bodyMd: x.body_md, keywordBefore: Number(x.keyword_before), keywordAfter: Number(x.keyword_after), addedKeywords: x.added_keywords ?? [], model: x.model, createdAt: iso(x.created_at)!, profileVersion: x.profile_version }
    : null;
}

export async function getLatestPack(jobId: number) {
  const r = await db.execute(sql`SELECT id, body, model, created_at FROM interview_packs WHERE job_id = ${jobId} ORDER BY created_at DESC, id DESC LIMIT 1`);
  const x = rows<{ id: string; body: PrepPack; model: string; created_at: Date }>(r)[0];
  return x ? { id: Number(x.id), body: x.body, model: x.model, createdAt: iso(x.created_at)! } : null;
}

export type { Salary };
