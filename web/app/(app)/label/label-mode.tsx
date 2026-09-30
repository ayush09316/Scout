"use client";

import Link from "next/link";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowRight, Check, PartyPopper, Undo2, X } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { CompanyLogo } from "@/components/company-logo";
import { LocationChips } from "@/components/job-chips";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty";
import { Kbd } from "@/components/ui/kbd";
import { labelJob, unlabelJob } from "@/lib/actions";
import { useHotkeys } from "@/lib/hotkeys";
import type { LabelItem } from "@/lib/queries";
import { handleResult } from "@/lib/toast";
import { cn, timeAgo } from "@/lib/utils";

type Item = LabelItem & { split: "dev" | "test" };
type Hist = { idx: number; label: "fit" | "no" | "skip" };

export function LabelMode({ queue, labeled, fit, target }: { queue: Item[]; labeled: number; fit: number; target: number }) {
  const [idx, setIdx] = useState(0);
  const [hist, setHist] = useState<Hist[]>([]);
  const [count, setCount] = useState({ n: labeled, fit });
  const [flash, setFlash] = useState<"fit" | "no" | null>(null);
  const job = queue[idx];

  const mark = async (label: "fit" | "no") => {
    if (!job) return;
    const res = await labelJob(job.id, label);
    if (!handleResult(res)) return;
    setFlash(label);
    setTimeout(() => setFlash(null), 180);
    setHist((h) => [...h, { idx, label }]);
    setCount((c) => ({ n: c.n + 1, fit: c.fit + (label === "fit" ? 1 : 0) }));
    setIdx((i) => i + 1);
  };

  const skip = () => {
    if (!job) return;
    setHist((h) => [...h, { idx, label: "skip" }]);
    setIdx((i) => i + 1);
  };

  const back = async () => {
    const last = hist[hist.length - 1];
    if (!last) return;
    if (last.label !== "skip") {
      const res = await unlabelJob(queue[last.idx].id);
      if (!handleResult(res)) return;
      setCount((c) => ({ n: c.n - 1, fit: c.fit - (last.label === "fit" ? 1 : 0) }));
    }
    setHist((h) => h.slice(0, -1));
    setIdx(last.idx);
  };

  useHotkeys({ y: () => mark("fit"), n: () => mark("no"), k: back, ArrowRight: skip, " ": skip, ArrowLeft: back });

  const progress = Math.min(1, count.n / target);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-8 md:py-8">
      <PageHeader
        title="Label"
        description="Build the eval set. Label honestly — these numbers end up in the README."
        actions={
          <span className="text-xs text-fg-subtle">
            {count.fit} fit · {count.n - count.fit} no
          </span>
        }
      />
      <div className="mt-5">
        <div className="flex items-baseline justify-between text-[13px]">
          <span className="font-medium">
            <span className="font-mono tabular-nums" data-testid="label-count">
              {count.n}
            </span>{" "}
            / {target} labeled
          </span>
          <span className="font-mono text-xs tabular-nums text-fg-subtle">{Math.round(progress * 100)}%</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={count.n} aria-valuemin={0} aria-valuemax={target} aria-label="Labeling progress">
          <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${progress * 100}%` }} />
        </div>
      </div>

      {count.n < 20 && (
        <section data-testid="label-intro" className="app-glow relative mt-5 overflow-hidden rounded-xl border border-border bg-surface px-5 py-4 shadow-card">
          <h2 className="text-[15px] font-semibold tracking-tight">
            Why label? <span className="font-serif text-lg font-normal italic">Honest numbers.</span>
          </h2>
          <p className="mt-1 text-[13px] text-fg-muted">
            Every Fit / Not-a-fit becomes ground truth for the eval on Health — precision@10, recall@50 and the calibration curve all come from these labels, split deterministically into dev and test.
          </p>
          <ul className="mt-3 grid gap-2 text-xs text-fg-muted sm:grid-cols-3">
            <li className="rounded-lg bg-surface-2 px-3 py-2">
              <span className="block font-mono text-sm font-semibold text-fg tabular-nums">{count.n}</span>labelled so far
            </li>
            <li className="rounded-lg bg-surface-2 px-3 py-2">
              <span className="block font-mono text-sm font-semibold text-fg tabular-nums">{target}</span>target before <code className="font-mono text-[11px]">scout eval</code>
            </li>
            <li className="rounded-lg bg-surface-2 px-3 py-2">
              <span className="block font-mono text-sm font-semibold text-fg">
                <Kbd>Y</Kbd> <Kbd>N</Kbd>
              </span>
              one key per job
            </li>
          </ul>
        </section>
      )}

      {!job ? (
        <div className="mt-8">
          <EmptyState
            icon={PartyPopper}
            glow
            title={count.n >= target ? <>Eval set <span className="font-serif text-base font-normal italic">complete</span></> : "Queue empty"}
            description={count.n >= target ? "You hit the target. Run `scout eval` to compute P@10, recall@50 and ECE." : `No unlabeled jobs left right now — ${Math.max(0, target - count.n)} more to reach ${target}. New ones arrive with each run.`}
            action={
              <Link href="/health" className="text-sm font-medium text-accent hover:underline">
                See eval results →
              </Link>
            }
          />
        </div>
      ) : (
        <article
          key={job.id}
          data-testid="label-card"
          className={cn(
            "mt-6 overflow-hidden rounded-xl border bg-surface shadow-card transition-colors duration-150",
            flash === "fit" ? "border-good" : flash === "no" ? "border-bad" : "border-border",
          )}
        >
          <header className="flex gap-4 border-b border-border p-5">
            <CompanyLogo name={job.companyName} domain={job.companyDomain} size={44} />
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold tracking-tight">{job.title}</h2>
              <p className="mt-0.5 text-sm text-fg-muted">
                {job.companyName} · {timeAgo(job.postedAt ?? job.firstSeenAt)} ago
                {job.seniority && <span className="capitalize"> · {job.seniority}</span>}
              </p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                <LocationChips location={job.location} remote={job.remote} />
                <Badge tone="outline" title="Deterministic split by job id hash">
                  {job.split} split
                </Badge>
              </div>
            </div>
          </header>
          <div className="prose-job max-h-[42vh] overflow-y-auto p-5 text-sm">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{job.descriptionMd}</ReactMarkdown>
          </div>
          <footer className="grid grid-cols-[auto_1fr_1fr] gap-2 border-t border-border bg-surface-2/60 p-3 sm:grid-cols-[auto_auto_1fr_1fr]">
            <Button variant="ghost" onClick={back} disabled={hist.length === 0} aria-label="Back (K)">
              <Undo2 />
              <span className="hidden sm:inline">Back</span>
              <Kbd className="hidden sm:inline-flex">K</Kbd>
            </Button>
            <Button variant="ghost" onClick={skip} className="hidden sm:inline-flex">
              Skip
              <ArrowRight />
            </Button>
            <Button variant="outline" onClick={() => mark("no")} className="hover:border-bad/50 hover:text-bad">
              <X />
              Not a fit
              <Kbd className="hidden sm:inline-flex">N</Kbd>
            </Button>
            <Button variant="primary" onClick={() => mark("fit")}>
              <Check />
              Fit
              <Kbd className="hidden border-white/20 bg-white/15 text-accent-fg sm:inline-flex">Y</Kbd>
            </Button>
          </footer>
        </article>
      )}
      {job && <p className="mt-3 text-center text-xs text-fg-subtle">{queue.length - idx} left in this batch</p>}
    </div>
  );
}
