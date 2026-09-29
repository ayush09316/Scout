import "server-only";
import { sql } from "drizzle-orm";
import { db } from "../db";
import { companyKey } from "../format";
import { getCompanyIntel, getSkillGaps } from "../intel";
import { hybridSearch } from "../search";
import { runReadOnlySql } from "./sql-guard";

export const TOOL_DECLS = [
  {
    name: "run_sql",
    description: "Run one read-only SELECT/WITH query against the job-market database. Max 200 rows, 3s timeout. Prefer aggregates.",
    parameters: { type: "OBJECT", properties: { query: { type: "STRING", description: "A single SELECT or WITH statement" } }, required: ["query"] },
  },
  {
    name: "search_jobs",
    description: "Hybrid keyword + semantic search over open jobs. Use for 'find roles like…' questions.",
    parameters: {
      type: "OBJECT",
      properties: {
        query: { type: "STRING" },
        remote: { type: "STRING", enum: ["any", "remote", "onsite"] },
        location: { type: "STRING", description: "City, e.g. Bengaluru" },
        min_salary_lpa: { type: "NUMBER" },
      },
      required: ["query"],
    },
  },
  {
    name: "get_company_stats",
    description: "Hiring stats for one company: open roles, 30-day opened/closed, weekly velocity, top skills, locations, remote share, median salary.",
    parameters: { type: "OBJECT", properties: { company: { type: "STRING" } }, required: ["company"] },
  },
  {
    name: "get_skill_gaps",
    description: "The user's skill gaps: which missing skills would unlock the most job matches.",
    parameters: { type: "OBJECT", properties: { limit: { type: "NUMBER" } } },
  },
];

export type ToolName = "run_sql" | "search_jobs" | "get_company_stats" | "get_skill_gaps";

async function resolveCompany(name: string) {
  const key = companyKey(name);
  const direct = await getCompanyIntel(key);
  if (direct) return direct;
  const r = await db.execute(sql`SELECT company_name FROM jobs WHERE company_name ILIKE ${"%" + name + "%"} GROUP BY 1 ORDER BY COUNT(*) DESC LIMIT 1`);
  const n = (r as unknown as { company_name: string }[])[0]?.company_name;
  return n ? getCompanyIntel(companyKey(n)) : null;
}

export async function runTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case "run_sql":
      return runReadOnlySql(String(args.query ?? ""));
    case "search_jobs": {
      const r = await hybridSearch(String(args.query ?? ""), {
        remote: (args.remote as "any" | "remote" | "onsite") ?? "any",
        location: typeof args.location === "string" ? args.location : "",
        minSalaryLpa: Number(args.min_salary_lpa ?? 0) || 0,
      }, 10);
      return {
        mode: r.mode,
        results: r.hits.map((h) => ({ id: h.id, title: h.title, company: h.companyName, location: h.location, remote: h.remote, fit: h.fitProb == null ? null : Math.round(h.fitProb * 100), similarity: h.similarity == null ? null : Math.round(h.similarity * 100), salary: h.salary ? `${h.salary.low}-${h.salary.high ?? ""} ${h.salary.currency} (${h.salary.kind})` : null })),
      };
    }
    case "get_company_stats": {
      const c = await resolveCompany(String(args.company ?? ""));
      if (!c) return { error: `No company found for "${args.company}"` };
      return { ...c, velocity: c.velocity.slice(-12) };
    }
    case "get_skill_gaps": {
      const g = await getSkillGaps(Math.min(25, Number(args.limit ?? 10) || 10));
      return { profile_version: g.version, gaps: g.gaps.map((x) => ({ skill: x.skill, jobs_unlocked: x.jobsUnlocked, jobs_mentioning: x.jobsMentioning, avg_fit_gain: x.avgFitGain, examples: x.examples.map((e) => `${e.title} @ ${e.companyName} (#${e.id})`) })) };
    }
    default:
      throw new Error(`Unknown tool ${name}`);
  }
}
