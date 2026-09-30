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
};

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : typeof v === "string" && v !== "" && !isNaN(Number(v)) ? Number(v) : null);

export async function getLandingStats(): Promise<LandingStats> {
  try {
    const r = (await db.execute(sql`
      SELECT
        (SELECT COUNT(*)::int FROM jobs WHERE closed_at IS NULL AND is_canonical) AS open_jobs,
        (SELECT COUNT(*)::int FROM companies) AS companies,
        (SELECT COUNT(DISTINCT source)::int FROM jobs) AS sources,
        (SELECT finished_at FROM runs WHERE status = 'ok' AND finished_at IS NOT NULL ORDER BY finished_at DESC LIMIT 1) AS last_run,
        (SELECT counts FROM runs WHERE status = 'ok' AND finished_at IS NOT NULL ORDER BY finished_at DESC LIMIT 1) AS counts`)) as unknown as {
      open_jobs: number;
      companies: number;
      sources: number;
      last_run: Date | string | null;
      counts: Record<string, unknown> | null;
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
      funnel: fetched && duplicates != null && india != null && ranked != null ? { fetched, duplicates, india, ranked, delivered: delivered ?? 0 } : null,
    };
  } catch {
    return { openJobs: null, companies: null, sources: null, lastRunAt: null, funnel: null };
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
