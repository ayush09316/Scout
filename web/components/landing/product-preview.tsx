import { Activity, Globe, Inbox, MapPin, MessagesSquare, ScanSearch, Search, Settings, SquareKanban, Tags, Wallet } from "lucide-react";
import { ScoreRing } from "@/components/score-ring";
import { salaryLabel, type Salary } from "@/lib/format";
import type { JobListItem } from "@/lib/queries";
import { cn } from "@/lib/utils";

export type PreviewJob = {
  id: string;
  title: string;
  company: string;
  location: string | null;
  remote: boolean;
  seniority: string | null;
  fit: number;
  salary: Salary | null;
  reasons: string[];
  missing: string[];
};

export const SAMPLE_JOBS: PreviewJob[] = [
  {
    id: "s1",
    title: "Senior Backend Engineer, Payments",
    company: "Sample Fintech Co.",
    location: "Bengaluru",
    remote: false,
    seniority: "senior",
    fit: 0.86,
    salary: { kind: "estimate", low: 3800000, high: 5200000, currency: "INR", confidence: 0.62 },
    reasons: ["Python + Postgres at scale", "Event-driven services", "Payments domain"],
    missing: ["Kafka"],
  },
  {
    id: "s2",
    title: "Software Engineer, Platform",
    company: "Sample Dev Tools",
    location: "India",
    remote: true,
    seniority: "mid",
    fit: 0.74,
    salary: { kind: "actual", low: 3000000, high: 4200000, currency: "INR" },
    reasons: ["Kubernetes", "Django / DRF", "Observability"],
    missing: ["Go"],
  },
  {
    id: "s3",
    title: "Full-stack Engineer",
    company: "Sample Commerce",
    location: "Remote",
    remote: true,
    seniority: "mid",
    fit: 0.58,
    salary: null,
    reasons: ["Next.js + TypeScript", "Integrations"],
    missing: ["GraphQL", "Rust"],
  },
];

export function toPreview(jobs: JobListItem[]): PreviewJob[] {
  return jobs.map((j) => ({
    id: String(j.id),
    title: j.title,
    company: j.companyName,
    location: j.location,
    remote: j.remote,
    seniority: j.seniority,
    fit: j.fitProb ?? 0,
    salary: j.salary,
    reasons: j.reasons,
    missing: j.missingSkills,
  }));
}

const NAV = [
  { label: "Today", icon: Inbox, active: true },
  { label: "Tracker", icon: SquareKanban },
  { label: "Label", icon: Tags },
  { label: "Search", icon: ScanSearch },
  { label: "Chat", icon: MessagesSquare },
  { label: "Health", icon: Activity },
  { label: "Settings", icon: Settings },
];

function Chip({ children, tone = "neutral", dashed }: { children: React.ReactNode; tone?: "neutral" | "accent" | "good" | "outline"; dashed?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex h-[22px] max-w-full items-center gap-1 truncate rounded-md px-1.5 text-[11px] font-medium [&_svg]:size-3 [&_svg]:shrink-0",
        tone === "neutral" && "bg-muted text-fg-muted",
        tone === "accent" && "bg-accent-soft text-accent-soft-fg",
        tone === "good" && "bg-good-soft text-good",
        tone === "outline" && "border border-border text-fg-muted",
        dashed && "border-dashed",
      )}
    >
      {children}
    </span>
  );
}

function MiniKey({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-[18px] min-w-[18px] items-center justify-center rounded border border-border bg-surface px-1 font-mono text-[10px] font-medium text-fg-muted shadow-[0_1px_0_var(--border)]">
      {children}
    </kbd>
  );
}

function Card({ job, active }: { job: PreviewJob; active: boolean }) {
  const loc = job.location?.replace(/^Remote\s*/i, "").replace(/[()]/g, "").trim();
  return (
    <div
      className={cn(
        "relative flex gap-3 rounded-xl border bg-surface p-3 sm:gap-4 sm:p-4",
        active ? "border-accent/50 shadow-[0_0_0_3px_var(--accent-soft)]" : "border-border",
      )}
    >
      {active && <span aria-hidden className="absolute top-3 bottom-3 -left-px w-[3px] rounded-full bg-accent" />}
      <ScoreRing value={job.fit} size={44} stroke={4} className="hidden min-[400px]:inline-flex" />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-fg sm:text-sm">{job.title}</p>
            <p className="mt-0.5 truncate text-xs text-fg-muted">{job.company}</p>
          </div>
          <span className="shrink-0 font-mono text-[11px] font-semibold text-fg tabular-nums min-[400px]:hidden">{Math.round(job.fit * 100)}%</span>
        </div>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {job.remote ? (
            <Chip tone="accent">
              <Globe aria-hidden />
              Remote{loc ? ` · ${loc}` : ""}
            </Chip>
          ) : (
            job.location && (
              <Chip>
                <MapPin aria-hidden />
                {job.location}
              </Chip>
            )
          )}
          {job.seniority && <Chip>{job.seniority[0].toUpperCase() + job.seniority.slice(1)}</Chip>}
          {job.salary && (
            <Chip tone={job.salary.kind === "estimate" ? "outline" : "good"} dashed={job.salary.kind === "estimate"}>
              <Wallet aria-hidden />
              {salaryLabel(job.salary)}
            </Chip>
          )}
        </div>
        <div className="mt-2.5 hidden flex-wrap gap-1.5 sm:flex">
          {job.reasons.slice(0, 2).map((r) => (
            <span key={r} className="inline-flex max-w-[16rem] items-center gap-1.5 truncate rounded-md border border-border bg-surface-2 px-1.5 py-0.5 text-[11px] text-fg-muted">
              <span className="size-1.5 shrink-0 rounded-full bg-good" aria-hidden />
              <span className="truncate">{r}</span>
            </span>
          ))}
          {job.missing.slice(0, 1).map((m) => (
            <span key={m} className="inline-flex max-w-[12rem] items-center gap-1.5 truncate rounded-md border border-dashed border-border px-1.5 py-0.5 text-[11px] text-fg-subtle">
              <span className="size-1.5 shrink-0 rounded-full bg-warn" aria-hidden />
              <span className="truncate">{m}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ProductPreview({ jobs, live }: { jobs: PreviewJob[]; live: boolean }) {
  return (
    <div className="landing-rise relative mx-auto w-full max-w-5xl [animation-delay:160ms]" data-testid="product-preview">
      <div aria-hidden className="pointer-events-none absolute -inset-x-10 -top-10 -bottom-16 -z-10 opacity-80 [background:radial-gradient(60%_55%_at_50%_40%,var(--accent-soft),transparent_70%)] sm:-inset-x-20" />
      <div className="rounded-[18px] border border-border bg-surface-2/70 p-1.5 shadow-pop ring-1 ring-black/[0.02] backdrop-blur sm:p-2 dark:ring-white/[0.04]">
        <div className="overflow-hidden rounded-xl border border-border bg-bg" role="img" aria-label="Preview of the Scout Today inbox: ranked job cards with fit scores, location and salary chips, and keyboard shortcuts">
          <div className="flex h-9 items-center gap-2 border-b border-border bg-surface-2 px-3" aria-hidden>
            <span className="flex gap-1.5">
              <span className="size-2.5 rounded-full bg-border-strong" />
              <span className="size-2.5 rounded-full bg-border-strong" />
              <span className="size-2.5 rounded-full bg-border-strong" />
            </span>
            <span className="mx-auto flex h-5 min-w-0 max-w-[16rem] flex-1 items-center justify-center truncate rounded-md bg-muted px-2 font-mono text-[10px] text-fg-subtle">scout / today</span>
            <span className="w-10" />
          </div>
          <div className="grid md:grid-cols-[168px_1fr]" aria-hidden>
            <aside className="hidden flex-col gap-0.5 border-r border-border bg-surface-2/60 p-2.5 md:flex">
              <div className="mb-2 flex h-7 items-center gap-1.5 rounded-md border border-border bg-surface px-2 text-[11px] text-fg-subtle">
                <Search className="size-3" />
                <span className="flex-1">Search jobs…</span>
                <MiniKey>⌘K</MiniKey>
              </div>
              {NAV.map((n) => (
                <div
                  key={n.label}
                  className={cn("flex h-7 items-center gap-2 rounded-md px-2 text-[12px] font-medium", n.active ? "bg-surface text-fg shadow-card ring-1 ring-border" : "text-fg-muted")}
                >
                  <n.icon className={cn("size-3.5", n.active ? "text-accent" : "text-fg-subtle")} />
                  <span className="flex-1">{n.label}</span>
                  
                </div>
              ))}
            </aside>
            <div className="min-w-0 p-3 sm:p-5">
              <div className="flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold tracking-tight text-fg sm:text-base">Today</p>
                  <p className="mt-0.5 truncate text-[11px] text-fg-muted sm:text-xs">{live ? "Live from this morning's run" : "Sample rows"} · ranked by calibrated fit</p>
                </div>
                <div className="flex shrink-0 rounded-lg border border-border bg-surface-2 p-0.5 text-[11px] font-medium">
                  <span className="rounded-md bg-surface px-2 py-0.5 text-fg shadow-card">Top</span>
                  <span className="px-2 py-0.5 text-fg-subtle">Maybe</span>
                  <span className="hidden px-2 py-0.5 text-fg-subtle min-[400px]:inline">All</span>
                </div>
              </div>
              <div className="mt-3 flex flex-col gap-2 sm:mt-4 sm:gap-2.5">
                {jobs.slice(0, 3).map((j, i) => (
                  <Card key={j.id} job={j} active={i === 0} />
                ))}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-border pt-3 text-[11px] text-fg-subtle sm:mt-4">
                <span className="flex items-center gap-1">
                  <MiniKey>J</MiniKey>
                  <MiniKey>K</MiniKey>
                  move
                </span>
                <span className="flex items-center gap-1">
                  <MiniKey>U</MiniKey>
                  <MiniKey>D</MiniKey>
                  rate
                </span>
                <span className="flex items-center gap-1">
                  <MiniKey>S</MiniKey>
                  save
                </span>
                <span className="flex items-center gap-1">
                  <MiniKey>A</MiniKey>
                  apply
                </span>
                <span className="hidden items-center gap-1 sm:flex">
                  <MiniKey>↵</MiniKey>
                  open
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
