import type { Metadata } from "next";
import { PageHeader } from "@/components/app-shell";
import { getFunnel, getTracker } from "@/lib/queries";
import { Info } from "lucide-react";
import { isDemo } from "@/lib/env";
import { Board } from "./board";
import { EmptyTracker } from "./empty-tracker";

export const metadata: Metadata = { title: "Tracker" };

function rate(a: number, b: number) {
  return b ? `${Math.round((a / b) * 100)}%` : "—";
}

export default async function TrackerPage() {
  const [cards, funnel] = await Promise.all([getTracker(), getFunnel()]);
  const stats = [
    { label: "Applied", value: funnel.applied, sub: "total" },
    { label: "Interview", value: funnel.interview, sub: `${rate(funnel.interview, funnel.applied)} of applied` },
    { label: "Offer", value: funnel.offer, sub: `${rate(funnel.offer, funnel.interview)} of interviews` },
    { label: "Rejected", value: funnel.rejected, sub: `${rate(funnel.rejected, funnel.applied)} of applied` },
  ];
  return (
    <div className="px-4 py-6 md:px-8 md:py-8">
      <PageHeader title="Tracker" description="Drag cards between stages. Each move is logged as feedback for ranking." />
      {isDemo() && (
        <p data-testid="demo-banner" className="mt-4 flex items-start gap-2 rounded-lg border border-warn/30 bg-warn-soft/60 px-3 py-2 text-[13px] text-fg-muted">
          <Info className="mt-0.5 size-4 shrink-0 text-warn" aria-hidden />
          <span>
            <span className="font-medium text-fg">Public demo.</span> Drag cards to try it out — moves snap back because nothing is saved here.
          </span>
        </p>
      )}
      <div className="ap-rise mt-5 grid grid-cols-2 overflow-hidden rounded-xl border border-border bg-surface shadow-card sm:grid-cols-4" aria-label="Funnel">
        {stats.map((s, i) => (
          <div key={s.label} className={`px-4 py-3 ${i % 2 ? "border-l" : ""} ${i > 1 ? "border-t sm:border-t-0" : ""} ${i === 2 ? "sm:border-l" : ""} border-border`}>
            <p className="text-xs text-fg-muted">{s.label}</p>
            <p className="mt-0.5 font-mono text-xl font-semibold tabular-nums">{s.value}</p>
            <p className="text-[11px] text-fg-subtle">{s.sub}</p>
          </div>
        ))}
      </div>
      {cards.length ? <Board initial={cards} /> : <EmptyTracker />}
    </div>
  );
}
