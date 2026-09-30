"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Bell, Bookmark, ChevronDown, Briefcase, Check, CircleCheck, CircleDashed, Clock, Ellipsis, GripVertical, Keyboard, Search, Send, SlidersHorizontal, ThumbsDown, ThumbsUp } from "lucide-react";
import { BrandMark } from "./brand";
import { MOBILE_PRIMARY, NAV, NAV_GROUPS, OWNER_ONLY } from "@/components/nav-items";
import { ThemeToggle } from "@/components/theme-toggle";
import { CompanyLogo } from "@/components/company-logo";
import { ScoreRing } from "@/components/score-ring";
import { LocationChips, SkillChips } from "@/components/job-chips";
import { SalaryBadge } from "@/components/salary";
import { ChangeBadges } from "@/components/change-badges";
import { ScorerChip } from "@/components/scorer-chip";
import { ReasonLine } from "@/components/reason-chip";
import { JobDescription } from "@/components/job-description";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { Kbd } from "@/components/ui/kbd";
import { BriefingStrip } from "@/app/(app)/today/briefing";
import { FetchedChart, RunsChart } from "@/app/(app)/health/charts";
import type { MiniJob, StackData } from "@/lib/landing";
import { humanizeReasons, simLabel } from "@/lib/reasons";
import { cn, pct } from "@/lib/utils";
import { reducedMotion } from "./motion";

function Logo() {
  return (
    <span className="flex items-center gap-2 rounded-md font-semibold tracking-tight text-fg">
      <BrandMark />
      Scout
    </span>
  );
}

export function MiniShell({ active, nav, owner, mobile, children }: { active: string; nav: StackData["nav"]; owner?: boolean; mobile?: boolean; children: React.ReactNode }) {
  const items = owner ? NAV : NAV.filter((n) => !OWNER_ONLY.includes(n.href));
  const badge = (href: string) => (href === "/today" ? (nav?.inbox ?? null) : href === "/label" ? `${nav?.labeled ?? 0}/200` : null);
  if (mobile)
    return (
      <div className="flex h-full flex-col bg-bg">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-bg/85 px-4">
          <Logo />
          <div className="flex items-center gap-1">
            <span className="inline-flex size-11 items-center justify-center rounded-lg text-fg-muted">
              <Bell className="size-4" />
            </span>
            <span className="inline-flex size-11 items-center justify-center rounded-lg text-fg-muted">
              <Search className="size-4" />
            </span>
            <ThemeToggle compact />
          </div>
        </header>
        <main className="relative min-h-0 min-w-0 flex-1 overflow-hidden">{children}</main>
        <nav className="grid shrink-0 grid-cols-5 border-t border-border bg-surface/95">
          {items
            .filter((n) => (MOBILE_PRIMARY as readonly string[]).includes(n.href))
            .map((n) => (
              <span key={n.href} className={cn("flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium", n.label === active ? "text-accent" : "text-fg-subtle")}>
                <n.icon className="size-5" aria-hidden />
                {n.label}
              </span>
            ))}
          <span className={cn("flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium", active === "Health" ? "text-accent" : "text-fg-subtle")}>
            <Ellipsis className="size-5" aria-hidden />
            More
          </span>
        </nav>
      </div>
    );
  return (
    <div className="grid h-full grid-cols-[232px_1fr] bg-bg">
      <aside className="flex h-full flex-col border-r border-border bg-surface-2/60 px-3 py-4">
        <div className="app-glow app-glow-sm relative flex items-center justify-between gap-1 pl-2">
          <Logo />
          <span className="inline-flex size-8 items-center justify-center rounded-lg text-fg-muted">
            <Bell className="size-4" />
          </span>
        </div>
        <div className="mt-5 flex h-9 items-center gap-2 rounded-lg border border-border bg-surface px-2.5 text-sm text-fg-subtle shadow-card">
          <Search className="size-4" aria-hidden />
          <span className="flex-1 text-left">Search jobs…</span>
          <Kbd>⌘K</Kbd>
        </div>
        <nav className="mt-4 flex flex-col gap-4">
          {NAV_GROUPS.map((g) => (
            <div key={g} className="flex flex-col gap-0.5">
              <p className="px-2.5 pb-1 text-[11px] font-medium text-fg-subtle">{g}</p>
              {items
                .filter((n) => n.group === g)
                .map((n) => {
                  const on = n.label === active;
                  const b = badge(n.href);
                  return (
                    <span key={n.href} className={cn("group flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium", on ? "bg-surface text-fg shadow-card ring-1 ring-border" : "text-fg-muted")}>
                      <n.icon className={cn("size-4", on ? "text-accent" : "text-fg-subtle")} aria-hidden />
                      <span className="flex-1">{n.label}</span>
                      {b != null && b !== 0 && <span className="font-mono text-[11px] text-fg-subtle tabular-nums">{typeof b === "number" ? b.toLocaleString("en-IN") : b}</span>}
                    </span>
                  );
                })}
            </div>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-3 px-1">
          <span className="flex h-8 items-center gap-2 rounded-md px-1.5 text-xs text-fg-subtle">
            <Keyboard className="size-3.5" aria-hidden />
            <span className="flex-1 text-left">Keyboard shortcuts</span>
            <Kbd>?</Kbd>
          </span>
          <ThemeToggle />
        </div>
      </aside>
      <main className="relative min-w-0 overflow-hidden">{children}</main>
    </div>
  );
}

function PageHeader({ title, description }: { title: React.ReactNode; description?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-fg">{title}</h1>
        {description && <div className="mt-1 text-sm text-fg-muted">{description}</div>}
      </div>
    </div>
  );
}

type TState = { shown: number; ranked: boolean; sorting: boolean; fade: boolean; focus: number; key: string | null; toast: boolean; scoring: boolean };
const FINAL = (n: number): TState => ({ shown: n, ranked: true, sorting: false, fade: false, focus: 0, key: null, toast: false, scoring: false });
const ARRIVAL: Record<number, number[]> = { 1: [0], 2: [1, 0], 3: [1, 2, 0], 4: [2, 0, 3, 1] };

function arrivalOrder(list: MiniJob[]) {
  const n = list.length;
  const idx = list.map((_, i) => i);
  const byTime = [...idx].sort((a, b) => new Date(list[b].postedAt ?? list[b].firstSeenAt).getTime() - new Date(list[a].postedAt ?? list[a].firstSeenAt).getTime() || a - b);
  if (byTime.filter((x, i) => x === i).length > Math.floor(n / 2)) return ARRIVAL[n] ?? [...idx].reverse();
  return byTime;
}

function RowActions({ mobile }: { mobile?: boolean }) {
  return (
    <>
      <Button size="icon-sm" variant="ghost" tabIndex={-1}>
        <ThumbsUp />
      </Button>
      <Button size="icon-sm" variant="ghost" tabIndex={-1}>
        <ThumbsDown />
      </Button>
      {mobile && <span className="flex-1" />}
      <Button size="sm" variant="outline" tabIndex={-1}>
        <Bookmark />
        Save
      </Button>
      <Button size="sm" variant="primary" tabIndex={-1}>
        <Send />
        Apply
      </Button>
    </>
  );
}

function TodayRow({ job, selected, mobile }: { job: MiniJob; selected: boolean; mobile?: boolean }) {
  return (
    <div className={cn("group relative h-full rounded-xl border bg-surface shadow-card transition-[border-color,box-shadow] duration-300", selected ? "border-accent/60 ring-2 ring-accent/15" : "border-border")}>
      <div className="flex gap-3 px-3.5 py-3 sm:gap-3.5">
        <CompanyLogo name={job.companyName} domain={job.companyDomain} size={40} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="block truncate text-[15px] font-semibold text-fg">{job.title}</p>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] text-fg-muted">
                <span className="font-medium text-fg">{job.companyName}</span>
                <span aria-hidden className="text-fg-subtle">·</span>
                <span className="text-fg-subtle">{job.ago} ago</span>
                {job.seniority && <span className="text-fg-subtle capitalize before:mr-2 before:text-fg-subtle before:content-['·']">{job.seniority}</span>}
              </div>
            </div>
            {!mobile && <div className={cn("relative z-10 shrink-0 items-center gap-1 transition-opacity duration-300", selected ? "flex opacity-100" : "hidden opacity-0")}>{<RowActions />}</div>}
            <ScoreRing value={job.fitProb} size={42} />
          </div>
          <div className="mt-2 flex h-6 flex-nowrap items-center gap-1.5 overflow-hidden">
            <LocationChips location={job.location} remote={job.remote} />
            <SalaryBadge salary={job.salary} />
            <ChangeBadges badges={job.badges} />
            {!mobile && <SkillChips reasons={job.reasons} missing={job.missingSkills} maxReasons={2} cap={2} inline />}
          </div>
        </div>
      </div>
      {mobile && (
        <div className="relative z-10 flex items-center gap-1 border-t border-border px-2 py-1.5">
          <RowActions mobile />
        </div>
      )}
    </div>
  );
}

const TABS = [
  { id: "top", label: "Top" },
  { id: "maybe", label: "Maybe" },
  { id: "all", label: "All" },
] as const;

export function MiniToday({ jobs, counts, briefing, total, active, mobile }: { jobs: MiniJob[]; counts: { top: number; maybe: number; all: number }; briefing: StackData["briefing"]; total: number; active: boolean; mobile?: boolean }) {
  const list = useMemo(() => [...jobs].sort((a, b) => (b.finalScore ?? b.fitProb ?? 0) - (a.finalScore ?? a.fitProb ?? 0)).slice(0, mobile ? 3 : 4), [jobs, mobile]);
  const n = list.length;
  const arrival = useMemo(() => arrivalOrder(list), [list]);
  const [s, setS] = useState<TState>(FINAL(n));

  useEffect(() => {
    if (!active) {
      setS(FINAL(n));
      return;
    }
    if (reducedMotion()) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    let alive = true;
    const at = (ms: number, patch: Partial<TState>) => timers.push(setTimeout(() => alive && setS((p) => ({ ...p, ...patch })), ms));
    const cycle = () => {
      at(0, { shown: 0, ranked: false, sorting: false, fade: false, focus: -1, key: null, toast: false, scoring: true });
      for (let i = 0; i < n; i++) at(450 + i * 420, { shown: i + 1 });
      let t = 450 + n * 420 + 1100;
      at(t, { sorting: true, fade: true });
      at(t + 300, { ranked: true });
      at(t + 360, { fade: false });
      t += 360 + 640 + n * 90 + 200;
      at(t, { sorting: false, scoring: false });
      t += 600;
      at(t, { focus: 0 });
      t += 800;
      at(t, { key: "J", focus: Math.min(1, n - 1) });
      at(t + 500, { key: null });
      t += 1000;
      at(t, { key: "K", focus: 0 });
      at(t + 500, { key: null });
      t += 1000;
      at(t, { key: "S", toast: true });
      at(t + 500, { key: null });
      t += 2400;
      at(t, { toast: false });
      t += 900;
      timers.push(setTimeout(() => alive && cycle(), t));
    };
    timers.push(setTimeout(cycle, 350));
    return () => {
      alive = false;
      timers.forEach(clearTimeout);
    };
  }, [n, arrival, active]);

  const pos = (i: number) => (s.ranked ? i : arrival.indexOf(i));
  const status = s.scoring ? (s.sorting ? "Sorting by final score…" : s.shown < n ? `Scoring ${Math.max(s.shown, 1)} of ${n}…` : "Calibrating…") : null;

  return (
    <div className="relative h-full px-4 py-6 md:px-8 md:py-8" style={mobile ? { padding: "1.5rem 1rem" } : undefined}>
      <PageHeader
        title="Today"
        description={
          <>
            <span className="font-serif text-[15px] text-fg italic">{total.toLocaleString("en-IN")} fresh</span> matches to triage.{" "}
            {!mobile && (
              <span>
                Use <Kbd className={cn(s.key === "J" && "lx-keyhit border-accent bg-accent text-accent-fg")}>J</Kbd> <Kbd className={cn(s.key === "K" && "lx-keyhit border-accent bg-accent text-accent-fg")}>K</Kbd> to move, <Kbd className={cn(s.key === "S" && "lx-keyhit border-accent bg-accent text-accent-fg")}>S</Kbd> save, <Kbd>A</Kbd> apply.
              </span>
            )}
          </>
        }
      />
      {briefing ? <BriefingStrip b={briefing} /> : null}
      <div className="relative mt-5 bg-bg/90">
        <div className="flex items-center justify-between gap-2 border-b border-border">
          <div className="-mb-px flex gap-1">
            {TABS.map((t) => (
              <span key={t.id} className={cn("flex h-11 items-center gap-2 border-b-2 px-3 text-sm font-medium whitespace-nowrap", t.id === "top" ? "border-accent text-fg" : "border-transparent text-fg-muted")}>
                {t.label}
                <span className={cn("rounded-full px-1.5 font-mono text-[11px] tabular-nums", t.id === "top" ? "bg-accent-soft text-accent-soft-fg" : "bg-muted text-fg-subtle")}>{counts[t.id].toLocaleString("en-IN")}</span>
              </span>
            ))}
          </div>
          <div className="flex items-center gap-2">
            {status && !mobile && (
              <span className="inline-flex items-center gap-1.5 text-xs text-fg-muted">
                <span className="size-1.5 rounded-full bg-warn motion-safe:animate-pulse" />
                {status}
              </span>
            )}
            {!mobile && (
              <span className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-surface px-3 text-[13px] text-fg shadow-card">
                Best match
                <ChevronDown className="size-3.5 text-fg-subtle" aria-hidden />
              </span>
            )}
            <Button size="sm" variant="outline" tabIndex={-1}>
              <SlidersHorizontal />
              Filters
            </Button>
          </div>
        </div>
      </div>
      <div className={cn("relative mt-3", mobile ? "[--row:170px]" : "[--row:112px]")} style={{ height: `calc(var(--row) * ${n})` }}>
        {list.map((j, i) => {
          const visible = arrival.indexOf(i) < s.shown;
          const drop = s.fade && s.ranked;
          return (
            <div
              key={j.id}
              data-testid="live-row"
              className={cn("absolute inset-x-0 top-0 pb-2 will-change-transform", s.fade ? "transition-opacity duration-[260ms] ease-out" : "transition-[transform,opacity] duration-[640ms] ease-[cubic-bezier(0.22,1,0.36,1)]")}
              style={{
                height: "var(--row)",
                transitionDelay: `${s.sorting && !s.fade ? i * 90 : 0}ms`,
                transform: `translateY(calc(var(--row) * ${pos(i)} + ${!visible ? 14 : drop ? 10 : 0}px)) scale(${!visible || drop ? 0.985 : 1})`,
                opacity: visible && !s.fade ? 1 : 0,
              }}
            >
              <TodayRow job={j} selected={s.focus === i} mobile={mobile} />
            </div>
          );
        })}
      </div>
      <div
        className={cn(
          "pointer-events-none absolute right-6 bottom-6 flex items-center gap-2 rounded-xl border border-border bg-surface px-3.5 py-2.5 text-[13px] font-medium text-fg shadow-pop transition-[transform,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
          s.toast ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0",
        )}
      >
        <Check className="size-4 text-good" />
        Saved to tracker · {list[0]?.companyName}
        <span className="ml-2 text-accent">Undo</span>
      </div>
    </div>
  );
}

const COLUMNS = [
  { id: "saved", label: "Saved", dot: "bg-fg-subtle" },
  { id: "applied", label: "Applied", dot: "bg-accent" },
  { id: "interview", label: "Interview", dot: "bg-warn" },
  { id: "offer", label: "Offer", dot: "bg-good" },
  { id: "rejected", label: "Rejected", dot: "bg-bad" },
] as const;

type TCard = NonNullable<StackData["tracker"]>["cards"][number];

function TrackerCardView({ card, lifted }: { card: TCard; lifted?: boolean }) {
  const stale = card.days >= 7 && (card.stage === "applied" || card.stage === "saved");
  return (
    <article className={cn("group rounded-lg border border-border bg-surface p-3 shadow-card transition-shadow duration-500", lifted && "rotate-1 shadow-pop")}>
      <div className="flex items-start gap-2.5">
        <CompanyLogo name={card.companyName} domain={card.companyDomain} size={28} className="rounded-md" />
        <div className="min-w-0 flex-1">
          <p className="line-clamp-2 text-[13px] leading-snug font-medium text-fg">{card.title}</p>
          <p className="mt-0.5 truncate text-xs text-fg-muted">{card.companyName}</p>
        </div>
        <GripVertical className={cn("size-4 shrink-0 text-fg-subtle", lifted ? "opacity-100" : "opacity-0")} aria-hidden />
      </div>
      <div className="mt-2.5 flex items-center justify-between text-[11px]">
        <span className={cn("inline-flex items-center gap-1", stale ? "text-warn" : "text-fg-subtle")}>
          <Clock className="size-3" aria-hidden />
          {card.days === 0 ? "today" : `${card.days}d`}
        </span>
        <span className="font-mono text-fg-subtle tabular-nums">{pct(card.fitProb)} fit</span>
      </div>
    </article>
  );
}

function rate(a: number, b: number) {
  return b ? `${Math.round((a / b) * 100)}%` : "—";
}

export function MiniTracker({ data, active, mobile }: { data: NonNullable<StackData["tracker"]>; active: boolean; mobile?: boolean }) {
  const [moved, setMoved] = useState(true);
  useEffect(() => {
    if (!active) {
      setMoved(false);
      return;
    }
    if (reducedMotion()) {
      setMoved(true);
      return;
    }
    const t = setTimeout(() => setMoved(true), 900);
    return () => clearTimeout(t);
  }, [active]);
  const mover = data.cards.find((c) => c.stage === "saved");
  const f = data.funnel;
  const stats = [
    { label: "Applied", value: f.applied, sub: "total" },
    { label: "Interview", value: f.interview, sub: `${rate(f.interview, f.applied)} of applied` },
    { label: "Offer", value: f.offer, sub: `${rate(f.offer, f.interview)} of interviews` },
    { label: "Rejected", value: f.rejected, sub: `${rate(f.rejected, f.applied)} of applied` },
  ];
  const cols = mobile ? COLUMNS.slice(0, 2) : COLUMNS;
  const count = (id: string) => data.cards.filter((c) => c.stage === id).length;
  return (
    <div className="h-full px-4 py-6 md:px-8 md:py-8" style={mobile ? { padding: "1.5rem 1rem" } : undefined}>
      <PageHeader title="Tracker" description="Drag cards between stages. Each move is logged as feedback for ranking." />
      <div className={cn("mt-5 grid overflow-hidden rounded-xl border border-border bg-surface shadow-card", mobile ? "grid-cols-2" : "grid-cols-4")}>
        {stats.map((s, i) => (
          <div key={s.label} className={cn("border-border px-4 py-3", i % 2 && "border-l", i > 1 && mobile && "border-t", i === 2 && !mobile && "border-l")}>
            <p className="text-xs text-fg-muted">{s.label}</p>
            <p className="mt-0.5 font-mono text-xl font-semibold tabular-nums">{s.value}</p>
            <p className="text-[11px] text-fg-subtle">{s.sub}</p>
          </div>
        ))}
      </div>
      <div className="relative mt-6 grid gap-3" style={{ gridTemplateColumns: `repeat(${cols.length}, minmax(0, 1fr))` }}>
        {cols.map((col, ci) => {
          const cards = data.cards.filter((c) => c.stage === col.id && c.id !== mover?.id);
          return (
            <section key={col.id} className={cn("flex flex-col rounded-xl border bg-surface-2/70 transition-colors duration-500", ci === 1 && mover && moved ? "border-accent/60 bg-accent-soft/40" : "border-border")}>
              <header className="flex items-center gap-2 px-3 py-2.5">
                <span className={cn("size-2 rounded-full", col.dot)} aria-hidden />
                <h2 className="text-[13px] font-semibold">{col.label}</h2>
                <span className="ml-auto rounded-full bg-muted px-2 font-mono text-[11px] text-fg-muted tabular-nums">{count(col.id)}</span>
              </header>
              <div className="flex min-h-40 flex-1 flex-col gap-2 px-2 pb-2">
                {ci < 2 && mover && <div className="h-[142px] shrink-0" />}
                {cards.slice(0, mobile ? 2 : 3).map((c) => (
                  <TrackerCardView key={c.id} card={c} />
                ))}
                {cards.length === 0 && !(ci < 2 && mover) && <p className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-border px-3 py-8 text-center text-xs text-fg-subtle">Drop a job here</p>}
              </div>
            </section>
          );
        })}
        {mover && (
          <div
            className="absolute top-[44px] left-2 z-10 transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform motion-reduce:transition-none"
            style={{ width: `calc((100% - ${(cols.length - 1) * 0.75}rem) / ${cols.length} - 1rem)`, transform: moved ? `translateX(calc(100% + 1.75rem))` : "none" }}
          >
            <TrackerCardView card={{ ...mover, stage: moved ? "applied" : "saved", days: moved ? 0 : mover.days }} lifted={!moved} />
          </div>
        )}
      </div>
    </div>
  );
}

export function MiniJob({ job, tailor, active, mobile }: { job: NonNullable<StackData["job"]>; tailor: StackData["tailor"]; active: boolean; mobile?: boolean }) {
  const [after, setAfter] = useState(true);
  useEffect(() => {
    if (!active) {
      setAfter(false);
      return;
    }
    if (reducedMotion()) {
      setAfter(true);
      return;
    }
    const t = setTimeout(() => setAfter(true), 1100);
    return () => clearTimeout(t);
  }, [active]);
  const coverage = job.matched.length + job.missing.length ? job.matched.length / (job.matched.length + job.missing.length) : null;
  const breakdown = [
    { label: "Calibrated fit", value: pct(job.fitProb), bar: job.fitProb },
    { label: "Fit score", value: job.fitScore == null ? "—" : `${job.fitScore.toFixed(1)}/10`, bar: job.fitScore == null ? null : job.fitScore / 10 },
    { label: "Embedding similarity", value: job.embedSim == null ? "—" : `${simLabel(job.embedSim).split(" ")[0]} · ${job.embedSim.toFixed(2)}`, bar: job.embedSim },
    { label: "Apply probability", value: pct(job.applyProb), bar: job.applyProb },
    { label: "Final rank score", value: job.finalScore == null ? "—" : job.finalScore.toFixed(2), bar: job.finalScore },
  ];
  const b = tailor ? Math.round(tailor.before * 100) : 0;
  const a = tailor ? Math.round(tailor.after * 100) : 0;
  const score = (
    <Card>
      <div className="flex items-center gap-4 p-4">
        <ScoreRing value={job.fitProb} size={64} stroke={5} />
        <div className="min-w-0">
          <p className="text-lg font-semibold tracking-tight">{job.fitProb == null ? "Not scored yet" : `${Math.round(job.fitProb * 100)}% fit`}</p>
          <p className="flex flex-wrap items-center gap-1 text-xs text-fg-muted">
            {job.model ? (
              <>
                Scored by <ScorerChip model={job.model} />
                {job.latencyMs != null && ` in ${job.latencyMs}ms`}
                {job.profileVersion != null && ` · profile v${job.profileVersion}`}
              </>
            ) : (
              "Runs after the next pipeline pass"
            )}
          </p>
        </div>
      </div>
      <dl className="space-y-3 border-t border-border p-4">
        {breakdown.slice(0, mobile ? 3 : 5).map((x, i) => (
          <div key={x.label}>
            <div className="flex items-center justify-between text-[13px]">
              <dt className="text-fg-muted">{x.label}</dt>
              <dd className="font-mono font-medium tabular-nums">{x.value}</dd>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
              <div className="h-full origin-left rounded-full bg-accent transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none" style={{ transform: `scaleX(${after ? Math.max(0, Math.min(1, x.bar ?? 0)) : 0})`, transitionDelay: `${i * 80}ms` }} />
            </div>
          </div>
        ))}
      </dl>
    </Card>
  );
  const skills = (
    <Card>
      <CardHeader title="Skills match" description="Your profile skills vs. this posting" action={coverage != null && <span className="font-mono text-sm font-semibold text-fg tabular-nums">{Math.round(coverage * 100)}%</span>} />
      <div className="space-y-4 p-4">
        {coverage != null && (
          <div className="flex h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
            <div className="h-full bg-good" style={{ width: `${coverage * 100}%` }} />
            <div className="h-full bg-warn/60" style={{ width: `${(1 - coverage) * 100}%` }} />
          </div>
        )}
        <div>
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-medium text-fg-muted">
            <CircleCheck className="size-3.5 text-good" aria-hidden />
            Matched · {job.matched.length}
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {job.matched.length ? (
              job.matched.slice(0, 8).map((x) => (
                <Badge key={x} tone="good">
                  {x}
                </Badge>
              ))
            ) : (
              <p className="text-xs text-fg-subtle">None of your listed skills appear.</p>
            )}
          </div>
        </div>
        <div>
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-medium text-fg-muted">
            <CircleDashed className="size-3.5 text-warn" aria-hidden />
            Missing · {job.missing.length}
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {job.missing.length ? (
              job.missing.slice(0, 6).map((x) => (
                <span key={x} className="inline-flex h-6 items-center rounded-md border border-dashed border-warn/50 px-2 text-xs font-medium text-warn">
                  {x}
                </span>
              ))
            ) : (
              <p className="text-xs text-fg-subtle">No gaps flagged.</p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
  const meter = tailor && (
    <Card className="p-4" data-testid="coverage-meter">
      <div className="flex items-baseline justify-between">
        <p className="text-xs text-fg-muted">Keyword coverage{tailor.sameJob ? "" : " · latest tailored resume"}</p>
        <p className="flex items-center gap-1.5 font-mono text-sm font-semibold tabular-nums">
          <span className="text-fg-subtle">{b}%</span>
          <ArrowRight className="size-3.5 text-fg-subtle" aria-hidden />
          <span className={cn("transition-colors duration-500", after && a > b ? "text-good" : "text-fg")}>{after ? a : b}%</span>
        </p>
      </div>
      <div className="relative mt-2 h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
        <div className="absolute inset-y-0 left-0 w-full origin-left rounded-full bg-good/80 transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none" style={{ transform: `scaleX(${(after ? a : b) / 100})` }} />
        <div className="absolute inset-y-0 left-0 w-full origin-left rounded-full bg-fg-subtle/60" style={{ transform: `scaleX(${b / 100})` }} />
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {tailor.added.map((k, i) => (
          <Badge key={k} tone="accent" className={cn("transition-[opacity,transform] duration-500 motion-reduce:transition-none", after ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0")} style={{ transitionDelay: `${300 + i * 90}ms` }}>
            + {k}
          </Badge>
        ))}
      </div>
    </Card>
  );
  return (
    <div className="mx-auto h-full max-w-6xl px-4 py-6 md:px-8 md:py-8" style={mobile ? { padding: "1.5rem 1rem" } : undefined}>
      <span className="inline-flex items-center gap-1.5 rounded-md text-sm text-fg-muted">
        <ArrowLeft className="size-4" aria-hidden />
        Back to Today
      </span>
      <header className={cn("mt-4 flex gap-4", mobile ? "flex-col" : "items-start")}>
        <CompanyLogo name={job.companyName} domain={job.companyDomain} size={52} />
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold tracking-tight text-balance sm:text-2xl">{job.title}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-fg-muted">
            <span className="font-medium text-fg">{job.companyName}</span>
            <span aria-hidden className="text-fg-subtle">·</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" aria-hidden />
              Posted {job.ago} ago
            </span>
            <span aria-hidden className="text-fg-subtle">·</span>
            <span>via {job.source}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <LocationChips location={job.location} remote={job.remote} />
            {job.seniority && (
              <Badge tone="neutral">
                <Briefcase aria-hidden />
                <span className="capitalize">{job.seniority}</span>
                {job.minExp != null && ` · ${job.minExp}–${job.maxExp ?? "+"} yrs`}
              </Badge>
            )}
            <SalaryBadge salary={job.salary} />
            <ChangeBadges badges={job.badges} />
          </div>
        </div>
        {!mobile && (
          <div className="flex items-center gap-2">
            <Button size="icon" variant="outline" tabIndex={-1}>
              <ThumbsUp />
            </Button>
            <Button size="icon" variant="outline" tabIndex={-1}>
              <ThumbsDown />
            </Button>
            <Button variant="outline" tabIndex={-1}>
              <Bookmark />
              Save
            </Button>
            <Button variant="primary" tabIndex={-1}>
              <Send />
              Apply
            </Button>
          </div>
        )}
      </header>
      {mobile ? (
        <div className="mt-6 flex flex-col gap-4">
          {score}
          {meter}
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-[minmax(0,1fr)_360px] gap-6">
          <div className="flex min-w-0 flex-col gap-4">
            {meter}
            <Card className="min-w-0 p-5 sm:p-7">
              {job.reasons.length > 0 && (
                <ul className="mb-5 space-y-1.5 border-b border-border pb-5">
                  {humanizeReasons(job.reasons)
                    .slice(0, 3)
                    .map((r) => (
                      <li key={r.key}>
                        <ReasonLine reason={r} />
                      </li>
                    ))}
                </ul>
              )}
              <JobDescription md={job.description} source={job.source} />
            </Card>
          </div>
          <aside className="flex min-w-0 flex-col gap-4">
            {score}
            {skills}
          </aside>
        </div>
      )}
    </div>
  );
}

export function MiniHealth({ data, active, mobile }: { data: NonNullable<StackData["health"]>; active: boolean; mobile?: boolean }) {
  const [on, setOn] = useState(true);
  useEffect(() => {
    if (!active) {
      setOn(false);
      return;
    }
    if (reducedMotion()) {
      setOn(true);
      return;
    }
    const t = setTimeout(() => setOn(true), 120);
    return () => clearTimeout(t);
  }, [active]);
  const maxT = Math.max(0.001, ...data.timings.map((x) => x.s));
  const tile = (t: (typeof data.tiles)[number]) => (
    <Card key={t.label} className="px-4 py-3">
      <p className="text-xs text-fg-muted">{t.label}</p>
      <p className="mt-1 font-mono text-xl font-semibold tabular-nums">{t.value}</p>
      <p className={cn("mt-0.5 truncate text-[11px] first-letter:uppercase", t.tone === "good" ? "text-good" : t.tone === "warn" ? "text-warn" : "text-fg-subtle")}>{t.sub}</p>
    </Card>
  );
  return (
    <div className="mx-auto h-full max-w-6xl px-4 py-6 md:px-8 md:py-8" style={mobile ? { padding: "1.5rem 1rem" } : undefined}>
      <PageHeader title="Health" description="Pipeline runs, spend and scorer quality." />
      <div className={cn("mt-5 grid gap-3", mobile ? "grid-cols-2" : "grid-cols-4")}>{data.tiles.map(tile)}</div>
      <div className={cn("mt-4 grid gap-4 [&>*]:min-w-0", mobile ? "grid-cols-1" : "grid-cols-[minmax(0,1fr)_380px]")}>
        <Card>
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold text-fg">New vs. scored per run</h2>
            <p className="mt-0.5 text-xs text-fg-muted">After dedup and hard filters</p>
          </div>
          <div className="h-60 p-3">{on && <RunsChart data={data.runs} />}</div>
        </Card>
        {mobile ? null : data.timings.length > 0 ? (
          <Card>
            <CardHeader title="Stage timings · last run" description={`${data.timings.reduce((a, t) => a + t.s, 0).toFixed(1)}s across ${data.timings.length} stages`} />
            <ul className="space-y-2 p-4">
              {data.timings.map((t, i) => (
                <li key={t.stage} className="grid grid-cols-[minmax(0,128px)_1fr_48px] items-center gap-3 text-[13px]">
                  <span className="truncate text-fg-muted">{t.stage}</span>
                  <span className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                    <span className="block h-full w-full origin-left rounded-full bg-accent/80 transition-transform duration-[800ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none" style={{ transform: `scaleX(${on ? t.s / maxT : 0})`, transitionDelay: `${i * 80}ms` }} />
                  </span>
                  <span className="text-right font-mono text-[11px] text-fg-subtle tabular-nums">{t.s.toFixed(1)}s</span>
                </li>
              ))}
            </ul>
          </Card>
        ) : (
          <Card>
            <CardHeader title="Jobs fetched per run" description="Across all sources" />
            <div className="h-60 p-3">{on && <FetchedChart data={data.runs} />}</div>
          </Card>
        )}
      </div>
    </div>
  );
}
