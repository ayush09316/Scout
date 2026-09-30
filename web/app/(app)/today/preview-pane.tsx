"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Bookmark, CircleCheck, CircleDashed, Send, ThumbsDown, ThumbsUp } from "lucide-react";
import { CompanyLogo } from "@/components/company-logo";
import { ScoreRing } from "@/components/score-ring";
import { LocationChips } from "@/components/job-chips";
import { SalaryBadge } from "@/components/salary";
import { ChangeBadges } from "@/components/change-badges";
import { ScorerChip } from "@/components/scorer-chip";
import { ReasonLine } from "@/components/reason-chip";
import { JobDescription } from "@/components/job-description";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Skeleton } from "@/components/ui/skeleton";
import type { FeedbackAction } from "@/lib/db/schema";
import type { JobListItem } from "@/lib/queries";
import { getJobPreview, type JobPreview } from "@/lib/preview-actions";
import { humanizeReasons, simLabel } from "@/lib/reasons";
import { formatDateTime, pct, timeAgo } from "@/lib/utils";

const cache = new Map<number, JobPreview | null>();

function usePreview(id: number) {
  const [data, setData] = useState<{ id: number; v: JobPreview | null } | null>(() => (cache.has(id) ? { id, v: cache.get(id)! } : null));
  const alive = useRef(0);
  useEffect(() => {
    if (cache.has(id)) {
      setData({ id, v: cache.get(id)! });
      return;
    }
    const tick = ++alive.current;
    const t = setTimeout(async () => {
      try {
        const v = await getJobPreview(id);
        cache.set(id, v);
        if (alive.current === tick) setData({ id, v });
      } catch {
        if (alive.current === tick) setData({ id, v: null });
      }
    }, 120);
    return () => clearTimeout(t);
  }, [id]);
  return data?.id === id ? data.v : undefined;
}

function Meter({ label, value, bar, hint }: { label: string; value: string; bar: number | null; hint?: string }) {
  return (
    <div title={hint}>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="text-fg-muted">{label}</span>
        <span className="font-mono font-medium tabular-nums text-fg">{value}</span>
      </div>
      <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted" aria-hidden>
        <div className="h-full rounded-full bg-accent" style={{ width: `${Math.round(Math.max(0, Math.min(1, bar ?? 0)) * 100)}%` }} />
      </div>
    </div>
  );
}

export function PreviewPane({ job, onAct }: { job: JobListItem; onAct: (j: JobListItem, a: FeedbackAction) => void }) {
  const p = usePreview(job.id);
  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [job.id]);
  const posted = job.postedAt ?? job.firstSeenAt;
  const reasons = humanizeReasons(job.reasons);

  return (
    <aside
      aria-label="Job preview"
      data-testid="preview-pane"
      className="sticky top-14 flex max-h-[calc(100dvh-4.5rem)] min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-card"
    >
      <header className="flex items-start gap-3 border-b border-border p-4">
        <CompanyLogo name={job.companyName} domain={job.companyDomain} size={44} />
        <div className="min-w-0 flex-1">
          <Link href={`/job/${job.id}`} className="line-clamp-2 text-base leading-snug font-semibold tracking-tight text-fg hover:text-accent">
            {job.title}
          </Link>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[13px] text-fg-muted">
            <Link href={`/company/${job.companyKey}`} className="font-medium text-fg hover:text-accent hover:underline">
              {job.companyName}
            </Link>
            <span aria-hidden className="text-fg-subtle">·</span>
            <span className="text-fg-subtle" title={formatDateTime(posted)}>
              {timeAgo(posted)} ago
            </span>
            <span aria-hidden className="text-fg-subtle">·</span>
            <span className="text-fg-subtle">via {job.source}</span>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button size="icon-sm" variant="ghost" aria-label="Good match (U)" title="Good match · U" onClick={() => onAct(job, "up")}>
            <ThumbsUp />
          </Button>
          <Button size="icon-sm" variant="ghost" aria-label="Not a fit (D)" title="Not a fit · D" onClick={() => onAct(job, "down")}>
            <ThumbsDown />
          </Button>
          <Button size="sm" variant="outline" onClick={() => onAct(job, "saved")} title="Save · S">
            <Bookmark />
            Save
          </Button>
          <Button size="sm" variant="primary" onClick={() => onAct(job, "applied")} title="Apply · A">
            <Send />
            Apply
          </Button>
        </div>
      </header>

      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto">
        <section className="grid gap-4 border-b border-border p-4 sm:grid-cols-[auto_minmax(0,1fr)]" aria-label="Score breakdown">
          <div className="flex items-center gap-3">
            <ScoreRing value={job.fitProb} size={56} stroke={5} />
            <div>
              <p className="text-sm font-semibold">{job.fitProb == null ? "Not scored" : `${Math.round(job.fitProb * 100)}% fit`}</p>
              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-fg-subtle">
                scored by <ScorerChip model={job.model} />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 self-center">
            {p === undefined ? (
              <>
                <Skeleton className="h-7" />
                <Skeleton className="h-7" />
                <Skeleton className="h-7" />
              </>
            ) : (
              <>
                <Meter label="Profile" value={p?.embedSim == null ? "—" : simLabel(p.embedSim).split(" ")[0]} bar={p?.embedSim ?? null} hint={p?.embedSim == null ? undefined : `Embedding similarity ${p.embedSim.toFixed(2)}`} />
                <Meter label="Fit score" value={p?.fitScore == null ? "—" : `${p.fitScore.toFixed(1)}/10`} bar={p?.fitScore == null ? null : p.fitScore / 10} />
                <Meter label="Apply odds" value={pct(p?.applyProb)} bar={p?.applyProb ?? null} />
              </>
            )}
          </div>
        </section>

        <section className="space-y-4 border-b border-border p-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <LocationChips location={job.location} remote={job.remote} />
            <SalaryBadge salary={job.salary} />
            {job.seniority && (
              <Badge tone="neutral" className="capitalize">
                {job.seniority}
              </Badge>
            )}
            <ChangeBadges badges={job.badges} />
          </div>
          {reasons.length > 0 && (
            <div>
              <h3 className="mb-1.5 text-xs font-medium text-fg-subtle">Why it ranked here</h3>
              <ul className="space-y-1">
                {reasons.slice(0, 4).map((r) => (
                  <li key={r.key}>
                    <ReasonLine reason={r} />
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-fg-muted">
                <CircleCheck className="size-3.5 text-good" aria-hidden />
                Matched{p ? ` · ${p.matched.length}` : ""}
              </h3>
              <div className="flex flex-wrap gap-1">
                {p === undefined ? (
                  <Skeleton className="h-5 w-32" />
                ) : p?.matched.length ? (
                  p.matched.map((s) => (
                    <Badge key={s} tone="good" className="h-5 text-[11px]">
                      {s}
                    </Badge>
                  ))
                ) : (
                  <p className="text-xs text-fg-subtle">None of your listed skills appear.</p>
                )}
              </div>
            </div>
            <div>
              <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-fg-muted">
                <CircleDashed className="size-3.5 text-warn" aria-hidden />
                Missing · {(p?.missing ?? job.missingSkills).length}
              </h3>
              <div className="flex flex-wrap gap-1">
                {(p?.missing ?? job.missingSkills).length ? (
                  (p?.missing ?? job.missingSkills).map((s) => (
                    <span key={s} className="inline-flex h-5 items-center rounded-md border border-dashed border-warn/50 px-1.5 text-[11px] font-medium text-warn">
                      {s}
                    </span>
                  ))
                ) : (
                  <p className="text-xs text-fg-subtle">No gaps flagged.</p>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="p-4" aria-label="Description preview">
          {p === undefined ? (
            <div className="space-y-2">
              <Skeleton className="h-3 w-11/12" />
              <Skeleton className="h-3 w-10/12" />
              <Skeleton className="h-3 w-9/12" />
              <Skeleton className="h-3 w-11/12" />
            </div>
          ) : p ? (
            <JobDescription md={p.descriptionMd} source={job.source} />
          ) : (
            <p className="text-[13px] text-fg-subtle">Couldn’t load the description.</p>
          )}
        </section>
      </div>

      <footer className="flex items-center justify-between gap-2 border-t border-border bg-surface-2/60 px-4 py-2.5">
        <span className="text-[11px] text-fg-subtle">
          <Kbd>J</Kbd> <Kbd>K</Kbd> to move
        </span>
        <Link href={`/job/${job.id}`} className="inline-flex items-center gap-1.5 text-[13px] font-medium text-accent hover:underline">
          Open full page
          <Kbd>↵</Kbd>
          <ArrowUpRight className="size-3.5" aria-hidden />
        </Link>
      </footer>
    </aside>
  );
}
