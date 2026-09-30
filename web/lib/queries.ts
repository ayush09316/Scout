import "server-only";
import { sql } from "drizzle-orm";
import { db } from "./db";
import type { EvalReport, FeedbackAction, Preferences, RunCounts, RunError } from "./db/schema";
import { companyKey, type Salary } from "./format";

export type JobListItem = {
  id: number;
  title: string;
  companyName: string;
  companyDomain: string | null;
  url: string;
  location: string | null;
  remote: boolean;
  seniority: string | null;
  source: string;
  postedAt: string | null;
  firstSeenAt: string;
  fitProb: number | null;
  finalScore: number | null;
  reasons: string[];
  missingSkills: string[];
  model: string | null;
  lastAction: FeedbackAction | null;
  companyKey: string;
  salary: Salary | null;
  badges: JobBadge[];
  closedAt: string | null;
};

export type JobBadge = "updated" | "reopened" | "salary_up" | "salary_down";

const rows = <T,>(r: unknown) => r as T[];

const CURRENT_SCORE = sql`
  SELECT DISTINCT ON (s.job_id) s.*
  FROM scores s
  WHERE s.profile_version = (SELECT COALESCE(MAX(version), 0) FROM profile)
  ORDER BY s.job_id, s.created_at DESC, s.id DESC`;

const safeNum = (e: string) => `CASE WHEN (${e}) ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN (${e})::numeric END`;

export const SALARY_JSON = sql.raw(`CASE
  WHEN j.salary_min IS NOT NULL THEN json_build_object('kind','actual','low',j.salary_min,'high',j.salary_max,'currency',COALESCE(j.salary_currency,'INR'))
  WHEN se.job_id IS NOT NULL THEN json_build_object('kind','estimate','low',se.low,'high',se.high,'currency',se.currency,'confidence',se.confidence,'n',se.n_comparables,'basis',se.basis,'model',se.model)
END AS salary`);

const salNew = `COALESCE(${safeNum("e.detail->'new'->>'max'")}, ${safeNum("e.detail->'new'->>'min'")}, ${safeNum("e.detail->'to'->>'salary_max'")}, 0)`;
const salOld = `COALESCE(${safeNum("e.detail->'old'->>'max'")}, ${safeNum("e.detail->'old'->>'min'")}, ${safeNum("e.detail->'from'->>'salary_max'")}, 0)`;

export const BADGES_SQL = sql.raw(`ARRAY(
  SELECT DISTINCT CASE
    WHEN e.kind = 'changed' THEN 'updated'
    WHEN e.kind = 'reopened' THEN 'reopened'
    WHEN e.detail->>'direction' = 'up' OR ${salNew} > ${salOld} THEN 'salary_up'
    ELSE 'salary_down' END
  FROM job_events e
  WHERE e.job_id = j.id AND e.at > now() - interval '14 days' AND e.kind IN ('changed','reopened','salary_changed')
) AS badges`);

export const COMPANY_KEY_SQL = sql.raw(`COALESCE(
  (SELECT k.company_key FROM company_stats k WHERE k.company_id = j.company_id LIMIT 1),
  (SELECT k.company_key FROM company_stats k WHERE lower(k.company_name) = lower(j.company_name) LIMIT 1),
  trim(both '-' from regexp_replace(lower(j.company_name), '[^a-z0-9]+', '-', 'g'))
) AS company_key`);

const LAST_ACTION = sql`
  SELECT DISTINCT ON (job_id) job_id, action, at FROM feedback ORDER BY job_id, at DESC, id DESC`;

function domainOf(url: string) {
  try {
    const h = new URL(url).hostname.replace(/^www\./, "");
    return /greenhouse|lever|ashbyhq|workable|remotive|remoteok|arbeitnow|ycombinator/.test(h) ? null : h;
  } catch {
    return null;
  }
}

type RawJob = {
  id: string | number;
  title: string;
  company_name: string;
  url: string;
  location: string | null;
  remote: boolean;
  seniority: string | null;
  source: string;
  posted_at: Date | string | null;
  first_seen_at: Date | string;
  fit_prob: number | null;
  final_score: number | null;
  reasons: string[] | null;
  missing_skills: string[] | null;
  model: string | null;
  last_action: FeedbackAction | null;
  salary?: Salary | null;
  badges?: JobBadge[] | null;
  closed_at?: Date | string | null;
  company_key?: string | null;
};

const iso = (d: Date | string | null) => (d == null ? null : new Date(d).toISOString());

function mapJob(r: RawJob): JobListItem {
  return {
    id: Number(r.id),
    title: r.title,
    companyName: r.company_name,
    companyDomain: domainOf(r.url),
    url: r.url,
    location: r.location,
    remote: r.remote,
    seniority: r.seniority,
    source: r.source,
    postedAt: iso(r.posted_at),
    firstSeenAt: iso(r.first_seen_at)!,
    fitProb: r.fit_prob == null ? null : Number(r.fit_prob),
    finalScore: r.final_score == null ? null : Number(r.final_score),
    reasons: r.reasons ?? [],
    missingSkills: r.missing_skills ?? [],
    model: r.model,
    lastAction: r.last_action,
    companyKey: r.company_key ?? companyKey(r.company_name),
    salary: r.salary ? { ...r.salary, low: Number(r.salary.low), high: r.salary.high == null ? null : Number(r.salary.high) } : null,
    badges: r.badges ?? [],
    closedAt: iso(r.closed_at ?? null),
  };
}

export async function getInbox(): Promise<JobListItem[]> {
  const r = await db.execute(sql`
    WITH cs AS (${CURRENT_SCORE}), la AS (${LAST_ACTION})
    SELECT j.id, j.title, j.company_name, j.url, j.location, j.remote, j.seniority, j.source, j.posted_at, j.first_seen_at,
      cs.fit_prob, cs.final_score, cs.reasons, cs.missing_skills, cs.model, la.action AS last_action, ${SALARY_JSON}, ${BADGES_SQL}, ${COMPANY_KEY_SQL}
    FROM jobs j
    JOIN cs ON cs.job_id = j.id
    LEFT JOIN la ON la.job_id = j.id
    LEFT JOIN salary_estimates se ON se.job_id = j.id
    WHERE j.closed_at IS NULL AND j.is_canonical AND la.action IS NULL
    ORDER BY cs.final_score DESC NULLS LAST
    LIMIT 300`);
  return rows<RawJob>(r).map(mapJob);
}

export async function searchJobsLike(q: string): Promise<JobListItem[]> {
  const like = `%${q}%`;
  const r = await db.execute(sql`
    WITH cs AS (${CURRENT_SCORE}), la AS (${LAST_ACTION})
    SELECT j.id, j.title, j.company_name, j.url, j.location, j.remote, j.seniority, j.source, j.posted_at, j.first_seen_at,
      cs.fit_prob, cs.final_score, cs.reasons, cs.missing_skills, cs.model, la.action AS last_action
    FROM jobs j
    LEFT JOIN cs ON cs.job_id = j.id
    LEFT JOIN la ON la.job_id = j.id
    WHERE j.is_canonical AND (j.title ILIKE ${like} OR j.company_name ILIKE ${like} OR j.location ILIKE ${like})
    ORDER BY cs.final_score DESC NULLS LAST
    LIMIT 12`);
  return rows<RawJob>(r).map(mapJob);
}

export type JobDetail = JobListItem & {
  descriptionMd: string;
  minExp: number | null;
  maxExp: number | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string | null;
  dedupGroupId: number | null;
  embedSim: number | null;
  fitScore: number | null;
  seniorityMatch: boolean | null;
  applyProb: number | null;
  latencyMs: number | null;
  scoreSeniority: string | null;
  profileVersion: number | null;
  scoredAt: string | null;
};

export async function getJob(id: number): Promise<JobDetail | null> {
  const r = await db.execute(sql`
    WITH cs AS (${CURRENT_SCORE}), la AS (${LAST_ACTION})
    SELECT j.*, cs.fit_prob, cs.final_score, cs.reasons, cs.missing_skills, cs.model, cs.embed_sim, cs.fit_score, cs.seniority_match,
      cs.apply_prob, cs.latency_ms, cs.seniority AS score_seniority, cs.profile_version, cs.created_at AS scored_at, la.action AS last_action, ${SALARY_JSON}, ${BADGES_SQL}, ${COMPANY_KEY_SQL}, ${COMPANY_KEY_SQL}
    FROM jobs j
    LEFT JOIN cs ON cs.job_id = j.id
    LEFT JOIN la ON la.job_id = j.id
    LEFT JOIN salary_estimates se ON se.job_id = j.id
    WHERE j.id = ${id}`);
  const x = rows<Record<string, unknown>>(r)[0];
  if (!x) return null;
  const num = (v: unknown) => (v == null ? null : Number(v));
  return {
    ...mapJob(x as unknown as RawJob),
    descriptionMd: String(x.description_md ?? ""),
    minExp: num(x.min_exp),
    maxExp: num(x.max_exp),
    salaryMin: num(x.salary_min),
    salaryMax: num(x.salary_max),
    salaryCurrency: (x.salary_currency as string) ?? null,
    closedAt: iso(x.closed_at as Date | null),
    dedupGroupId: num(x.dedup_group_id),
    embedSim: num(x.embed_sim),
    fitScore: num(x.fit_score),
    seniorityMatch: (x.seniority_match as boolean | null) ?? null,
    applyProb: num(x.apply_prob),
    latencyMs: num(x.latency_ms),
    scoreSeniority: (x.score_seniority as string) ?? null,
    profileVersion: num(x.profile_version),
    scoredAt: iso(x.scored_at as Date | null),
  };
}

export type FeedbackRow = { id: number; action: FeedbackAction; note: string | null; at: string };

export async function getFeedback(jobId: number): Promise<FeedbackRow[]> {
  const r = await db.execute(sql`SELECT id, action, note, at FROM feedback WHERE job_id = ${jobId} ORDER BY at DESC, id DESC`);
  return rows<{ id: string; action: FeedbackAction; note: string | null; at: Date }>(r).map((f) => ({ id: Number(f.id), action: f.action, note: f.note, at: iso(f.at)! }));
}

export async function getDuplicates(jobId: number, groupId: number | null) {
  if (groupId == null) return [];
  const r = await db.execute(sql`SELECT id, title, company_name, source, url, is_canonical FROM jobs WHERE dedup_group_id = ${groupId} AND id <> ${jobId} ORDER BY is_canonical DESC, id`);
  return rows<{ id: string; title: string; company_name: string; source: string; url: string; is_canonical: boolean }>(r).map((d) => ({
    id: Number(d.id),
    title: d.title,
    companyName: d.company_name,
    source: d.source,
    url: d.url,
    isCanonical: d.is_canonical,
  }));
}

export async function getCoverNotes(jobId: number) {
  const r = await db.execute(sql`SELECT id, body, model, created_at FROM cover_notes WHERE job_id = ${jobId} ORDER BY created_at DESC LIMIT 1`);
  const x = rows<{ id: string; body: string; model: string; created_at: Date }>(r)[0];
  return x ? { id: Number(x.id), body: x.body, model: x.model, createdAt: iso(x.created_at)! } : null;
}

export async function getProfile() {
  const r = await db.execute(sql`SELECT version, resume_md, preferences, created_at FROM profile ORDER BY version DESC LIMIT 1`);
  const x = rows<{ version: number; resume_md: string; preferences: Preferences; created_at: Date }>(r)[0];
  return x ? { version: x.version, resumeMd: x.resume_md, preferences: x.preferences ?? {}, createdAt: iso(x.created_at)! } : null;
}

export const TRACKER_STAGES = ["saved", "applied", "interview", "offer", "rejected"] as const;
export type TrackerStage = (typeof TRACKER_STAGES)[number];

export type TrackerCard = JobListItem & { stage: TrackerStage; movedAt: string };

export async function getTracker(): Promise<TrackerCard[]> {
  const r = await db.execute(sql`
    WITH cs AS (${CURRENT_SCORE}),
    st AS (SELECT DISTINCT ON (job_id) job_id, action, at FROM feedback
           WHERE action IN ('saved','applied','interview','offer','rejected') ORDER BY job_id, at DESC, id DESC)
    SELECT j.id, j.title, j.company_name, j.url, j.location, j.remote, j.seniority, j.source, j.posted_at, j.first_seen_at,
      cs.fit_prob, cs.final_score, cs.reasons, cs.missing_skills, cs.model, st.action AS last_action, st.at AS moved_at, j.closed_at, ${COMPANY_KEY_SQL}
    FROM st JOIN jobs j ON j.id = st.job_id LEFT JOIN cs ON cs.job_id = j.id
    ORDER BY st.at DESC`);
  return rows<RawJob & { moved_at: Date }>(r).map((x) => ({ ...mapJob(x), stage: x.last_action as TrackerStage, movedAt: iso(x.moved_at)! }));
}

export async function getFunnel() {
  const r = await db.execute(sql`
    SELECT action, COUNT(DISTINCT job_id)::int AS n FROM feedback WHERE action IN ('applied','interview','offer','rejected') GROUP BY action`);
  const m = Object.fromEntries(rows<{ action: string; n: number }>(r).map((x) => [x.action, x.n]));
  return { applied: m.applied ?? 0, interview: m.interview ?? 0, offer: m.offer ?? 0, rejected: m.rejected ?? 0 };
}

export type LabelItem = JobListItem & { descriptionMd: string };

export async function getLabelQueue(): Promise<{ queue: LabelItem[]; labeled: number; fit: number; recent: { jobId: number; label: string }[] }> {
  const q = await db.execute(sql`
    WITH cs AS (${CURRENT_SCORE})
    SELECT j.id, j.title, j.company_name, j.url, j.location, j.remote, j.seniority, j.source, j.posted_at, j.first_seen_at, j.description_md,
      cs.fit_prob, cs.final_score, cs.reasons, cs.missing_skills, cs.model, NULL AS last_action
    FROM jobs j LEFT JOIN cs ON cs.job_id = j.id
    WHERE j.is_canonical AND NOT EXISTS (SELECT 1 FROM labels l WHERE l.job_id = j.id)
    ORDER BY md5(j.id::text) LIMIT 50`);
  const c = await db.execute(sql`SELECT COUNT(*)::int AS n, COUNT(*) FILTER (WHERE label = 'fit')::int AS fit FROM labels`);
  const recent = await db.execute(sql`SELECT job_id, label FROM labels ORDER BY at DESC LIMIT 20`);
  const counts = rows<{ n: number; fit: number }>(c)[0];
  return {
    queue: rows<RawJob & { description_md: string }>(q).map((x) => ({ ...mapJob(x), descriptionMd: x.description_md })),
    labeled: counts.n,
    fit: counts.fit,
    recent: rows<{ job_id: string; label: string }>(recent).map((x) => ({ jobId: Number(x.job_id), label: x.label })),
  };
}

export type RunRow = { id: number; startedAt: string; finishedAt: string | null; status: string; counts: RunCounts; timings: { stage: string; s: number }[]; errors: RunError[]; costUsd: number };

export async function getRuns(limit = 30): Promise<RunRow[]> {
  const r = await db.execute(sql`SELECT * FROM runs ORDER BY started_at DESC LIMIT ${limit}`);
  return rows<{ id: string; started_at: Date; finished_at: Date | null; status: string; counts: RunCounts; errors: RunError[]; cost_usd: string }>(r)
    .map((x) => ({ id: Number(x.id), startedAt: iso(x.started_at)!, finishedAt: iso(x.finished_at), status: x.status, counts: normalizeCounts(x.counts), timings: stageTimings(x.counts), errors: normalizeErrors(x.errors), costUsd: Number(x.cost_usd) }))
    .reverse();
}

function num(v: unknown): number | undefined {
  return typeof v === "number" ? v : undefined;
}

function normalizeCounts(raw: unknown): RunCounts {
  const c = (raw ?? {}) as Record<string, unknown>;
  const fetched = typeof c.fetched === "object" && c.fetched !== null
    ? num(c.fetched_total) ?? Object.values(c.fetched as Record<string, number>).reduce((a, b) => a + b, 0)
    : num(c.fetched) ?? num(c.fetched_total);
  return {
    fetched,
    new: num(c.new) ?? num(c.inserted),
    updated: num(c.updated),
    closed: num(c.closed),
    deduped: num(c.deduped) ?? num(c.duplicates),
    filtered: num(c.filtered) ?? num(c.filtered_in),
    scored: num(c.scored),
    notified: num(c.notified),
    versions: num(c.versions) ?? num(sub(c.tracking, "versions")),
    events: num(c.events) ?? sumOf(c.tracking, ["opened", "changed", "closed", "reopened", "salary_changed"]),
    salary_estimates: num(c.salary_estimates) ?? num(sub(c.salary, "estimated")),
    company_stats: num(c.company_stats) ?? num(sub(c.company_stats, "rows")),
    skill_gaps: num(c.skill_gaps) ?? num(sub(c.skill_gaps, "skills")),
    reminders_sent: num(c.reminders_sent) ?? num(sub(c.reminders_sent, "sent")),
  };
}

function sub(v: unknown, k: string): unknown {
  return v && typeof v === "object" ? (v as Record<string, unknown>)[k] : undefined;
}

function sumOf(v: unknown, keys: string[]): number | undefined {
  if (!v || typeof v !== "object") return undefined;
  const vals = keys.map((k) => (v as Record<string, unknown>)[k]).filter((x): x is number => typeof x === "number");
  return vals.length ? vals.reduce((a, b) => a + b, 0) : undefined;
}

const STAGE_LABELS: Record<string, string> = {
  fetch: "Fetch",
  dedup: "Dedup",
  embed: "Embed",
  score: "Score",
  salary: "Salary est.",
  skill_gaps: "Skill gaps",
  company_stats: "Company stats",
  reminders: "Reminders",
  reminders_sent: "Reminders sent",
  digest_lines: "Digest",
  workable_from_india: "India filter",
  normalize: "Normalize",
  notify: "Notify",
  tracking: "Tracking",
};

export function stageLabel(key: string) {
  if (STAGE_LABELS[key]) return STAGE_LABELS[key];
  const t = key.replace(/_/g, " ");
  return t[0]?.toUpperCase() + t.slice(1);
}

export function stageTimings(raw: unknown): { stage: string; s: number }[] {
  const c = (raw ?? {}) as Record<string, unknown>;
  return Object.entries(c)
    .filter(([k, v]) => k.endsWith("_s") && typeof v === "number" && k !== "duration_s")
    .map(([k, v]) => ({ stage: stageLabel(k.slice(0, -2)), s: v as number }))
    .sort((a, b) => b.s - a.s);
}

function normalizeErrors(raw: unknown): RunError[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((e) => {
    if (typeof e === "string") {
      const i = e.indexOf(":");
      return i > 0 ? { source: e.slice(0, i), message: e.slice(i + 1).trim() } : { source: "pipeline", message: e };
    }
    return e as RunError;
  });
}

function normalizeEval(raw: Record<string, unknown>): EvalReport {
  const scorers: EvalReport["scorers"] = {};
  for (const [name, m] of Object.entries((raw.scorers ?? {}) as Record<string, Record<string, number>>)) {
    scorers[name] = {
      p_at_10: m.p_at_10 ?? 0,
      recall_at_50: m.recall_at_50 ?? 0,
      ece: m.ece ?? 0,
      p50_ms: m.p50_ms ?? m.p50_latency_ms ?? 0,
      usd_per_1k: m.usd_per_1k ?? m.cost_per_1k_usd ?? 0,
    };
  }
  return { ...(raw as EvalReport), scorers, calibration: (raw.calibration as EvalReport["calibration"]) ?? [] };
}

export async function getLatestEval(): Promise<{ createdAt: string; report: EvalReport } | null> {
  const r = await db.execute(sql`SELECT created_at, report FROM eval_reports ORDER BY created_at DESC LIMIT 1`);
  const x = rows<{ created_at: Date; report: Record<string, unknown> }>(r)[0];
  return x ? { createdAt: iso(x.created_at)!, report: normalizeEval(x.report) } : null;
}

export async function getCompanies() {
  const r = await db.execute(sql`
    SELECT c.id, c.name, c.ats, c.slug, c.tier, c.active, c.last_fetched_at,
      (SELECT COUNT(*)::int FROM jobs j WHERE j.company_id = c.id AND j.closed_at IS NULL) AS open_jobs
    FROM companies c ORDER BY c.tier, c.name`);
  return rows<{ id: number; name: string; ats: string; slug: string; tier: number; active: boolean; last_fetched_at: Date | null; open_jobs: number }>(r).map((c) => ({
    id: c.id,
    name: c.name,
    ats: c.ats,
    slug: c.slug,
    tier: c.tier,
    active: c.active,
    lastFetchedAt: iso(c.last_fetched_at),
    openJobs: c.open_jobs,
  }));
}

export async function getNavCounts() {
  const r = await db.execute(sql`
    WITH la AS (${LAST_ACTION})
    SELECT
      (SELECT COUNT(*)::int FROM jobs j LEFT JOIN la ON la.job_id = j.id WHERE j.closed_at IS NULL AND j.is_canonical AND la.action IS NULL
         AND EXISTS (SELECT 1 FROM scores s WHERE s.job_id = j.id AND s.profile_version = (SELECT MAX(version) FROM profile))) AS inbox,
      (SELECT COUNT(*)::int FROM labels) AS labeled`);
  return rows<{ inbox: number; labeled: number }>(r)[0];
}

export type Briefing = { lastRunAt: string | null; since: string | null; newMatches: number; salaryChanges: number; reopened: number; closed: number; topGap?: { skill: string; unlocked: number } | null };

export async function getBriefing(): Promise<Briefing> {
  const r = await db.execute(sql`
    WITH r AS (SELECT started_at, finished_at FROM runs WHERE status = 'ok' AND finished_at IS NOT NULL ORDER BY started_at DESC LIMIT 1),
    cs AS (SELECT DISTINCT job_id FROM scores WHERE profile_version = (SELECT COALESCE(MAX(version), 0) FROM profile)),
    tr AS (SELECT DISTINCT ON (job_id) job_id, action FROM feedback WHERE action IN ('saved','applied','interview','offer','rejected') ORDER BY job_id, at DESC, id DESC)
    SELECT
      (SELECT started_at FROM r) AS since,
      (SELECT finished_at FROM r) AS last_run,
      (SELECT COUNT(*)::int FROM jobs j JOIN cs ON cs.job_id = j.id, r WHERE j.first_seen_at >= r.started_at AND j.is_canonical AND j.closed_at IS NULL) AS new_matches,
      (SELECT COUNT(DISTINCT e.job_id)::int FROM job_events e, r WHERE e.kind = 'salary_changed' AND e.at >= r.started_at
         AND (e.job_id IN (SELECT job_id FROM cs) OR e.job_id IN (SELECT job_id FROM tr))) AS salary_changes,
      (SELECT COUNT(DISTINCT e.job_id)::int FROM job_events e JOIN tr ON tr.job_id = e.job_id AND tr.action IN ('saved','applied','interview','offer'), r WHERE e.kind = 'reopened' AND e.at >= r.started_at) AS reopened,
      (SELECT COUNT(DISTINCT e.job_id)::int FROM job_events e JOIN tr ON tr.job_id = e.job_id AND tr.action IN ('saved','applied','interview','offer'), r WHERE e.kind = 'closed' AND e.at >= r.started_at) AS closed`);
  const x = rows<{ since: Date | null; last_run: Date | null; new_matches: number | null; salary_changes: number | null; reopened: number | null; closed: number | null }>(r)[0];
  return {
    since: iso(x?.since ?? null),
    lastRunAt: iso(x?.last_run ?? null),
    newMatches: x?.new_matches ?? 0,
    salaryChanges: x?.salary_changes ?? 0,
    reopened: x?.reopened ?? 0,
    closed: x?.closed ?? 0,
  };
}


export async function getFirstRunAt(): Promise<string | null> {
  const r = await db.execute(sql`SELECT MIN(started_at) AS at FROM runs`);
  return iso(rows<{ at: Date | null }>(r)[0]?.at ?? null);
}
