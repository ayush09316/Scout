"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Bookmark, Check, CheckCheck, CircleCheck, CircleX, EyeOff, LoaderCircle, ThumbsUp, X, type LucideIcon } from "lucide-react";
import type { FeedbackAction } from "@/lib/db/schema";
import type { JobListItem } from "@/lib/queries";
import type { JobActions } from "@/lib/use-job-actions";
import { cn } from "@/lib/utils";

export function useSelection(order: number[]) {
  const [picked, setPicked] = useState<Set<number>>(() => new Set());
  const anchor = useRef<number | null>(null);
  const ids = order.filter((id) => picked.has(id));
  const toggle = (id: number, range = false) => {
    const from = anchor.current != null ? order.indexOf(anchor.current) : -1;
    const to = order.indexOf(id);
    setPicked((p) => {
      const n = new Set(p);
      const on = !p.has(id);
      const span = range && from >= 0 && to >= 0 ? order.slice(Math.min(from, to), Math.max(from, to) + 1) : [id];
      span.forEach((x) => (on ? n.add(x) : n.delete(x)));
      return n;
    });
    anchor.current = id;
  };
  const clear = () => {
    anchor.current = null;
    setPicked(new Set());
  };
  const selectAll = () => setPicked(new Set(order));
  return { ids, has: (id: number) => picked.has(id), active: ids.length > 0, toggle, clear, selectAll };
}

export function SelectBox({ checked, active, label, onToggle }: { checked: boolean; active: boolean; label: string; onToggle: (range: boolean) => void }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      data-testid="row-select"
      onMouseDown={(e) => e.shiftKey && e.preventDefault()}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle(e.shiftKey);
      }}
      className={cn(
        "absolute inset-0 z-20 flex items-center justify-center rounded-lg bg-surface transition-opacity focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
        checked || active ? "opacity-100" : "opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 max-sm:pointer-events-none",
      )}
    >
      <span className={cn("flex size-[18px] items-center justify-center rounded-[5px] border transition-colors", checked ? "border-accent bg-accent text-accent-fg" : "border-border-strong bg-surface hover:border-fg-subtle")}>
        {checked && <Check className="size-3.5" strokeWidth={3} aria-hidden />}
      </span>
    </button>
  );
}

export type BulkAction = { key: string; label: string; icon: LucideIcon; kbd?: string; run: () => Promise<unknown> };

export function jobBulk(acts: JobActions, jobs: JobListItem[], clear: () => void, hints = false) {
  const wrap = (run: () => Promise<boolean>) => async () => {
    if (await run()) clear();
  };
  const feedback = (a: FeedbackAction) => wrap(() => acts.feedback(jobs, a));
  const label = (l: "fit" | "no") => wrap(() => acts.label(jobs, l));
  const k = (key: string) => (hints ? key : undefined);
  const actions: (BulkAction | "divider")[] = [
    "divider",
    { key: "up", label: "Good match", icon: ThumbsUp, kbd: k("U"), run: feedback("up") },
    { key: "saved", label: "Save", icon: Bookmark, kbd: k("S"), run: feedback("saved") },
    { key: "down", label: "Dismiss", icon: EyeOff, kbd: k("D"), run: feedback("down") },
    "divider",
    { key: "fit", label: "Label fit", icon: CircleCheck, run: label("fit") },
    { key: "no", label: "Label not a fit", icon: CircleX, run: label("no") },
  ];
  return { feedback, actions };
}

const barBtn =
  "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-1.5 text-[13px] font-medium text-bg/90 transition-colors hover:bg-bg/10 hover:text-bg active:bg-bg/15 disabled:pointer-events-none disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none sm:px-2.5 [&_svg]:size-4 [&_svg]:shrink-0";

const Divider = () => <span aria-hidden className="mx-0.5 h-5 w-px shrink-0 bg-bg/15" />;

export function SelectionToolbar({ count, total, onSelectAll, onClear, actions }: { count: number; total: number; onSelectAll: () => void; onClear: () => void; actions: (BulkAction | "divider")[] }) {
  const [busy, setBusy] = useState<string | null>(null);
  if (!count) return null;
  const run = async (a: BulkAction) => {
    setBusy(a.key);
    try {
      await a.run();
    } finally {
      setBusy(null);
    }
  };
  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-40 flex justify-center px-4 md:bottom-6">
      <div
        role="toolbar"
        aria-label="Selection actions"
        data-testid="selection-toolbar"
        className="pointer-events-auto flex max-w-full items-center overflow-x-auto sm:gap-0.5 rounded-xl bg-fg p-1 text-bg shadow-lg ring-1 ring-black/5"
      >
        <button type="button" className={barBtn} onClick={onClear} aria-label="Clear selection" title="Clear selection · Esc">
          <X />
        </button>
        <p className="pr-1.5 pl-0.5 text-[13px] font-medium whitespace-nowrap tabular-nums" aria-live="polite">
          {count.toLocaleString("en-IN")} selected
        </p>
        {count < total && (
          <button type="button" className={barBtn} onClick={onSelectAll} aria-label={`Select all ${total}`} title="Select all · ⌘A">
            <CheckCheck />
            <span className="hidden sm:inline">Select all</span>
            <span className="hidden font-mono text-[11px] text-bg/60 tabular-nums sm:inline">{total.toLocaleString("en-IN")}</span>
          </button>
        )}
        {actions.map((a, i) =>
          a === "divider" ? (
            <Divider key={`d${i}`} />
          ) : (
            <button
              key={a.key}
              type="button"
              className={barBtn}
              onClick={() => run(a)}
              disabled={!!busy}
              aria-label={a.label}
              title={a.kbd ? `${a.label} · ${a.kbd}` : a.label}
            >
              {busy === a.key ? <LoaderCircle className="animate-spin" /> : <a.icon />}
              <span className="hidden sm:inline">{a.label}</span>
            </button>
          ),
        )}
      </div>
    </div>,
    document.body,
  );
}
