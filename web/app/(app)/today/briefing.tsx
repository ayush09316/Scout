import { ArrowUpDown, CircleSlash, RefreshCw, RotateCcw, Sparkles } from "lucide-react";
import type { Briefing } from "@/lib/queries";
import { istDateTime } from "@/lib/utils";

export function BriefingStrip({ b }: { b: Briefing }) {
  const items = [
    { n: b.newMatches, icon: Sparkles, label: (n: number) => `${n} new match${n === 1 ? "" : "es"}`, tone: "text-accent" },
    { n: b.salaryChanges, icon: ArrowUpDown, label: (n: number) => `${n} salary change${n === 1 ? "" : "s"}`, tone: "text-good" },
    { n: b.reopened, icon: RotateCcw, label: (n: number) => `${n} tracked job${n === 1 ? "" : "s"} reopened`, tone: "text-warn" },
    { n: b.closed, icon: CircleSlash, label: (n: number) => `${n} tracked job${n === 1 ? "" : "s"} closed`, tone: "text-bad" },
  ].filter((i) => i.n > 0);
  if (!b.lastRunAt && !items.length) return null;
  return (
    <div data-testid="briefing" className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 rounded-lg border border-border bg-surface-2/60 px-3 py-2 text-[13px] text-fg-muted">
      <span className="font-serif text-[15px] text-fg italic">This morning</span>
      {items.length === 0 && <span className="text-fg-subtle">No changes since the previous run</span>}
      {items.map((i) => (
        <span key={i.label(i.n)} className="inline-flex items-center gap-1.5">
          <i.icon className={`size-3.5 ${i.tone}`} aria-hidden />
          <span className="font-medium text-fg tabular-nums">{i.label(i.n)}</span>
        </span>
      ))}
      {b.lastRunAt && (
        <span className="inline-flex items-center gap-1.5 text-xs text-fg-subtle sm:ml-auto">
          <RefreshCw className="size-3" aria-hidden />
          Refreshed {istDateTime(b.lastRunAt)}
        </span>
      )}
    </div>
  );
}
