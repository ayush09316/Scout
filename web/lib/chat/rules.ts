import "server-only";
import { CITIES } from "../places";
import { SKILLS } from "../skills";
import { runTool } from "./tools";

export type Step = { name: string; args: Record<string, unknown> };

const cityOf = (q: string) => {
  const l = q.toLowerCase();
  if (/bangalore|bengaluru|blr/.test(l)) return "Bengaluru";
  if (/gurgaon/.test(l)) return "Gurugram";
  return CITIES.find((c) => l.includes(c.toLowerCase())) ?? null;
};

const skillOf = (q: string) => {
  const l = ` ${q.toLowerCase()} `;
  const s = SKILLS.find((s) => [s.name, ...(s.aliases ?? [])].some((a) => new RegExp(`[^a-z0-9]${a.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^a-z0-9]`).test(l)));
  return s?.name ?? null;
};

const esc = (s: string) => s.replace(/'/g, "''");

export function planRules(q: string): { steps: Step[]; intent: string } {
  const l = q.toLowerCase();
  if (/skill|gap|missing|learn/.test(l)) return { intent: "gaps", steps: [{ name: "get_skill_gaps", args: { limit: 10 } }] };
  if (/salar/.test(l) && /(up|rise|rose|increase|higher|went)/.test(l))
    return {
      intent: "salary_up",
      steps: [
        {
          name: "run_sql",
          args: {
            query: `SELECT j.company_name, j.title, e.detail, e.at FROM job_events e JOIN jobs j ON j.id = e.job_id WHERE e.kind = 'salary_changed' AND e.at >= date_trunc('month', now()) ORDER BY e.at DESC LIMIT 25`,
          },
        },
        {
          name: "run_sql",
          args: {
            query: `SELECT j.company_name, j.title, j.location, round(s.low / 100000.0, 1) AS low_lpa, round(s.high / 100000.0, 1) AS high_lpa, round(s.confidence::numeric, 2) AS confidence FROM salary_estimates s JOIN jobs j ON j.id = s.job_id WHERE s.created_at >= date_trunc('month', now()) AND j.closed_at IS NULL AND s.currency = 'INR' ORDER BY s.high DESC LIMIT 15`,
          },
        },
      ],
    };
  const city = cityOf(q);
  const skill = skillOf(q);
  if (/compan/.test(l) && (city || skill)) {
    const where = [
      "j.closed_at IS NULL",
      "j.is_canonical",
      city ? (city === "Bengaluru" ? "(j.location ILIKE '%bengaluru%' OR j.location ILIKE '%bangalore%')" : `j.location ILIKE '%${esc(city)}%'`) : null,
      skill ? `j.search_tsv @@ plainto_tsquery('english', '${esc(skill.replace(/[^A-Za-z0-9 ]/g, " "))}')` : null,
    ].filter(Boolean);
    return {
      intent: "companies",
      steps: [{ name: "run_sql", args: { query: `SELECT j.company_name, COUNT(*) AS open_roles, MIN(j.title) AS example_title FROM jobs j WHERE ${where.join(" AND ")} GROUP BY j.company_name ORDER BY open_roles DESC LIMIT 15` } }],
    };
  }
  const about = /(?:about|at|for)\s+([A-Z][\w&.-]+(?:\s[A-Z][\w&.-]+)?)/.exec(q);
  if (/hiring|stats|velocity|how is|about/.test(l) && about) return { intent: "company", steps: [{ name: "get_company_stats", args: { company: about[1] } }] };
  if (/how many|count|remote share|by city/.test(l))
    return {
      intent: "market",
      steps: [{ name: "run_sql", args: { query: `SELECT COUNT(*) AS open_jobs, round(100.0 * AVG(CASE WHEN remote THEN 1 ELSE 0 END), 1) AS remote_pct, COUNT(DISTINCT company_name) AS companies FROM jobs WHERE closed_at IS NULL AND is_canonical` } }],
    };
  return { intent: "search", steps: [{ name: "search_jobs", args: { query: q, location: city ?? undefined } }] };
}

type SqlOut = { columns: string[]; rows: Record<string, unknown>[]; rowCount: number };

function table(r: SqlOut, max = 10) {
  if (!r.rows.length) return "_No rows._";
  const cols = r.columns.filter((c) => c !== "detail");
  const head = `| ${cols.join(" | ")} |\n| ${cols.map(() => "---").join(" | ")} |`;
  const body = r.rows
    .slice(0, max)
    .map((row) => `| ${cols.map((c) => String(row[c] ?? "—").replace(/\|/g, "/").slice(0, 60)).join(" | ")} |`)
    .join("\n");
  return `${head}\n${body}`;
}

export function answerRules(q: string, intent: string, results: { name: string; result: unknown; error?: string }[]): string {
  const first = results[0];
  if (first?.error) return `I couldn't run that: ${first.error}`;
  const res = first?.result as Record<string, unknown>;
  switch (intent) {
    case "gaps": {
      const gaps = (res?.gaps as { skill: string; jobs_unlocked: number; jobs_mentioning: number }[]) ?? [];
      if (!gaps.length) return "No skill gaps have been computed yet — the pipeline writes them after the next scoring run.";
      return `Your biggest gaps, by how many more matches each would unlock:\n\n${gaps
        .slice(0, 8)
        .map((g, i) => `${i + 1}. **${g.skill}** — unlocks ${g.jobs_unlocked} more match${g.jobs_unlocked === 1 ? "" : "es"} (${g.jobs_mentioning} postings mention it)`)
        .join("\n")}\n\nSee [Insights](/insights) for example jobs per skill.`;
    }
    case "salary_up": {
      const ev = res as unknown as SqlOut;
      const est = results[1]?.result as SqlOut | undefined;
      const parts = [ev.rowCount ? `**${ev.rowCount}** posting${ev.rowCount === 1 ? "" : "s"} changed salary this month:\n\n${table(ev)}` : "No postings changed their listed salary this month."];
      if (est?.rowCount) parts.push(`Highest salary estimates computed this month (INR, LPA):\n\n${table(est)}`);
      return parts.join("\n\n");
    }
    case "companies": {
      const r = res as unknown as SqlOut;
      if (!r.rowCount) return "No open roles match that combination right now.";
      return `**${r.rowCount}** compan${r.rowCount === 1 ? "y" : "ies"} match, ranked by open roles:\n\n${table(r)}`;
    }
    case "company": {
      if (res?.error) return String(res.error);
      const c = res as { name: string; key: string; openJobs: number; opened30d: number; closed30d: number; remoteShare: number; topSkills: { skill: string }[]; medianSalary: number | null };
      return `**[${c.name}](/company/${c.key})** has **${c.openJobs}** open roles (${c.opened30d} opened, ${c.closed30d} closed in 30 days). ${Math.round(c.remoteShare * 100)}% remote.${
        c.topSkills.length ? ` Top skills: ${c.topSkills.slice(0, 6).map((s) => s.skill).join(", ")}.` : ""
      }${c.medianSalary ? ` Median salary ≈ ₹${Math.round(c.medianSalary / 1e5)} LPA.` : ""}`;
    }
    case "market": {
      const r = res as unknown as SqlOut;
      return table(r);
    }
    default: {
      const hits = (res?.results as { id: number; title: string; company: string; location: string | null; similarity: number | null; fit: number | null }[]) ?? [];
      if (!hits.length) return `No open jobs matched “${q}”.`;
      return `Top matches for “${q}”${res?.mode === "keyword" ? " (keyword only)" : ""}:\n\n${hits
        .slice(0, 8)
        .map((h) => `- [${h.title}](/job/${h.id}) — ${h.company}${h.location ? `, ${h.location}` : ""}${h.fit != null ? ` · ${h.fit}% fit` : ""}`)
        .join("\n")}`;
    }
  }
}

export async function runRules(q: string, emit: (e: Record<string, unknown>) => void) {
  const { steps, intent } = planRules(q);
  const results: { name: string; result: unknown; error?: string }[] = [];
  for (const [i, s] of steps.entries()) {
    const id = `r${i}`;
    emit({ t: "tool_start", id, name: s.name, args: s.args });
    try {
      const result = await runTool(s.name, s.args);
      results.push({ name: s.name, result });
      emit({ t: "tool", id, name: s.name, args: s.args, result });
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      results.push({ name: s.name, result: null, error });
      emit({ t: "tool", id, name: s.name, args: s.args, error });
    }
  }
  const text = answerRules(q, intent, results);
  for (const chunk of text.match(/[\s\S]{1,48}/g) ?? []) emit({ t: "text", d: chunk });
  return { text, tools: results.map((r, i) => ({ name: r.name, args: steps[i].args, error: r.error })) };
}
