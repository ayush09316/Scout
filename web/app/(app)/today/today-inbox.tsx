"use client";

import { Select } from "@/components/ui/select";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Bookmark, Inbox, Send, SlidersHorizontal, ThumbsDown, ThumbsUp, X } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { CompanyLogo } from "@/components/company-logo";
import { ScoreRing } from "@/components/score-ring";
import { LocationChips, SkillChips } from "@/components/job-chips";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty";
import { Kbd } from "@/components/ui/kbd";
import { addFeedback, undoFeedback } from "@/lib/actions";
import type { FeedbackAction } from "@/lib/db/schema";
import { useHotkeys } from "@/lib/hotkeys";
import type { JobListItem } from "@/lib/queries";
import { handleResult } from "@/lib/toast";
import { cn, timeAgo } from "@/lib/utils";

type Tab = "top" | "maybe" | "all";
type Filters = { remote: "any" | "remote" | "onsite"; location: string; seniority: string; minScore: number; source: string; sort: "score" | "newest" };
const DEFAULT: Filters = { remote: "any", location: "", seniority: "", minScore: 0, source: "", sort: "score" };

const tabs: { id: Tab; label: string; hint: string }[] = [
  { id: "top", label: "Top", hint: "≥ 70% fit" },
  { id: "maybe", label: "Maybe", hint: "40–70%" },
  { id: "all", label: "All", hint: "" },
];

const inTab = (j: JobListItem, t: Tab) => {
  const p = j.fitProb ?? 0;
  return t === "all" ? true : t === "top" ? p >= 0.7 : p >= 0.4 && p < 0.7;
};


const CITIES = ["Bengaluru", "Hyderabad", "Pune", "Mumbai", "Chennai", "Gurugram", "Noida", "Delhi", "Kolkata", "Ahmedabad"];

function places(location: string | null, remote: boolean): string[] {
  const l = (location ?? "").toLowerCase();
  const out = CITIES.filter((c) => l.includes(c.toLowerCase()) || (c === "Bengaluru" && (l.includes("bangalore") || l.includes("blr"))));
  if (remote || l.includes("remote")) out.push(l.includes("india") || out.length ? "Remote · India" : "Remote · Global");
  return out.length ? out : [location ?? "Other"];
}

export function TodayInbox({ jobs }: { jobs: JobListItem[] }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(() => (jobs.some((j) => inTab(j, "top")) ? "top" : jobs.some((j) => inTab(j, "maybe")) ? "maybe" : "all"));
  const [f, setF] = useState<Filters>(DEFAULT);
  const [hidden, setHidden] = useState<Set<number>>(new Set());
  const [sel, setSel] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);

  const options = useMemo(() => {
    const uniq = (xs: (string | null)[]) => [...new Set(xs.filter((x): x is string => !!x))].sort();
    return { locations: uniq(jobs.flatMap((j) => places(j.location, j.remote))), seniority: uniq(jobs.map((j) => j.seniority)), sources: uniq(jobs.map((j) => j.source)) };
  }, [jobs]);

  const filtered = useMemo(() => {
    const out = jobs.filter(
      (j) =>
        !hidden.has(j.id) &&
        (f.remote === "any" || (f.remote === "remote" ? j.remote : !j.remote)) &&
        (!f.location || places(j.location, j.remote).includes(f.location)) &&
        (!f.seniority || j.seniority === f.seniority) &&
        (!f.source || j.source === f.source) &&
        (j.fitProb ?? 0) * 100 >= f.minScore,
    );
    if (f.sort === "newest") out.sort((a, b) => new Date(b.postedAt ?? b.firstSeenAt).getTime() - new Date(a.postedAt ?? a.firstSeenAt).getTime());
    return out;
  }, [jobs, hidden, f]);

  const counts = useMemo(() => Object.fromEntries(tabs.map((t) => [t.id, filtered.filter((j) => inTab(j, t.id)).length])) as Record<Tab, number>, [filtered]);
  const visible = useMemo(() => filtered.filter((j) => inTab(j, tab)), [filtered, tab]);
  const current = visible[Math.min(sel, visible.length - 1)];
  const activeFilters = (Object.keys(DEFAULT) as (keyof Filters)[]).filter((k) => k !== "sort" && f[k] !== DEFAULT[k]).length;

  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${sel}"]`)?.scrollIntoView({ block: "nearest" });
  }, [sel]);

  const act = async (job: JobListItem, action: FeedbackAction) => {
    if (action === "applied") window.open(job.url, "_blank", "noopener,noreferrer");
    const labels: Record<string, string> = { up: "Marked as a good match", down: "Hidden — noted as not a fit", saved: "Saved to tracker", applied: "Logged as applied" };
    const res = await addFeedback(job.id, action);
    if (
      handleResult(res, `${labels[action]} · ${job.companyName}`, {
        undo: async () => {
          if (res.ok && res.data) await undoFeedback(res.data.id);
          setHidden((h) => {
            const n = new Set(h);
            n.delete(job.id);
            return n;
          });
        },
      })
    ) {
      setHidden((h) => new Set(h).add(job.id));
      router.refresh();
    }
  };

  useHotkeys({
    j: () => setSel((s) => Math.min(s + 1, visible.length - 1)),
    k: () => setSel((s) => Math.max(s - 1, 0)),
    ArrowDown: () => setSel((s) => Math.min(s + 1, visible.length - 1)),
    ArrowUp: () => setSel((s) => Math.max(s - 1, 0)),
    enter: () => current && router.push(`/job/${current.id}`),
    o: () => current && router.push(`/job/${current.id}`),
    u: () => current && act(current, "up"),
    d: () => current && act(current, "down"),
    s: () => current && act(current, "saved"),
    a: () => current && act(current, "applied"),
    "1": () => (setTab("top"), setSel(0)),
    "2": () => (setTab("maybe"), setSel(0)),
    "3": () => (setTab("all"), setSel(0)),
  });

  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => {
    setF((p) => ({ ...p, [k]: v }));
    setSel(0);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-8">
      <PageHeader
        title="Today"
        description={
          <>
            {jobs.length - hidden.size} new matches to triage.{" "}
            <span className="hidden md:inline">
              Use <Kbd>J</Kbd> <Kbd>K</Kbd> to move, <Kbd>S</Kbd> save, <Kbd>A</Kbd> apply.
            </span>
          </>
        }
      />

      <div className="sticky top-14 z-20 -mx-4 mt-5 border-b border-border bg-bg/90 px-4 backdrop-blur md:top-0 md:mx-0 md:px-0">
        <div className="flex items-center justify-between gap-2">
          <div role="tablist" aria-label="Match buckets" className="-mb-px flex gap-1 overflow-x-auto">
            {tabs.map((t, i) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                onClick={() => (setTab(t.id), setSel(0))}
                title={`${t.hint} (${i + 1})`}
                className={cn(
                  "flex h-11 items-center gap-2 border-b-2 px-3 text-sm font-medium whitespace-nowrap transition-colors",
                  tab === t.id ? "border-accent text-fg" : "border-transparent text-fg-muted hover:text-fg",
                )}
              >
                {t.label}
                <span className={cn("rounded-full px-1.5 font-mono text-[11px] tabular-nums", tab === t.id ? "bg-accent-soft text-accent-soft-fg" : "bg-muted text-fg-subtle")}>
                  {counts[t.id]}
                </span>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Select ariaLabel="Sort" value={f.sort} onChange={(v) => set("sort", v as Filters["sort"])} options={[{ value: "score", label: "Best match" }, { value: "newest", label: "Newest" }]} className="hidden sm:inline-flex" />
            <Button size="sm" variant={showFilters || activeFilters ? "secondary" : "outline"} onClick={() => setShowFilters((v) => !v)} aria-expanded={showFilters}>
              <SlidersHorizontal />
              Filters
              {activeFilters > 0 && <span className="rounded-full bg-accent px-1.5 text-[10px] text-accent-fg">{activeFilters}</span>}
            </Button>
          </div>
        </div>
        {showFilters && (
          <div className="flex flex-wrap items-center gap-2 pb-3">
            <div role="radiogroup" aria-label="Remote" className="flex h-8 rounded-lg border border-border bg-surface p-0.5 shadow-card">
              {(["any", "remote", "onsite"] as const).map((v) => (
                <button
                  key={v}
                  role="radio"
                  aria-checked={f.remote === v}
                  onClick={() => set("remote", v)}
                  className={cn("rounded-md px-2.5 text-[13px] capitalize", f.remote === v ? "bg-muted font-medium text-fg" : "text-fg-muted hover:text-fg")}
                >
                  {v === "any" ? "Any" : v === "remote" ? "Remote" : "On-site"}
                </button>
              ))}
            </div>
            <Select ariaLabel="Location" value={f.location} onChange={(v) => set("location", v)} options={[{ value: "", label: "All locations" }, ...options.locations.map((l) => ({ value: l, label: l }))]} />
            <Select ariaLabel="Seniority" value={f.seniority} onChange={(v) => set("seniority", v)} options={[{ value: "", label: "Any seniority" }, ...options.seniority.map((l) => ({ value: l, label: l[0].toUpperCase() + l.slice(1) }))]} />
            <Select ariaLabel="Minimum fit" value={String(f.minScore)} onChange={(v) => set("minScore", Number(v))} options={[0, 50, 60, 70, 80, 90].map((v) => ({ value: String(v), label: v === 0 ? "Any fit" : `≥ ${v}% fit` }))} />
            <Select ariaLabel="Source" value={f.source} onChange={(v) => set("source", v)} options={[{ value: "", label: "All sources" }, ...options.sources.map((l) => ({ value: l, label: l[0].toUpperCase() + l.slice(1) }))]} />
            <Select ariaLabel="Sort" value={f.sort} onChange={(v) => set("sort", v as Filters["sort"])} options={[{ value: "score", label: "Best match" }, { value: "newest", label: "Newest" }]} className="sm:hidden" />
            {activeFilters > 0 && (
              <Button size="sm" variant="ghost" onClick={() => setF((p) => ({ ...DEFAULT, sort: p.sort }))}>
                <X />
                Clear
              </Button>
            )}
          </div>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={Inbox}
            title={jobs.length === 0 ? "Inbox zero" : "Nothing in this view"}
            description={
              jobs.length === 0
                ? "You've triaged every match. New roles land after the next daily run at 8:00 IST."
                : tab === "top"
                  ? "No top matches with these filters. Check the Maybe bucket or loosen filters."
                  : "No jobs match these filters."
            }
            action={
              jobs.length === 0 ? (
                <Link href="/tracker" className="text-sm font-medium text-accent hover:underline">
                  Review your tracker →
                </Link>
              ) : (
                <div className="flex gap-2">
                  {activeFilters > 0 && (
                    <Button size="sm" onClick={() => setF(DEFAULT)}>
                      Clear filters
                    </Button>
                  )}
                  {tab !== "all" && (
                    <Button size="sm" variant="primary" onClick={() => setTab(tab === "top" ? "maybe" : "all")}>
                      Show {tab === "top" ? "Maybe" : "All"}
                    </Button>
                  )}
                </div>
              )
            }
          />
        </div>
      ) : (
        <ul ref={listRef} className="mt-4 space-y-2" aria-label="Job matches">
          {visible.map((j, i) => (
            <JobRow key={j.id} job={j} idx={i} selected={i === sel} onSelect={() => setSel(i)} onAct={act} />
          ))}
        </ul>
      )}
    </div>
  );
}

function JobRow({ job, idx, selected, onSelect, onAct }: { job: JobListItem; idx: number; selected: boolean; onSelect: () => void; onAct: (j: JobListItem, a: FeedbackAction) => void }) {
  const posted = job.postedAt ?? job.firstSeenAt;
  return (
    <li
      data-idx={idx}
      data-testid="job-card"
      aria-current={selected ? "true" : undefined}
      onMouseEnter={onSelect}
      className={cn(
        "group relative rounded-xl border bg-surface shadow-card transition-[border-color,box-shadow]",
        selected ? "border-accent/60 ring-2 ring-accent/15" : "border-border hover:border-border-strong",
      )}
    >
      <div className="flex gap-3 p-4 sm:gap-4">
        <CompanyLogo name={job.companyName} domain={job.companyDomain} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <Link href={`/job/${job.id}`} className="block truncate text-[15px] font-semibold text-fg after:absolute after:inset-0 hover:text-accent focus-visible:outline-none">
                {job.title}
              </Link>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-fg-muted">
                <span className="font-medium text-fg">{job.companyName}</span>
                <span aria-hidden className="text-fg-subtle">·</span>
                <span className="text-fg-subtle" title={new Date(posted).toLocaleString()}>
                  {timeAgo(posted)} ago
                </span>
                {job.seniority && (
                  <>
                    <span aria-hidden className="text-fg-subtle">·</span>
                    <span className="capitalize text-fg-subtle">{job.seniority}</span>
                  </>
                )}
              </div>
            </div>
            <ScoreRing value={job.fitProb} size={44} />
          </div>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            <LocationChips location={job.location} remote={job.remote} />
          </div>
          <div className="mt-2 flex items-end gap-3">
            <div className="min-w-0 flex-1">
              <SkillChips reasons={job.reasons} missing={job.missingSkills} maxReasons={2} />
            </div>
            <div className={cn("relative z-10 hidden items-center gap-1 transition-opacity sm:flex sm:opacity-0 sm:group-focus-within:opacity-100 sm:group-hover:opacity-100", selected && "sm:opacity-100")}>
              <RowActions job={job} onAct={onAct} />
            </div>
          </div>
        </div>
      </div>
      <div className="relative z-10 flex items-center gap-1 border-t border-border px-3 py-2 sm:hidden">
        <RowActions job={job} onAct={onAct} mobile />
      </div>
    </li>
  );
}

function RowActions({ job, onAct, mobile }: { job: JobListItem; onAct: (j: JobListItem, a: FeedbackAction) => void; mobile?: boolean }) {
  return (
    <>
      <Button size="icon-sm" variant="ghost" aria-label="Good match (U)" title="Good match · U" onClick={() => onAct(job, "up")}>
        <ThumbsUp />
      </Button>
      <Button size="icon-sm" variant="ghost" aria-label="Not a fit (D)" title="Not a fit · D" onClick={() => onAct(job, "down")}>
        <ThumbsDown />
      </Button>
      {mobile && <span className="flex-1" />}
      <Button size="sm" variant="outline" onClick={() => onAct(job, "saved")} title="Save · S">
        <Bookmark />
        Save
      </Button>
      <Button size="sm" variant="primary" onClick={() => onAct(job, "applied")} title="Apply · A">
        <Send />
        Apply
      </Button>
    </>
  );
}
