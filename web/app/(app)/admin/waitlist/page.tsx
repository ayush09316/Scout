import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Download, EyeOff, Megaphone } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty";
import { AnimatedCounter } from "@/components/animated-counter";
import { ownerSession } from "@/auth";
import { isDemo } from "@/lib/env";
import { allEntries, waitlistStats } from "@/lib/waitlist";
import { LIKELIHOOD, LOCATIONS, PAINS, ROLES, STAGES, TOOLS } from "@/lib/waitlist-options";
import { CountChart, LikelihoodChart, SignupsChart } from "./charts";
import { CopyLanding, WaitlistTable } from "./table";

export const metadata: Metadata = { title: "Waitlist" };
export const dynamic = "force-dynamic";

const n = (v: number) => v.toLocaleString("en-IN");

const ordered = (list: readonly string[], counts: { label: string; n: number }[]) => list.map((label) => ({ label, n: counts.find((c) => c.label === label)?.n ?? 0 }));
const byCount = (list: readonly string[], counts: { label: string; n: number }[]) => ordered(list, counts).sort((x, y) => y.n - x.n);
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");

export default async function WaitlistAdmin() {
  if (isDemo()) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
        <PageHeader title="Waitlist" description="Signups from the public landing page." />
        <div className="mt-6">
          <EmptyState icon={EyeOff} title="Hidden in the demo" description="Waitlist signups are personal data, so the public demo never shows them." />
        </div>
      </div>
    );
  }
  if (!(await ownerSession())) notFound();
  const [stats, rows] = await Promise.all([waitlistStats(), allEntries()]);
  const likelihood = LIKELIHOOD.map((v) => ({ label: String(v), n: stats.likelihood.find((p) => p.label === String(v))?.n ?? 0 }));
  const mean = stats.likelihoodMean == null ? null : stats.likelihoodMean.toLocaleString("en-IN", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const tiles = [
    { label: "Total signups", value: <AnimatedCounter value={stats.total} />, sub: stats.total ? `${n(rows.filter((r) => r.referredBy).length)} via referral` : "none yet" },
    { label: "Last 7 days", value: <AnimatedCounter value={stats.last7} />, sub: stats.total ? `${pct(stats.last7, stats.total)} of all` : "—" },
    { label: "Survey completion", value: stats.total ? <AnimatedCounter value={Math.round((stats.completed / stats.total) * 100)} suffix="%" /> : "—", sub: `${n(stats.completed)} finished · ${n(stats.started)} started` },
    { label: "Hot leads", value: <AnimatedCounter value={stats.hot} />, sub: "Actively applying · likelihood ≥ 4" },
    { label: "Pay likelihood", value: stats.likelihoodMean == null ? "—" : <AnimatedCounter value={stats.likelihoodMean} decimals={1} suffix=" / 5" />, sub: stats.likelihoodN ? `mean of ${n(stats.likelihoodN)} answers` : "nobody answered yet" },
  ];
  const panels = [
    { title: "Job search stage", data: ordered(STAGES, stats.stages), width: 150, testId: "wl-chart-stage" },
    { title: "Top pains", data: byCount(PAINS, stats.pains), width: 170, testId: "wl-chart-pains" },
    { title: "Tools used today", data: byCount(TOOLS, stats.tools), width: 150, testId: "wl-chart-tools" },
    { title: "Roles", data: byCount(ROLES, stats.roles), width: 100, testId: "wl-chart-roles" },
    { title: "Where they want to work", data: byCount(LOCATIONS, stats.locations), width: 120, testId: "wl-chart-locations" },
  ];
  const answeredOf = (d: { n: number }[]) => d.reduce((s, x) => s + x.n, 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
      <PageHeader
        title="Waitlist"
        description="Signups from the public landing page. Positions rank by join time, a day earlier per referral and a day earlier for a finished survey."
        actions={
          stats.total > 0 ? (
            <a href="/admin/waitlist/export" download className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm font-medium text-fg shadow-card transition-colors hover:bg-muted ap-press">
              <Download className="size-4 text-fg-subtle" aria-hidden />
              Export CSV
            </a>
          ) : null
        }
      />

      {stats.total === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={Megaphone}
            glow
            title="No one on the waitlist yet"
            description={
              <>
                The form lives on your landing page for signed-out visitors. Share the link where job seekers hang out — a LinkedIn post, a WhatsApp group, a Discord. Every signup gets a referral link, so the first few bring the next.
              </>
            }
            action={<CopyLanding />}
          />
        </div>
      ) : (
        <>
          <div className="ap-stagger mt-5 grid grid-cols-2 gap-3 lg:grid-cols-5" data-testid="wl-tiles">
            {tiles.map((t) => (
              <Card key={t.label} className="px-4 py-3">
                <p className="text-xs text-fg-muted">{t.label}</p>
                <p className="mt-1 font-mono text-xl font-semibold tabular-nums">{t.value}</p>
                <p className="mt-0.5 truncate text-[11px] text-fg-subtle">{t.sub}</p>
              </Card>
            ))}
          </div>

          <div className="ap-stagger mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] [&>*]:min-w-0">
            <Card>
              <CardHeader title="Signups per day" description="Last 30 days, IST" />
              <div className="h-60 p-3">
                <SignupsChart data={stats.daily} />
              </div>
            </Card>
            <Card data-testid="wl-chart-likelihood">
              <CardHeader title="If Scout Pro cost ₹299/month…" description={mean == null ? "Nobody answered yet" : `Likelihood to pay, 1–5 · mean ${mean} of ${n(stats.likelihoodN)}`} />
              <div className="h-60 p-3">
                <LikelihoodChart data={likelihood} />
              </div>
            </Card>
          </div>

          <div className="ap-stagger mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3 [&>*]:min-w-0">
            {panels.map((p) => {
              const total = answeredOf(p.data);
              return (
                <Card key={p.title} data-testid={p.testId}>
                  <CardHeader title={p.title} description={total ? `${n(total)} ${total === 1 ? "pick" : "picks"}` : "Not answered yet"} />
                  <div className="p-3" style={{ height: Math.max(160, p.data.length * 30 + 24) }}>
                    <CountChart data={p.data} labelWidth={p.width} />
                  </div>
                </Card>
              );
            })}
          </div>

          <div className="ap-rise mt-4">
            <WaitlistTable rows={rows} />
          </div>
        </>
      )}
    </div>
  );
}
