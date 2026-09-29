"use client";

import { getUserKey } from "@/lib/user-key";

import { useState, useTransition } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowRight, Check, Copy, FileDown, FileText, LoaderCircle, RefreshCcw, ShieldAlert, WandSparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { DiffPane, diffStats } from "@/components/diff-view";
import { ModelChip } from "@/components/model-chip";
import { tailorResumeAction, type TailorOutput } from "@/lib/actions";
import { handleResult } from "@/lib/toast";
import { useHotkeys } from "@/lib/hotkeys";
import { cn, formatDateTime } from "@/lib/utils";

export type SavedVariant = { bodyMd: string; keywordBefore: number; keywordAfter: number; addedKeywords: string[]; model: string; createdAt: string; missing: string[]; invented: string[] };

type View = { bodyMd: string; before: number; after: number; added: string[]; missing: string[]; invented: string[]; keywords: string[]; model: string; saved: boolean; createdAt?: string };

const tabCls =
  "h-8 rounded-md px-2.5 text-[13px] font-medium text-fg-muted transition-colors hover:text-fg data-[state=active]:bg-surface data-[state=active]:text-fg data-[state=active]:shadow-card";

function Meter({ before, after }: { before: number; after: number }) {
  const b = Math.round(before * 100);
  const a = Math.round(after * 100);
  return (
    <div data-testid="coverage-meter">
      <div className="flex items-baseline justify-between">
        <p className="text-xs text-fg-muted">Keyword coverage</p>
        <p className="flex items-center gap-1.5 font-mono text-sm font-semibold tabular-nums">
          <span className="text-fg-subtle">{b}%</span>
          <ArrowRight className="size-3.5 text-fg-subtle" aria-hidden />
          <span className={cn(a > b ? "text-good" : "text-fg")}>{a}%</span>
        </p>
      </div>
      <div className="relative mt-2 h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
        <div className="absolute inset-y-0 left-0 rounded-full bg-good/80 transition-[width] duration-700" style={{ width: `${a}%` }} />
        <div className="absolute inset-y-0 left-0 rounded-full bg-fg-subtle/60" style={{ width: `${b}%` }} />
      </div>
      <p className="mt-1.5 text-[11px] text-fg-subtle">Share of the posting’s keywords surfaced in your summary, experience or projects — not just the skills list.</p>
    </div>
  );
}

export function TailorDrawer({ jobId, original, initial }: { jobId: number; original: string | null; initial: SavedVariant | null }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View | null>(
    initial ? { bodyMd: initial.bodyMd, before: initial.keywordBefore, after: initial.keywordAfter, added: initial.addedKeywords, missing: initial.missing, invented: initial.invented, keywords: [], model: initial.model, saved: true, createdAt: initial.createdAt } : null,
  );
  const [orig, setOrig] = useState(original ?? "");
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);

  const generate = () =>
    start(async () => {
      const res = await tailorResumeAction(jobId, getUserKey());
      if (handleResult(res) && res.data) {
        const d: TailorOutput = res.data;
        setOrig(d.original);
        setView({ bodyMd: d.bodyMd, before: d.before, after: d.after, added: d.added, missing: d.missing, invented: d.invented, keywords: d.keywords, model: d.model, saved: d.saved });
        toast.success(d.saved ? "Tailored resume saved" : "Tailored resume ready", { description: d.saved ? undefined : "Demo mode — not saved to your variants." });
      }
    });

  const openDrawer = () => {
    setOpen(true);
    if (!view && !pending) generate();
  };

  useHotkeys({ t: openDrawer }, { enabled: !open });

  const copy = async () => {
    if (!view) return;
    try {
      await navigator.clipboard.writeText(view.bodyMd);
      setCopied(true);
      toast.success("Markdown copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't access clipboard");
    }
  };

  const print = () => {
    if (!view) return;
    try {
      sessionStorage.setItem(`scout-print-${jobId}`, view.bodyMd);
    } catch {}
    window.open(`/job/${jobId}/resume/print`, "_blank", "noopener");
  };

  const stats = view ? diffStats(orig, view.bodyMd) : null;

  return (
    <>
      <Button variant="outline" onClick={openDrawer} data-testid="tailor-open" title="Tailor resume · T">
        <WandSparkles />
        Tailor resume
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent title="Tailored resume" description="Your resume reordered and emphasised for this job">
          <div className="flex items-start gap-3 border-b border-border px-5 py-4 pr-12">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-soft-fg">
              <FileText className="size-4" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-sm font-semibold">Tailored resume</h2>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-fg-muted">
                {view ? <ModelChip model={view.model} /> : <span>Reorders and emphasises what you’ve already done. Never invents experience.</span>}
                {view?.createdAt && <span className="text-fg-subtle">saved {formatDateTime(view.createdAt)}</span>}
                {view && !view.saved && <span className="text-warn">not saved · demo</span>}
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {pending && !view ? (
              <div className="space-y-3 p-5" aria-busy="true" aria-label="Tailoring">
                <Skeleton className="h-16 w-full" />
                {Array.from({ length: 8 }, (_, i) => (
                  <Skeleton key={i} className={cn("h-3", i % 3 === 0 ? "w-2/3" : "w-full")} />
                ))}
              </div>
            ) : !view ? (
              <div className="p-8 text-center text-sm text-fg-muted">{original ? "Generate a tailored version of your resume." : "Add your resume in Settings to tailor it."}</div>
            ) : (
              <div className="space-y-5 p-5">
                <div className="grid gap-4 rounded-xl border border-border bg-surface-2/60 p-4 sm:grid-cols-[1fr_1fr]">
                  <Meter before={view.before} after={view.after} />
                  <div className="min-w-0 space-y-2.5">
                    <div>
                      <p className="mb-1.5 text-xs text-fg-muted">Surfaced keywords · {view.added.length}</p>
                      <div className="flex flex-wrap gap-1" data-testid="added-keywords">
                        {view.added.length ? (
                          view.added.map((k) => (
                            <span key={k} className="inline-flex h-5 items-center rounded bg-good-soft px-1.5 text-[11px] font-medium text-good">
                              + {k}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-fg-subtle">Already surfaced everything you’ve evidenced.</span>
                        )}
                      </div>
                    </div>
                    {view.missing.length > 0 && (
                      <div>
                        <p className="mb-1.5 text-xs text-fg-muted">In the posting, not on your resume · left out</p>
                        <div className="flex flex-wrap gap-1">
                          {view.missing.slice(0, 10).map((k) => (
                            <span key={k} className="inline-flex h-5 items-center rounded border border-dashed border-border-strong px-1.5 text-[11px] text-fg-subtle">
                              {k}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {view.invented.length > 0 && (
                    <p className="flex items-start gap-2 rounded-lg bg-warn-soft px-3 py-2 text-xs text-warn sm:col-span-2">
                      <ShieldAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                      Check before sending: {view.invented.join(", ")} appear in the tailored version but not in your original resume.
                    </p>
                  )}
                </div>

                <Tabs.Root defaultValue="preview">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Tabs.List aria-label="Resume view" className="inline-flex h-9 items-center gap-0.5 rounded-lg border border-border bg-surface-2 p-0.5">
                      <Tabs.Trigger value="preview" className={tabCls}>
                        Preview
                      </Tabs.Trigger>
                      <Tabs.Trigger value="diff" className={tabCls}>
                        Diff
                      </Tabs.Trigger>
                      <Tabs.Trigger value="markdown" className={tabCls}>
                        Markdown
                      </Tabs.Trigger>
                    </Tabs.List>
                    {stats && (
                      <p className="font-mono text-[11px] tabular-nums text-fg-subtle">
                        <span className="text-good">+{stats.added}</span> <span className="text-bad">−{stats.removed}</span> words
                      </p>
                    )}
                  </div>
                  <Tabs.Content value="preview" className="mt-3 rounded-xl border border-border p-5 outline-none">
                    <article className="prose-job prose-resume text-sm">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{view.bodyMd}</ReactMarkdown>
                    </article>
                  </Tabs.Content>
                  <Tabs.Content value="diff" className="mt-3 outline-none" data-testid="resume-diff">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="min-w-0 rounded-xl border border-border">
                        <p className="border-b border-border px-3 py-2 text-[11px] font-medium text-fg-subtle">Original</p>
                        <DiffPane a={orig} b={view.bodyMd} side="left" className="p-3" />
                      </div>
                      <div className="min-w-0 rounded-xl border border-border">
                        <p className="border-b border-border px-3 py-2 text-[11px] font-medium text-fg-subtle">Tailored</p>
                        <DiffPane a={orig} b={view.bodyMd} side="right" className="p-3" />
                      </div>
                    </div>
                  </Tabs.Content>
                  <Tabs.Content value="markdown" className="mt-3 outline-none">
                    <pre className="overflow-x-auto rounded-xl border border-border bg-surface-2 p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap text-fg-muted">{view.bodyMd}</pre>
                  </Tabs.Content>
                </Tabs.Root>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-border px-5 py-3">
            <Button size="sm" variant="ghost" onClick={generate} disabled={pending}>
              {pending ? <LoaderCircle className="animate-spin" /> : <RefreshCcw />}
              {view ? "Regenerate" : "Generate"}
            </Button>
            <span className="flex-1" />
            <Button size="sm" variant="outline" onClick={copy} disabled={!view}>
              {copied ? <Check className="text-good" /> : <Copy />}
              Copy markdown
            </Button>
            <Button size="sm" variant="primary" onClick={print} disabled={!view}>
              <FileDown />
              Download PDF
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
