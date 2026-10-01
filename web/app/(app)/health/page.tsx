import type { Metadata } from "next";
import { CircleAlert, CircleCheck, TriangleAlert } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { Card, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty";
import { getCronEnabled, getLatestEval, getRuns } from "@/lib/queries";
import { ownerSession } from "@/auth";
import { isDemo } from "@/lib/env";
import type { RunCounts, ScorerMetrics } from "@/lib/db/schema";
import { cn, timeAgo } from "@/lib/utils";
import { CalibrationChart, CostChart, FetchedChart, RunsCard } from "./charts";
import { CronSwitch } from "./cron-switch";

export const metadata: Metadata = { title: "Health" };

const METRICS: { key: keyof ScorerMetrics; label: string; better: "high" | "low"; fmt: (v: number) => string }[] = [
  { key: "p_at_10", label: "P@10", better: "high", fmt: (v) => v.toFixed(2) },
  { key: "recall_at_50", label: "Recall@50", better: "high", fmt: (v) => v.toFixed(2) },
  { key: "ece", label: "ECE", better: "low", fmt: (v) => v.toFixed(3) },
  { key: "p50_ms", label: "p50 latency", better: "low", fmt: (v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}s` : `${Math.round(v)}ms`) },
  { key: "usd_per_1k", label: "$ / 1k jobs", better: "low", fmt: (v) => `$${v.toFixed(2)}` },
];

export default async function HealthPage() {
  const [runs, evalR, owner] = await Promise.all([getRuns(14), getLatestEval(), isDemo() ? null : ownerSession()]);
  const cronOn = owner ? await getCronEnabled() : false;
  const last = runs[runs.length - 1];
  const totalCost = runs.reduce((a, r) => a + r.costUsd, 0);
  const errors = runs.flatMap((r) => r.errors.map((e) => ({ ...e, runId: r.id, when: r.startedAt }))).reverse();
  const bySource = Object.entries(
    errors.reduce<Record<string, number>>((m, e) => ((m[e.source] = (m[e.source] ?? 0) + 1), m), {}),
  ).sort((a, b) => b[1] - a[1]);

  const runData = runs.map((r) => ({
    day: new Date(r.startedAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" }),
    run: `#${r.id}`,
    fetched: r.counts.fetched ?? 0,
    new: r.counts.new ?? 0,
    scored: r.counts.scored ?? 0,
    cost: r.costUsd,
    backfill: (r.counts.new ?? 0) >= 1000 && (r.counts.new ?? 0) >= 0.5 * (r.counts.fetched ?? Infinity),
  }));
  const costData = Object.values(
    runData.reduce<Record<string, { day: string; usd: number }>>((m, r) => ((m[r.day] ??= { day: r.day, usd: 0 }).usd += r.cost, m), {}),
  );

  const tiles = [
    { label: "Last run", value: last ? timeAgo(last.startedAt) + " ago" : "—", sub: last ? last.status : "never", tone: last?.status === "ok" ? "good" : "warn" },
    { label: "Jobs fetched", value: (last?.counts.fetched ?? 0).toLocaleString("en-IN"), sub: `${last?.counts.new ?? 0} new · ${last?.counts.scored ?? 0} scored` },
    { label: `Spend · ${runs.length} runs`, value: `$${totalCost.toFixed(3)}`, sub: `$${(totalCost / Math.max(1, runs.length)).toFixed(4)} / run` },
    { label: `Errors · ${runs.length} runs`, value: String(errors.length), sub: bySource[0] ? `most from ${bySource[0][0]}` : "all clear" },
  ];

  const intelKeys: [keyof RunCounts, string][] = [
    ["versions", "Versions captured"],
    ["events", "Job events"],
    ["salary_estimates", "Salary estimates"],
    ["company_stats", "Company stats"],
    ["skill_gaps", "Skill gaps"],
    ["reminders_sent", "Reminders sent"],
  ];
  const intel = intelKeys.filter(([k]) => typeof last?.counts[k] === "number").map(([k, label]) => ({ label, value: last!.counts[k] as number }));

  const scorers = evalR ? Object.entries(evalR.report.scorers) : [];
  const best = Object.fromEntries(
    METRICS.map((m) => {
      const vals = scorers.map(([, s]) => s[m.key]);
      return [m.key, m.better === "high" ? Math.max(...vals) : Math.min(...vals)];
    }),
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
      <PageHeader title="Health" description="Pipeline runs, spend and scorer quality." actions={owner ? <CronSwitch enabled={cronOn} /> : null} />

      {runs.length === 0 ? (
        <div className="mt-6">
          <EmptyState icon={CircleAlert} title="No runs yet" description="Run `make run` in the pipeline, or wait for the 8:00 IST GitHub Actions cron." />
        </div>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {tiles.map((t) => (
              <Card key={t.label} className="px-4 py-3">
                <p className="text-xs text-fg-muted">{t.label}</p>
                <p className="mt-1 font-mono text-xl font-semibold tabular-nums">{t.value}</p>
                <p className={cn("mt-0.5 truncate text-[11px] first-letter:uppercase", t.tone === "good" ? "text-good" : t.tone === "warn" ? "text-warn" : "text-fg-subtle")}>{t.sub}</p>
              </Card>
            ))}
          </div>

          {(intel.length > 0 || (last?.timings.length ?? 0) > 0) && (
            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px] [&>*]:min-w-0" data-testid="run-intel">
              <Card>
                <CardHeader title="Tracking & intel · last run" description="Versions, events, salary estimates, company stats, skill gaps and reminders" />
                {intel.length ? (
                  <dl className="grid grid-cols-2 gap-px bg-border sm:grid-cols-3">
                    {intel.map((t) => (
                      <div key={t.label} className="bg-surface px-4 py-3">
                        <dt className="text-xs text-fg-muted">{t.label}</dt>
                        <dd className="mt-0.5 font-mono text-lg font-semibold tabular-nums">{t.value.toLocaleString("en-IN")}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <p className="p-4 text-sm text-fg-muted">This run didn’t report tracking counts.</p>
                )}
              </Card>
              <Card>
                <CardHeader title="Stage timings · last run" description={last?.timings.length ? `${last.timings.reduce((a, t) => a + t.s, 0).toFixed(1)}s across ${last.timings.length} stages` : undefined} />
                {last?.timings.length ? (
                  <ul className="space-y-2 p-4">
                    {last.timings.slice(0, 8).map((t) => (
                      <li key={t.stage} className="grid grid-cols-[minmax(0,128px)_1fr_48px] items-center gap-3 text-[13px]">
                        <span className="truncate text-fg-muted" title={t.stage}>{t.stage}</span>
                        <span className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                          <span className="block h-full rounded-full bg-accent/80" style={{ width: `${(t.s / Math.max(...last.timings.map((x) => x.s), 0.001)) * 100}%` }} />
                        </span>
                        <span className="text-right font-mono text-[11px] tabular-nums text-fg-subtle">{t.s.toFixed(1)}s</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="p-4 text-sm text-fg-muted">No timings reported.</p>
                )}
              </Card>
            </div>
          )}

          <div className="mt-4 grid gap-4 lg:grid-cols-2 [&>*]:min-w-0">
            <Card>
              <RunsCard data={runData} />
            </Card>
            <Card>
              <CardHeader title="Jobs fetched per run" description="Across all sources" />
              <div className="h-60 p-3">
                <FetchedChart data={runData} />
              </div>
            </Card>
            <Card>
              <CardHeader title="Cost per day" description="LLM scoring spend (USD)" />
              <div className="h-60 p-3">
                <CostChart data={costData} />
              </div>
            </Card>
            <Card>
              <CardHeader title="Source errors" description={`${errors.length} in the last ${runs.length} runs`} />
              {errors.length === 0 ? (
                <p className="flex items-center gap-2 p-4 text-sm text-fg-muted">
                  <CircleCheck className="size-4 text-good" aria-hidden /> Every source healthy.
                </p>
              ) : (
                <ul className="max-h-60 divide-y divide-border overflow-y-auto">
                  {errors.map((e, i) => (
                    <li key={i} className="flex items-start gap-3 px-4 py-2.5 text-[13px]">
                      <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warn" aria-hidden />
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-xs font-medium text-fg">{e.source}</p>
                        <p className="truncate text-fg-muted" title={e.message}>
                          {e.message}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-fg-subtle">{timeAgo(e.when)} ago</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px] [&>*]:min-w-0">
        <Card className="min-w-0">
          <CardHeader
            title="Latest eval"
            description={evalR ? `Test split · ${evalR.report.n_test ?? "?"} labels · ${timeAgo(evalR.createdAt)} ago` : "No eval report yet"}
            action={evalR && <Badge tone="accent">best highlighted</Badge>}
          />
          {evalR ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-[13px]">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-fg-subtle">
                    <th className="px-4 py-2.5 font-medium">Scorer</th>
                    {METRICS.map((m) => (
                      <th key={m.key} className="px-3 py-2.5 text-right font-medium" title={m.better === "high" ? "Higher is better" : "Lower is better"}>
                        {m.label} <span aria-hidden>{m.better === "high" ? "↑" : "↓"}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {scorers.map(([name, s]) => (
                    <tr key={name} className="border-b border-border last:border-0">
                      <td className="px-4 py-2.5 font-mono font-medium">{name}</td>
                      {METRICS.map((m) => {
                        const isBest = s[m.key] === best[m.key];
                        return (
                          <td key={m.key} className="px-3 py-2 text-right">
                            <span className={cn("inline-block rounded-md px-1.5 py-0.5 font-mono tabular-nums", isBest ? "bg-good-soft font-semibold text-good" : "text-fg-muted")}>
                              {m.fmt(s[m.key])}
                            </span>
                            {isBest && <span className="sr-only"> (best)</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="p-4 text-sm text-fg-muted">Label 200 jobs, then run `scout eval`.</p>
          )}
        </Card>
        <Card>
          <CardHeader title="Calibration" description="Predicted fit vs. observed rate (dashed = perfect)" />
          <div className="h-64 p-3">{evalR ? <CalibrationChart data={evalR.report.calibration} /> : null}</div>
        </Card>
      </div>
    </div>
  );
}
