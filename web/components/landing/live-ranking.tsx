"use client";

import { useEffect, useState } from "react";
import { Activity, Bookmark, Check, Globe, Inbox, MapPin, MessagesSquare, ScanSearch, Search, Settings, SquareKanban, Tags, Wallet } from "lucide-react";
import { salaryLabel } from "@/lib/format";
import { cn } from "@/lib/utils";
import { reducedMotion, tween } from "./motion";
import type { PreviewJob } from "./product-preview";

const NAV = [
  { label: "Today", icon: Inbox, active: true },
  { label: "Tracker", icon: SquareKanban },
  { label: "Label", icon: Tags },
  { label: "Search", icon: ScanSearch },
  { label: "Chat", icon: MessagesSquare },
  { label: "Health", icon: Activity },
  { label: "Settings", icon: Settings },
];

const KEYS = [
  { k: "J", label: "down" },
  { k: "K", label: "up" },
  { k: "S", label: "save" },
  { k: "A", label: "apply" },
];

type State = { shown: number; ranked: boolean; focus: number; key: string | null; toast: boolean; saved: number | null; scoring: boolean };

const FINAL = (n: number): State => ({ shown: n, ranked: true, focus: 0, key: null, toast: false, saved: null, scoring: false });

const ARRIVAL: Record<number, number[]> = { 1: [0], 2: [1, 0], 3: [1, 2, 0], 4: [2, 0, 3, 1] };

function Ring({ value, on, size }: { value: number; on: boolean; size: number }) {
  const [v, setV] = useState(value);
  useEffect(() => {
    if (!on) {
      setV(0);
      return;
    }
    if (reducedMotion()) {
      setV(value);
      return;
    }
    return tween(0, value, 1100, setV);
  }, [on, value]);
  const stroke = 3.5;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const tone = value >= 0.7 ? "text-good" : value >= 0.4 ? "text-[#d97706] dark:text-[#fbbf24]" : "text-fg-subtle";
  return (
    <span className={cn("relative inline-flex shrink-0 items-center justify-center", tone)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--muted)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - v)} />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-mono font-semibold text-fg tabular-nums" style={{ fontSize: size * 0.3 }}>
        {Math.round(v * 100)}
      </span>
    </span>
  );
}

function Row({ job, pos, visible, focused, saved }: { job: PreviewJob; pos: number; visible: boolean; focused: boolean; saved: boolean }) {
  const loc = job.location?.replace(/^Remote\s*/i, "").replace(/[()]/g, "").trim();
  return (
    <div
      className="absolute inset-x-0 top-0 px-0.5 transition-[transform,opacity] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
      style={{ height: "var(--row)", transform: `translateY(calc(var(--row) * ${pos} + ${visible ? 0 : 14}px)) scale(${visible ? 1 : 0.98})`, opacity: visible ? 1 : 0 }}
    >
      <div
        className={cn(
          "relative flex h-[calc(var(--row)-8px)] items-center gap-3 rounded-xl border bg-surface px-3 transition-[border-color,box-shadow] duration-300 sm:gap-4 sm:px-4",
          focused ? "border-accent/50 shadow-[0_0_0_3px_var(--accent-soft),0_12px_30px_-14px_rgb(99_102_241/0.55)]" : "border-border",
        )}
      >
        <span aria-hidden className={cn("absolute top-3 bottom-3 -left-px w-[3px] rounded-full bg-accent transition-opacity duration-300", focused ? "opacity-100" : "opacity-0")} />
        <Ring value={job.fit} on={visible} size={42} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-[13px] font-semibold text-fg sm:text-sm">{job.title}</p>
            <span
              className={cn(
                "inline-flex h-5 shrink-0 items-center gap-1 rounded-md bg-accent-soft px-1.5 text-[10px] font-medium text-accent-soft-fg transition-[opacity,transform] duration-300",
                saved ? "scale-100 opacity-100" : "scale-90 opacity-0",
              )}
            >
              <Bookmark className="size-3" aria-hidden />
              Saved
            </span>
          </div>
          <p className="mt-0.5 truncate text-xs text-fg-muted">{job.company}</p>
          <div className="mt-1.5 flex min-w-0 gap-1.5 overflow-hidden">
            <span className="inline-flex h-5 shrink-0 items-center gap-1 rounded-md bg-muted px-1.5 text-[10.5px] font-medium text-fg-muted [&_svg]:size-3">
              {job.remote ? <Globe aria-hidden /> : <MapPin aria-hidden />}
              {job.remote ? `Remote${loc ? ` · ${loc}` : ""}` : (job.location ?? "India")}
            </span>
            {job.salary && (
              <span
                className={cn(
                  "hidden h-5 shrink-0 items-center gap-1 rounded-md px-1.5 text-[10.5px] font-medium min-[420px]:inline-flex [&_svg]:size-3",
                  job.salary.kind === "estimate" ? "border border-dashed border-border-strong text-fg-muted" : "bg-good-soft text-good",
                )}
              >
                <Wallet aria-hidden />
                {salaryLabel(job.salary)}
              </span>
            )}
            {job.reasons[0] && (
              <span className="hidden h-5 min-w-0 items-center gap-1.5 truncate rounded-md border border-border px-1.5 text-[10.5px] text-fg-muted lg:inline-flex">
                <span className="size-1.5 shrink-0 rounded-full bg-good" aria-hidden />
                <span className="truncate">{job.reasons[0]}</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function LiveRanking({ jobs, live, compact }: { jobs: PreviewJob[]; live: boolean; compact?: boolean }) {
  const list = [...jobs].sort((a, b) => b.fit - a.fit).slice(0, compact ? 3 : 4);
  const n = list.length;
  const arrival = ARRIVAL[n] ?? list.map((_, i) => i);
  const [s, setS] = useState<State>(FINAL(n));

  useEffect(() => {
    if (reducedMotion()) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let alive = true;
    const at = (ms: number, patch: Partial<State> | ((p: State) => Partial<State>)) =>
      timers.push(setTimeout(() => alive && setS((p) => ({ ...p, ...(typeof patch === "function" ? patch(p) : patch) })), ms));
    const cycle = () => {
      at(0, { shown: 0, ranked: false, focus: -1, key: null, toast: false, saved: null, scoring: true });
      for (let i = 0; i < n; i++) at(500 + i * 450, { shown: i + 1 });
      let t = 500 + n * 450 + 900;
      at(t, { ranked: true, scoring: false });
      t += 1000;
      at(t, { focus: 0 });
      t += 700;
      at(t, { key: "J", focus: Math.min(1, n - 1) });
      at(t + 500, { key: null });
      t += 1000;
      at(t, { key: "K", focus: 0 });
      at(t + 500, { key: null });
      t += 1000;
      at(t, { key: "S", saved: 0, toast: true });
      at(t + 500, { key: null });
      t += 2400;
      at(t, { toast: false });
      t += 900;
      timers.push(setTimeout(() => alive && cycle(), t));
    };
    timers.push(setTimeout(cycle, 900));
    return () => {
      alive = false;
      timers.forEach(clearTimeout);
    };
  }, [n]);

  const pos = (i: number) => (s.ranked ? i : arrival.indexOf(i));
  const status = s.scoring ? (s.shown < n ? `Scoring ${Math.max(s.shown, 1)} of ${n}…` : "Calibrating…") : "Ranked by calibrated fit";

  return (
    <div className="relative" data-testid="product-preview">
      <div aria-hidden className="pointer-events-none absolute -inset-x-6 -top-8 -bottom-10 -z-10 rounded-[40px] bg-[conic-gradient(from_180deg_at_50%_50%,rgb(99_102_241/0.35),rgb(168_85_247/0.3),rgb(251_113_133/0.22),rgb(99_102_241/0.35))] opacity-60 blur-3xl dark:opacity-70" />
      <div className="lx-glass rounded-[22px] p-1.5 shadow-[var(--lx-glow)] sm:p-2">
        <div className="overflow-hidden rounded-2xl border border-border bg-bg/85" role="img" aria-label="Animated preview of the Scout Today inbox: jobs arrive, get fit scores, re-order by score, and are triaged with J, K and S keyboard shortcuts">
          <div className="flex h-9 items-center gap-2 border-b border-border bg-surface-2/80 px-3" aria-hidden>
            <span className="flex gap-1.5">
              <span className="size-2.5 rounded-full bg-[#ff5f57]/80" />
              <span className="size-2.5 rounded-full bg-[#febc2e]/80" />
              <span className="size-2.5 rounded-full bg-[#28c840]/80" />
            </span>
            <span className="mx-auto flex h-5 min-w-0 max-w-[14rem] flex-1 items-center justify-center truncate rounded-md bg-muted px-2 font-mono text-[10px] text-fg-subtle">scout / today</span>
            <span className={cn("inline-flex h-5 items-center gap-1 rounded-full px-2 font-mono text-[9.5px] font-medium tracking-wider uppercase", live ? "bg-good-soft text-good" : "bg-muted text-fg-subtle")}>
              {live && <span className="size-1.5 rounded-full bg-current motion-safe:animate-pulse" />}
              {live ? "Live" : "Sample"}
            </span>
          </div>
          <div className={cn("grid", !compact && "md:grid-cols-[172px_1fr]")} aria-hidden>
            {!compact && (
              <aside className="hidden flex-col gap-0.5 border-r border-border bg-surface-2/50 p-2.5 md:flex">
                <div className="mb-2 flex h-7 items-center gap-1.5 rounded-md border border-border bg-surface px-2 text-[11px] text-fg-subtle">
                  <Search className="size-3" />
                  <span className="flex-1">Search jobs…</span>
                  <kbd className="rounded border border-border px-1 font-mono text-[9px]">⌘K</kbd>
                </div>
                {NAV.map((item) => (
                  <div key={item.label} className={cn("flex h-7 items-center gap-2 rounded-md px-2 text-[12px] font-medium", item.active ? "bg-surface text-fg shadow-card ring-1 ring-border" : "text-fg-muted")}>
                    <item.icon className={cn("size-3.5", item.active ? "text-accent" : "text-fg-subtle")} />
                    {item.label}
                  </div>
                ))}
              </aside>
            )}
            <div className="relative min-w-0 p-3 sm:p-5">
              <div className="flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold tracking-tight text-fg">Today</p>
                  <p className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-fg-muted sm:text-xs">
                    <span className={cn("size-1.5 shrink-0 rounded-full", s.scoring ? "bg-[#f59e0b] motion-safe:animate-pulse" : "bg-good")} />
                    <span className="truncate">
                      {live ? "This morning's run" : "Sample rows"} · {status}
                    </span>
                  </p>
                </div>
                <div className="flex shrink-0 rounded-lg border border-border bg-surface-2 p-0.5 text-[11px] font-medium">
                  <span className="rounded-md bg-surface px-2 py-0.5 text-fg shadow-card">Top</span>
                  <span className="px-2 py-0.5 text-fg-subtle">Maybe</span>
                  <span className="hidden px-2 py-0.5 text-fg-subtle min-[400px]:inline">All</span>
                </div>
              </div>
              <div className="relative mt-3 [--row:78px] sm:mt-4 sm:[--row:84px]" style={{ height: `calc(var(--row) * ${n})` }}>
                {list.map((j, i) => (
                  <Row key={j.id} job={j} pos={pos(i)} visible={arrival.indexOf(i) < s.shown} focused={s.focus === i} saved={s.saved === i} />
                ))}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3.5 gap-y-1.5 border-t border-border pt-3 text-[11px] text-fg-subtle">
                {KEYS.map(({ k, label }) => (
                  <span key={k} className="flex items-center gap-1.5">
                    <kbd
                      className={cn(
                        "inline-flex h-5 min-w-5 items-center justify-center rounded-[5px] border px-1 font-mono text-[10px] font-semibold transition-[transform,background-color,color,border-color] duration-150",
                        s.key === k ? "lx-keyhit translate-y-px border-accent bg-accent text-accent-fg" : "border-border bg-surface text-fg-muted shadow-[0_1px_0_var(--border-strong)]",
                      )}
                    >
                      {k}
                    </kbd>
                    {label}
                  </span>
                ))}
              </div>
              <div
                className={cn(
                  "pointer-events-none absolute right-3 bottom-3 flex items-center gap-2 rounded-xl border border-border bg-fg px-3 py-2 text-[12px] font-medium text-bg shadow-pop transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] sm:right-5 sm:bottom-4",
                  s.toast ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
                )}
              >
                <Check className="size-3.5 text-good" />
                Saved to Tracker
                <span className="text-bg/40">·</span>
                <span className="underline decoration-bg/40 underline-offset-2">Undo</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
