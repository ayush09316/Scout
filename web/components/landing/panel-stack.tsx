"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { MiniJob, StackData } from "@/lib/landing";
import { cn } from "@/lib/utils";
import { MiniHealth, MiniJob as MiniJobView, MiniShell, MiniToday, MiniTracker } from "./app-mini";
import { reducedMotion } from "./motion";
import { SAMPLE_JOBS } from "./product-preview";

type PanelKey = "today" | "tracker" | "job" | "health";

const TABS: { key: PanelKey; label: string; nav: string; path: string; aria: string }[] = [
  { key: "today", label: "Today", nav: "Today", path: "scout / today", aria: "Animated preview of the Scout Today inbox: jobs arrive, get fit scores, re-order by score, and are triaged with J, K and S keyboard shortcuts" },
  { key: "tracker", label: "Tracker", nav: "Tracker", path: "scout / tracker", aria: "Preview of the Scout Tracker board: a job card moves from Saved to Applied" },
  { key: "job", label: "Job", nav: "Today", path: "scout / job", aria: "Preview of a Scout job page: fit score, score breakdown, skills match and resume keyword coverage before and after tailoring" },
  { key: "health", label: "Health", nav: "Health", path: "scout / health", aria: "Preview of Scout pipeline health: last run, jobs fetched, spend and errors, new versus scored per run and stage timings" },
];

const SAMPLE_NOW = "2026-01-01T02:30:00.000Z";

const sampleJobs: MiniJob[] = SAMPLE_JOBS.map((j, i) => ({
  id: -(i + 1),
  title: j.title,
  companyName: j.company,
  companyDomain: null,
  url: "#",
  location: j.location,
  remote: j.remote,
  seniority: j.seniority,
  source: "sample",
  postedAt: SAMPLE_NOW,
  firstSeenAt: SAMPLE_NOW,
  fitProb: j.fit,
  finalScore: j.fit,
  reasons: j.reasons,
  missingSkills: j.missing,
  model: null,
  lastAction: null,
  companyKey: j.company,
  salary: j.salary,
  badges: [],
  closedAt: null,
  ago: ["2h", "5h", "9h"][i] ?? "1d",
}));

const SAMPLE: Required<{ [K in keyof StackData]: NonNullable<StackData[K]> }> = {
  jobs: sampleJobs,
  counts: { top: 2, maybe: 1, all: 3 },
  nav: { inbox: 3, labeled: 0 },
  briefing: { lastRunAt: null, since: null, newMatches: 0, salaryChanges: 0, reopened: 0, closed: 0 },
  tracker: {
    cards: [
      { id: -1, title: sampleJobs[0].title, companyName: sampleJobs[0].companyName, companyDomain: null, stage: "saved", days: 1, fitProb: sampleJobs[0].fitProb },
      { id: -2, title: sampleJobs[1].title, companyName: sampleJobs[1].companyName, companyDomain: null, stage: "applied", days: 3, fitProb: sampleJobs[1].fitProb },
      { id: -3, title: sampleJobs[2].title, companyName: sampleJobs[2].companyName, companyDomain: null, stage: "interview", days: 2, fitProb: sampleJobs[2].fitProb },
    ],
    funnel: { applied: 2, interview: 1, offer: 0, rejected: 0 },
  },
  job: {
    id: -1,
    title: sampleJobs[0].title,
    companyName: sampleJobs[0].companyName,
    companyDomain: null,
    location: sampleJobs[0].location,
    remote: false,
    seniority: "senior",
    minExp: 4,
    maxExp: 8,
    salary: sampleJobs[0].salary,
    badges: [],
    source: "sample",
    ago: "2h",
    fitProb: 0.86,
    fitScore: 8.4,
    embedSim: 0.78,
    applyProb: 0.64,
    finalScore: 0.81,
    model: null,
    latencyMs: null,
    profileVersion: null,
    seniorityMatch: true,
    scoreSeniority: "senior",
    reasons: sampleJobs[0].reasons,
    matched: ["Python", "Postgres", "Django"],
    missing: ["Kafka"],
    description: "Sample posting. Build and run the payments ledger: idempotent APIs, event-driven settlement and reconciliation on Postgres.",
  },
  tailor: { before: 0.54, after: 0.82, added: ["Kafka", "Idempotency", "Postgres"], sameJob: true },
  health: {
    runs: [14820, 15110, 14960, 15240, 15030, 15390].map((f, i) => ({ day: `Sample ${i + 1}`, run: `#${i + 1}`, fetched: f, new: [412, 377, 298, 451, 336, 389][i], scored: [188, 164, 141, 203, 172, 181][i] })),
    tiles: [
      { label: "Last run", value: "Sample", sub: "ok", tone: "good" },
      { label: "Jobs fetched", value: "15,390", sub: "389 new · 181 scored" },
      { label: "Spend · 6 runs", value: "$0.000", sub: "$0.0000 / run" },
      { label: "Errors · 6 runs", value: "0", sub: "all clear" },
    ],
    timings: [
      { stage: "Fetch", s: 212 },
      { stage: "Score", s: 148 },
      { stage: "Embed", s: 61 },
      { stage: "Dedup", s: 18 },
    ],
    errors: 0,
  },
};

function Chrome({ path, live, children }: { path: string; live: boolean; children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-bg">
      <div className="flex h-9 shrink-0 items-center gap-2 border-b border-border bg-surface-2/80 px-3" aria-hidden>
        <span className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-[#ff5f57]/80" />
          <span className="size-2.5 rounded-full bg-[#febc2e]/80" />
          <span className="size-2.5 rounded-full bg-[#28c840]/80" />
        </span>
        <span className="mx-auto flex h-5 min-w-0 max-w-[14rem] flex-1 items-center justify-center truncate rounded-md bg-muted px-2 font-mono text-[10px] text-fg-subtle">{path}</span>
        <span className={cn("inline-flex h-5 items-center gap-1 rounded-full px-2 font-mono text-[9.5px] font-medium tracking-wider uppercase", live ? "bg-good-soft text-good" : "bg-muted text-fg-subtle")}>
          {live && <span className="size-1.5 rounded-full bg-current motion-safe:animate-pulse" />}
          {live ? "Live" : "Sample"}
        </span>
      </div>
      {children}
    </div>
  );
}

const DESKTOP = { w: 1200, h: 760 };
const MOBILE = { w: 390, h: 700 };

function Canvas({ mobile, children }: { mobile: boolean; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const size = mobile ? MOBILE : DESKTOP;
  const [scale, setScale] = useState(mobile ? 0.86 : 0.84);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fit = () => setScale(el.clientWidth / size.w);
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [size.w]);
  return (
    <div ref={ref} className="relative min-h-0 flex-1 overflow-hidden" style={{ aspectRatio: `${size.w} / ${size.h}` }}>
      <div className="absolute top-0 left-0 origin-top-left" style={{ width: size.w, height: size.h, transform: `scale(${scale})` }}>
        {children}
      </div>
    </div>
  );
}

function useMobile() {
  const [m, setM] = useState(false);
  useEffect(() => {
    const q = window.matchMedia("(max-width: 639px)");
    const on = () => setM(q.matches);
    on();
    q.addEventListener("change", on);
    return () => q.removeEventListener("change", on);
  }, []);
  return m;
}

const DEPTH = [
  { s: 1, y: 0, dim: 0 },
  { s: 0.94, y: -16, dim: 0.35 },
  { s: 0.88, y: -32, dim: 0.6 },
  { s: 0.82, y: -48, dim: 0.8 },
];

export function PanelStack({ data, owner, panels = ["today", "tracker", "job", "health"], compact }: { data: StackData; owner?: boolean; panels?: PanelKey[]; compact?: boolean }) {
  const mobile = useMobile();
  const tabs = TABS.filter((t) => panels.includes(t.key));
  const n = tabs.length;
  const [order, setOrder] = useState<number[]>(() => tabs.map((_, i) => i));
  const [paused, setPaused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [stopped, setStopped] = useState(false);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const uid = useId();
  const front = order[0];

  const bring = useCallback((k: number) => {
    setOrder((o) => (o[0] === k ? o : [k, ...o.filter((x) => x !== k && x !== o[0]), o[0]]));
  }, []);

  const pick = (k: number, focus = false) => {
    setStopped(true);
    bring(k);
    if (focus) tabRefs.current[k]?.focus();
  };

  useEffect(() => {
    const on = () => setHidden(document.visibilityState === "hidden");
    on();
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, []);

  useEffect(() => {
    if (stopped || paused || hidden || reducedMotion()) return;
    const t = setTimeout(() => bring((front + 1) % n), front === 0 && !compact ? 11000 : 7000);
    return () => clearTimeout(t);
  }, [front, stopped, paused, hidden, n, bring, compact]);

  const onKey = (e: React.KeyboardEvent) => {
    const map: Record<string, number> = {
      ArrowRight: (front + 1) % n,
      ArrowLeft: (front - 1 + n) % n,
      Home: 0,
      End: n - 1,
    };
    if (!(e.key in map)) return;
    e.preventDefault();
    pick(map[e.key], true);
  };

  const render = (key: PanelKey, active: boolean) => {
    const tab = TABS.find((t) => t.key === key)!;
    const live = { today: Boolean(data.jobs), tracker: Boolean(data.tracker), job: Boolean(data.job), health: Boolean(data.health) }[key];
    const jobs = data.jobs ?? SAMPLE.jobs;
    const body =
      key === "today" ? (
        <MiniToday jobs={jobs} counts={data.counts ?? SAMPLE.counts} briefing={data.jobs ? data.briefing : null} total={data.jobs ? (data.nav?.inbox ?? data.counts?.all ?? jobs.length) : jobs.length} active={active} mobile={mobile} />
      ) : key === "tracker" ? (
        <MiniTracker data={data.tracker ?? SAMPLE.tracker} active={active} mobile={mobile} />
      ) : key === "job" ? (
        <MiniJobView job={data.job ?? SAMPLE.job} tailor={data.job ? data.tailor : SAMPLE.tailor} active={active} mobile={mobile} />
      ) : (
        <MiniHealth data={data.health ?? SAMPLE.health} active={active} mobile={mobile} />
      );
    return (
      <Chrome path={tab.path} live={live}>
        <div role="img" aria-label={tab.aria} className="flex min-h-0 flex-1 flex-col">
          <Canvas mobile={mobile}>
            <div inert aria-hidden className="h-full select-none">
              <MiniShell active={tab.nav} nav={data.nav ?? (data.jobs ? null : SAMPLE.nav)} owner={owner} mobile={mobile}>
                {body}
              </MiniShell>
            </div>
          </Canvas>
        </div>
      </Chrome>
    );
  };

  const indicator = order[0];

  return (
    <div
      className="relative"
      data-testid="product-preview"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPaused(false);
      }}
    >
      <div className="mb-4 flex justify-center sm:mb-5">
        <div className="max-w-full overflow-x-auto rounded-full [scrollbar-width:none]">
          <div
            role="tablist"
            aria-label="Scout product previews"
            className="lx-glass relative grid rounded-full p-1"
            style={{
              gridTemplateColumns: `repeat(${n}, minmax(4.75rem, 1fr))`,
            }}
            onKeyDown={onKey}
          >
            <span
              aria-hidden
              className="absolute inset-y-1 left-1 rounded-full bg-fg shadow-[0_6px_20px_-8px_rgb(99_102_241/0.6)] transition-transform duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
              style={{
                width: `calc((100% - 0.5rem) / ${n})`,
                transform: `translateX(${indicator * 100}%)`,
              }}
            />
            {tabs.map((t, i) => (
              <button
                key={t.key}
                ref={(el) => {
                  tabRefs.current[i] = el;
                }}
                type="button"
                role="tab"
                id={`${uid}-tab-${t.key}`}
                aria-selected={front === i}
                aria-controls={`${uid}-panel-${t.key}`}
                tabIndex={front === i ? 0 : -1}
                data-testid={`stack-tab-${t.key}`}
                onClick={() => pick(i)}
                className={cn(
                  "relative z-10 h-8 rounded-full px-3 text-[12.5px] font-medium whitespace-nowrap transition-colors duration-300 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg focus-visible:outline-none sm:px-4 sm:text-[13px]",
                  front === i ? "text-bg" : "text-fg-muted hover:text-fg",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-6 top-8 -bottom-10 -z-10 rounded-[40px] bg-[conic-gradient(from_180deg_at_50%_50%,rgb(99_102_241/0.35),rgb(168_85_247/0.3),rgb(251_113_133/0.22),rgb(99_102_241/0.35))] opacity-60 blur-3xl dark:opacity-70"
      />
      <div className="relative grid" style={{ paddingTop: (n - 1) * 16 }}>
        {tabs.map((t, i) => {
          const d = order.indexOf(i);
          const p = DEPTH[Math.min(d, DEPTH.length - 1)];
          const isFront = d === 0;
          return (
            <div
              key={t.key}
              id={`${uid}-panel-${t.key}`}
              role="tabpanel"
              aria-labelledby={`${uid}-tab-${t.key}`}
              aria-hidden={!isFront}
              inert={!isFront}
              data-testid={`stack-panel-${t.key}`}
              data-front={isFront}
              onClick={isFront ? undefined : () => pick(i)}
              className={cn("relative [grid-area:1/1] origin-top transition-[transform,opacity] duration-[600ms] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform motion-reduce:transition-none", !isFront && "cursor-pointer")}
              style={{
                zIndex: 10 - d,
                transform: `translateY(${p.y}px) scale(${p.s})`,
                opacity: d > 3 ? 0 : 1,
              }}
            >
              <div className={cn("relative h-full rounded-[22px] bg-bg p-1.5 sm:p-2", isFront ? "shadow-[var(--lx-glow),0_1px_0_var(--lx-glass-line)] ring-1 ring-[var(--lx-glass-line)]" : "shadow-[0_-8px_24px_-16px_rgb(0_0_0/0.35)] ring-1 ring-border")}>
                <div className="lx-glass pointer-events-none absolute inset-0 rounded-[22px]" />
                <div className="relative h-full">{render(t.key, isFront)}</div>
                <div className="pointer-events-none absolute inset-0 rounded-[22px] bg-bg transition-opacity duration-[600ms] motion-reduce:transition-none" style={{ opacity: p.dim }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
