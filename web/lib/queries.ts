import "server-only";
import { sql } from "drizzle-orm";
import { db } from "./db";
import type { EvalReport, FeedbackAction, Preferences, RunCounts, RunError } from "./db/schema";

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
};

const rows = <T,>(r: unknown) => r as T[];

const CURRENT_SCORE = sql`
  SELECT DISTINCT ON (s.job_id) s.*
  FROM scores s
  WHERE s.profile_version = (SELECT COALESCE(MAX(version), 0) FROM profile)
  ORDER BY s.job_id, s.created_at DESC, s.id DESC`;

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
  };
}

export async function getInbox(): Promise<JobListItem[]> {
  const r = await db.execute(sql`
    WITH cs AS (${CURRENT_SCORE}), la AS (${LAST_ACTION})
    SELECT j.id, j.title, j.company_name, j.url, j.location, j.remote, j.seniority, j.source, j.posted_at, j.first_seen_at,
      cs.fit_prob, cs.final_score, cs.reasons, cs.missing_skills, cs.model, la.action AS last_action
    FROM jobs j
    JOIN cs ON cs.job_id = j.id
    LEFT JOIN la ON la.job_id = j.id
    WHERE j.closed_at IS NULL AND j.is_canonical AND la.action IS NULL
    ORDER BY cs.final_score DESC NULLS LAST
    LIMIT 300`);
  return rows<RawJob>(r).map(mapJob);
}

export async function searchJobs(q: string): Promise<JobListItem[]> {
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
  closedAt: string | null;
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
      cs.apply_prob, cs.latency_ms, cs.seniority AS score_seniority, cs.profile_version, cs.created_at AS scored_at, la.action AS last_action
    FROM jobs j
    LEFT JOIN cs ON cs.job_id = j.id
    LEFT JOIN la ON la.job_id = j.id
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
      cs.fit_prob, cs.final_score, cs.reasons, cs.missing_skills, cs.model, st.action AS last_action, st.at AS moved_at
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

export type RunRow = { id: number; startedAt: string; finishedAt: string | null; status: string; counts: RunCounts; errors: RunError[]; costUsd: number };

export async function getRuns(limit = 30): Promise<RunRow[]> {
  const r = await db.execute(sql`SELECT * FROM runs ORDER BY started_at DESC LIMIT ${limit}`);
  return rows<{ id: string; started_at: Date; finished_at: Date | null; status: string; counts: RunCounts; errors: RunError[]; cost_usd: string }>(r)
    .map((x) => ({ id: Number(x.id), startedAt: iso(x.started_at)!, finishedAt: iso(x.finished_at), status: x.status, counts: normalizeCounts(x.counts), errors: normalizeErrors(x.errors), costUsd: Number(x.cost_usd) }))
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
  };
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
