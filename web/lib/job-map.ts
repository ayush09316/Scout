import { companyKey, type Salary } from "./format";
import type { JobBadge, JobListItem } from "./queries";
import type { FeedbackAction } from "./db/schema";

const iso = (d: unknown) => (d == null ? null : new Date(d as string).toISOString());

function domainOf(url: string) {
  try {
    const h = new URL(url).hostname.replace(/^www\./, "");
    return /greenhouse|lever|ashbyhq|workable|remotive|remoteok|arbeitnow|ycombinator/.test(h) ? null : h;
  } catch {
    return null;
  }
}

export function mapJobRow(r: Record<string, unknown>): JobListItem {
  const s = r.salary as Salary | null | undefined;
  return {
    id: Number(r.id),
    title: String(r.title),
    companyName: String(r.company_name),
    companyDomain: domainOf(String(r.url)),
    url: String(r.url),
    location: (r.location as string) ?? null,
    remote: !!r.remote,
    seniority: (r.seniority as string) ?? null,
    source: String(r.source),
    postedAt: iso(r.posted_at),
    firstSeenAt: iso(r.first_seen_at)!,
    fitProb: r.fit_prob == null ? null : Number(r.fit_prob),
    finalScore: r.final_score == null ? null : Number(r.final_score),
    reasons: (r.reasons as string[]) ?? [],
    missingSkills: (r.missing_skills as string[]) ?? [],
    model: (r.model as string) ?? null,
    lastAction: (r.last_action as FeedbackAction) ?? null,
    companyKey: (r.company_key as string) ?? companyKey(String(r.company_name)),
    salary: s ? { ...s, low: Number(s.low), high: s.high == null ? null : Number(s.high) } : null,
    badges: (r.badges as JobBadge[]) ?? [],
    closedAt: iso(r.closed_at),
  };
}
