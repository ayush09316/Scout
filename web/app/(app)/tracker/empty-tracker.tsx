import Link from "next/link";
import { ArrowRight, Bookmark, Inbox, Send, SquareKanban } from "lucide-react";
import { EmptyState } from "@/components/ui/empty";
import { buttonClass } from "@/components/ui/button";

const COLS = [
  { label: "Saved", dot: "bg-fg-subtle", cards: 2 },
  { label: "Applied", dot: "bg-accent", cards: 1 },
  { label: "Interview", dot: "bg-warn", cards: 1 },
  { label: "Offer", dot: "bg-good", cards: 0 },
];

function MiniKanban() {
  return (
    <div aria-hidden className="mb-6 grid w-full max-w-sm grid-cols-4 gap-1.5 rounded-xl border border-border bg-surface/80 p-2 shadow-card">
      {COLS.map((c, i) => (
        <div key={c.label} className="flex min-h-24 flex-col gap-1 rounded-lg bg-surface-2 p-1.5">
          <div className="flex items-center gap-1">
            <span className={`size-1.5 rounded-full ${c.dot}`} />
            <span className="truncate text-[9px] font-medium text-fg-muted">{c.label}</span>
          </div>
          {Array.from({ length: c.cards }).map((_, j) => (
            <div key={j} className={`rounded-md border border-border bg-surface p-1 ${i === 1 && j === 0 ? "ring-1 ring-accent/40" : ""}`}>
              <div className="h-1 w-4/5 rounded-full bg-border-strong" />
              <div className="mt-1 h-1 w-1/2 rounded-full bg-border" />
            </div>
          ))}
          {c.cards === 0 && <div className="flex-1 rounded-md border border-dashed border-border" />}
        </div>
      ))}
    </div>
  );
}

export function EmptyTracker() {
  return (
    <div className="mt-6" data-testid="tracker-empty">
      <EmptyState
        icon={SquareKanban}
        glow
        visual={<MiniKanban />}
        title={
          <span className="text-lg font-normal">
            Your pipeline starts <span className="font-serif text-xl italic">in Today</span>
          </span>
        }
        description={
          <ol className="mx-auto mt-2 max-w-sm space-y-1.5 text-left text-[13px]">
            <li className="flex gap-2">
              <Bookmark className="mt-0.5 size-3.5 shrink-0 text-accent" aria-hidden />
              <span>
                Press <strong className="font-medium text-fg">Save</strong> (S) on a match and it lands in <em>Saved</em>.
              </span>
            </li>
            <li className="flex gap-2">
              <Send className="mt-0.5 size-3.5 shrink-0 text-accent" aria-hidden />
              <span>
                <strong className="font-medium text-fg">Apply</strong> (A) opens the posting and files it under <em>Applied</em>.
              </span>
            </li>
            <li className="flex gap-2">
              <ArrowRight className="mt-0.5 size-3.5 shrink-0 text-accent" aria-hidden />
              <span>Drag cards between columns as you hear back. Every move is logged as ranking feedback.</span>
            </li>
          </ol>
        }
        action={
          <Link href="/today" className={buttonClass("primary", "md")}>
            <Inbox />
            Go to Today
          </Link>
        }
      />
    </div>
  );
}
