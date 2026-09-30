import "server-only";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { getInbox, type JobListItem } from "./queries";

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
    const jobs = await getInbox();
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
