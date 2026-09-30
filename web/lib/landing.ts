import "server-only";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { getInbox, type Briefing, type JobListItem, type TrackerStage } from "./queries";
import type { Salary } from "./format";
import type { JobBadge } from "./queries";

export type LandingStats = {
  openJobs: number | null;
  companies: number | null;
  sources: number | null;
  lastRunAt: string | null;
  funnel: { fetched: number; duplicates: number; india: number; ranked: number; delivered: number } | null;
  runId: number | null;
  runRows: [string, number][];
};

const RUN_KEYS = ["fetched_total", "normalized", "inserted", "duplicates", "workable_from_india", "filtered_in", "scored", "notified", "duration_s"];

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v !== "" && !isNaN(Number(v)) ? Number(v) : null);

export async function getLandingStats(): Promise<LandingStats> {
  try {
    const r = (await db.execute(sql`
      SELECT
        (SELECT COUNT(*)::int FROM jobs WHERE closed_at IS NULL AND is_canonical) AS open_jobs,
        (SELECT COUNT(*)::int FROM companies) AS companies,
        (SELECT COUNT(DISTINCT source)::int FROM jobs) AS sources,
        (SELECT finished_at FROM runs WHERE status = 'ok' AND finished_at IS NOT NULL ORDER BY finished_at DESC LIMIT 1) AS last_run,
        (SELECT counts FROM runs WHERE status = 'ok' AND finished_at IS NOT NULL ORDER BY finished_at DESC LIMIT 1) AS counts,
        (SELECT id FROM runs WHERE status = 'ok' AND finished_at IS NOT NULL ORDER BY finished_at DESC LIMIT 1) AS run_id`)) as unknown as {
      open_jobs: number;
      companies: number;
      sources: number;
      last_run: Date | string | null;
      counts: Record<string, unknown> | null;
      run_id: number | string | null;
    }[];
    const row = r[0];
    const c = row?.counts ?? {};
    const fetched = num(c.fetched_total) ?? num(c.normalized);
    const duplicates = num(c.duplicates);
    const india = num(c.workable_from_india);
    const ranked = num(c.filtered_in) ?? num(c.prefiltered);
    const delivered = num(c.notified);
    return {
      openJobs: row?.open_jobs || null,
      companies: row?.companies || null,
      sources: row?.sources || null,
      lastRunAt: row?.last_run ? new Date(row.last_run).toISOString() : null,
      runId: num(row?.run_id),
      runRows: RUN_KEYS.flatMap((k): [string, number][] => {
        const v = num(c[k]);
        return v == null ? [] : [[k, v]];
      }),
      funnel: fetched && duplicates != null && india != null && ranked != null ? { fetched, duplicates, india, ranked, delivered: delivered ?? 0 } : null,
    };
  } catch {
    return { openJobs: null, companies: null, sources: null, lastRunAt: null, funnel: null, runId: null, runRows: [] };
  }
}

export async function getPreviewJobs(): Promise<JobListItem[] | null> {
  try {
    const jobs = await getInbox(50);
    const top = jobs.filter((j) => j.fitProb != null).slice(0, 4);
    return top.length >= 3 ? top : null;
  } catch {
    return null;
  }
}

export async function getTrackedCompanies(): Promise<string[]> {
  try {
    const r = (await db.execute(sql`
      SELECT c.name FROM companies c
      LEFT JOIN jobs j ON j.company_id = c.id AND j.closed_at IS NULL
      WHERE c.active
      GROUP BY c.id, c.name, c.tier
      ORDER BY c.tier ASC, COUNT(j.id) DESC, c.name ASC
      LIMIT 36`)) as unknown as { name: string }[];
    return [...new Set(r.map((x) => x.name.trim()).filter(Boolean))];
  } catch {
    return [];
  }
}

export async function getTopSkillGaps(): Promise<{ skill: string; unlocked: number }[]> {
  try {
    const { getSkillGaps } = await import("./intel");
    const { gaps } = await getSkillGaps(3);
    return gaps.filter((g) => g.jobsUnlocked > 0).map((g) => ({ skill: g.skill, unlocked: g.jobsUnlocked }));
  } catch {
    return [];
  }
}

export type MiniJob = JobListItem & { ago: string };

export type StackData = {
  jobs: MiniJob[] | null;
  counts: { top: number; maybe: number; all: number } | null;
  nav: { inbox: number; labeled: number } | null;
  briefing: Briefing | null;
  tracker: { cards: { id: number; title: string; companyName: string; companyDomain: string | null; stage: TrackerStage; days: number; fitProb: number | null }[]; funnel: { applied: number; interview: number; offer: number; rejected: number } } | null;
  job: {
    id: number;
    title: string;
    companyName: string;
    companyDomain: string | null;
    location: string | null;
    remote: boolean;
    seniority: string | null;
    minExp: number | null;
    maxExp: number | null;
    salary: Salary | null;
    badges: JobBadge[];
    source: string;
    ago: string;
    fitProb: number | null;
    fitScore: number | null;
    embedSim: number | null;
    applyProb: number | null;
    finalScore: number | null;
    model: string | null;
    latencyMs: number | null;
    profileVersion: number | null;
    seniorityMatch: boolean | null;
    scoreSeniority: string | null;
    reasons: string[];
    matched: string[];
    missing: string[];
    description: string;
  } | null;
  tailor: { before: number; after: number; added: string[]; sameJob: boolean } | null;
  health: {
    runs: { day: string; run: string; fetched: number; new: number; scored: number }[];
    tiles: { label: string; value: string; sub: string; tone?: "good" | "warn" }[];
    timings: { stage: string; s: number }[];
    errors: number;
  } | null;
};

export const EMPTY_STACK: StackData = { jobs: null, counts: null, nav: null, briefing: null, tracker: null, job: null, tailor: null, health: null };

const settle = async <T,>(p: Promise<T>): Promise<T | null> => {
  try {
    return await p;
  } catch {
    return null;
  }
};

export async function getStackData(): Promise<StackData> {
  const q = await import("./queries");
  const { timeAgo, daysSince } = await import("./utils");
  const now = Date.now();
  const [page, nav, briefing, cards, funnel, runs] = await Promise.all([settle(q.getInboxPage()), settle(q.getNavCounts()), settle(q.getBriefing()), settle(q.getTracker()), settle(q.getFunnel()), settle(q.getRuns(14))]);
  const gaps = await settle(getTopSkillGaps());
  const out: StackData = { ...EMPTY_STACK, nav: nav ?? null, briefing: briefing?.lastRunAt ? { ...briefing, topGap: gaps?.[0] ?? null } : null };
  const scored = page?.jobs.filter((j) => j.fitProb != null) ?? [];
  if (page && scored.length >= 3) {
    out.jobs = scored.slice(0, 4).map((j) => ({ ...j, ago: timeAgo(j.postedAt ?? j.firstSeenAt, now) }));
    out.counts = { top: page.jobs.filter((j) => (j.fitProb ?? 0) >= 0.7).length, maybe: page.jobs.filter((j) => (j.fitProb ?? 0) >= 0.4 && (j.fitProb ?? 0) < 0.7).length, all: page.jobs.length };
  }
  if (cards?.length && funnel) {
    const by = (st: TrackerStage) => cards.filter((c) => c.stage === st);
    out.tracker = {
      cards: (["saved", "applied", "interview", "offer", "rejected"] as TrackerStage[]).flatMap((st) => by(st).slice(0, 3)).map((c) => ({ id: c.id, title: c.title, companyName: c.companyName, companyDomain: c.companyDomain, stage: c.stage, days: daysSince(c.movedAt, now), fitProb: c.fitProb })),
      funnel,
    };
  }
  const top = out.jobs?.[0];
  if (top) {
    const [job, prof, variant] = await Promise.all([settle(q.getJob(top.id)), settle(q.getProfile()), settle(import("./intel").then((m) => m.getLatestVariant(top.id)))]);
    if (job) {
      const desc = job.descriptionMd.toLowerCase();
      const esc = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const matched = (prof?.preferences.skills ?? []).filter((x) => new RegExp(`(^|[^a-z])${esc(x.toLowerCase())}([^a-z]|$)`).test(desc));
      out.job = {
        id: job.id, title: job.title, companyName: job.companyName, companyDomain: job.companyDomain, location: job.location, remote: job.remote, seniority: job.seniority, minExp: job.minExp, maxExp: job.maxExp,
        salary: job.salary, badges: job.badges, source: job.source, ago: timeAgo(job.postedAt ?? job.firstSeenAt, now), fitProb: job.fitProb, fitScore: job.fitScore, embedSim: job.embedSim, applyProb: job.applyProb,
        finalScore: job.finalScore, model: job.model, latencyMs: job.latencyMs, profileVersion: job.profileVersion, seniorityMatch: job.seniorityMatch, scoreSeniority: job.scoreSeniority, reasons: job.reasons,
        matched, missing: job.missingSkills.filter((m) => !matched.includes(m)), description: job.descriptionMd.slice(0, 1400),
      };
    }
    if (variant) out.tailor = { before: variant.keywordBefore, after: variant.keywordAfter, added: variant.addedKeywords.slice(0, 4), sameJob: true };
  }
  if (!out.tailor) {
    const r = await settle(db.execute(sql`SELECT keyword_before, keyword_after, added_keywords FROM resume_variants ORDER BY created_at DESC LIMIT 1`) as unknown as Promise<{ keyword_before: number; keyword_after: number; added_keywords: string[] | null }[]>);
    const x = r?.[0];
    if (x) out.tailor = { before: Number(x.keyword_before), after: Number(x.keyword_after), added: (x.added_keywords ?? []).slice(0, 4), sameJob: false };
  }
  if (runs?.length) {
    const last = runs[runs.length - 1];
    const totalCost = runs.reduce((a, r) => a + r.costUsd, 0);
    const errors = runs.reduce((a, r) => a + r.errors.length, 0);
    out.health = {
      runs: runs.map((r) => ({ day: new Date(r.startedAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" }), run: `#${r.id}`, fetched: r.counts.fetched ?? 0, new: r.counts.new ?? 0, scored: r.counts.scored ?? 0 })),
      tiles: [
        { label: "Last run", value: `${timeAgo(last.startedAt, now)} ago`, sub: last.status, tone: last.status === "ok" ? "good" : "warn" },
        { label: "Jobs fetched", value: (last.counts.fetched ?? 0).toLocaleString("en-IN"), sub: `${last.counts.new ?? 0} new · ${last.counts.scored ?? 0} scored` },
        { label: `Spend · ${runs.length} runs`, value: `$${totalCost.toFixed(3)}`, sub: `$${(totalCost / Math.max(1, runs.length)).toFixed(4)} / run` },
        { label: `Errors · ${runs.length} runs`, value: String(errors), sub: errors ? "see Health" : "all clear" },
      ],
      timings: last.timings.slice(0, 6),
      errors,
    };
  }
  return out;
}
