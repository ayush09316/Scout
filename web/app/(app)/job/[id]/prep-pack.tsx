"use client";

import { getUserKey } from "@/lib/user-key";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import * as Collapsible from "@radix-ui/react-collapsible";
import { Building2, ChevronRight, CircleHelp, Code2, GraduationCap, LoaderCircle, MessageCircleQuestion, Network, RefreshCcw, Sparkles, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ModelChip } from "@/components/model-chip";
import { prepPackAction } from "@/lib/actions";
import type { PrepCategory, PrepPack as Pack } from "@/lib/db/schema";
import { handleResult } from "@/lib/toast";
import { useHotkeys } from "@/lib/hotkeys";
import { cn } from "@/lib/utils";

const CATS: { id: PrepCategory; label: string; icon: typeof Code2 }[] = [
  { id: "technical", label: "Technical", icon: Code2 },
  { id: "system_design", label: "System design", icon: Network },
  { id: "behavioral", label: "Behavioral", icon: Users },
  { id: "company", label: "Company", icon: Building2 },
];

function hashOf(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

function Section({ title, icon: Icon, count, done, children, defaultOpen = true }: { title: string; icon: typeof Code2; count: number; done?: number; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible.Root open={open} onOpenChange={setOpen} className="border-t border-border first:border-t-0">
      <Collapsible.Trigger className="flex w-full items-center gap-2.5 px-4 py-3 text-left hover:bg-surface-2/60">
        <ChevronRight className={cn("size-3.5 text-fg-subtle transition-transform", open && "rotate-90")} aria-hidden />
        <Icon className="size-4 text-fg-subtle" aria-hidden />
        <span className="flex-1 text-[13px] font-semibold">{title}</span>
        {done != null && count > 0 && (
          <span className="flex items-center gap-2">
            <span className="hidden h-1 w-16 overflow-hidden rounded-full bg-muted sm:block" aria-hidden>
              <span className="block h-full rounded-full bg-good transition-[width]" style={{ width: `${(done / count) * 100}%` }} />
            </span>
            <span className="font-mono text-[11px] tabular-nums text-fg-subtle">
              {done}/{count}
            </span>
          </span>
        )}
        {done == null && <span className="font-mono text-[11px] tabular-nums text-fg-subtle">{count}</span>}
      </Collapsible.Trigger>
      <Collapsible.Content className="px-4 pb-3">{children}</Collapsible.Content>
    </Collapsible.Root>
  );
}

export function PrepPack({ jobId, initial, autoGenerate }: { jobId: number; initial: { body: Pack; model: string } | null; autoGenerate: boolean }) {
  const [pack, setPack] = useState(initial);
  const [pending, start] = useTransition();
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const auto = useRef(false);
  const storeKey = useMemo(() => (pack ? `scout-prep-${jobId}-${hashOf(JSON.stringify(pack.body.questions.map((q) => q.q)))}` : null), [pack, jobId]);

  useEffect(() => {
    if (!storeKey) return;
    try {
      const raw = localStorage.getItem(storeKey);
      setChecked(new Set(raw ? (JSON.parse(raw) as string[]) : []));
    } catch {
      setChecked(new Set());
    }
  }, [storeKey]);

  const toggle = (id: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try {
        if (storeKey) localStorage.setItem(storeKey, JSON.stringify([...next]));
      } catch {}
      return next;
    });

  const generate = () =>
    start(async () => {
      const res = await prepPackAction(jobId, getUserKey());
      if (handleResult(res) && res.data) {
        setPack({ body: res.data.body, model: res.data.model });
        toast.success(res.data.saved ? "Prep pack saved" : "Prep pack ready", { description: res.data.saved ? undefined : "Demo mode — not saved." });
      }
    });

  useEffect(() => {
    if (autoGenerate && !pack && !auto.current) {
      auto.current = true;
      generate();
    }
  });

  useHotkeys({ p: () => !pending && (pack ? document.getElementById("prep-pack")?.scrollIntoView({ behavior: "smooth" }) : generate()) });

  const total = pack ? pack.body.questions.length : 0;
  const doneAll = pack ? pack.body.questions.filter((_, i) => checked.has(`q${i}`)).length : 0;

  return (
    <Card id="prep-pack" data-testid="prep-pack" className="overflow-hidden">
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <GraduationCap className="size-4 text-accent" aria-hidden />
            Interview prep
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-fg-muted">
            {pack ? (
              <>
                <ModelChip model={pack.model} />
                <span className="font-mono tabular-nums">
                  {doneAll}/{total} practised
                </span>
              </>
            ) : (
              <span>Likely questions, stories from your resume and what to ask them.</span>
            )}
          </div>
        </div>
        <Button size="sm" variant={pack ? "ghost" : "primary"} onClick={generate} disabled={pending} data-testid="prep-generate">
          {pending ? <LoaderCircle className="animate-spin" /> : pack ? <RefreshCcw /> : <Sparkles />}
          {pack ? "Regenerate" : "Build prep pack"}
        </Button>
      </div>
      {pending && !pack ? (
        <div className="space-y-2.5 p-4" aria-busy="true">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className={cn("h-3", i % 2 ? "w-3/4" : "w-full")} />
          ))}
        </div>
      ) : pack ? (
        <div>
          {CATS.map((c) => {
            const qs = pack.body.questions.map((q, i) => ({ ...q, i })).filter((q) => q.category === c.id);
            if (!qs.length) return null;
            return (
              <Section key={c.id} title={c.label} icon={c.icon} count={qs.length} done={qs.filter((q) => checked.has(`q${q.i}`)).length}>
                <ul className="space-y-1">
                  {qs.map((q) => {
                    const id = `q${q.i}`;
                    const on = checked.has(id);
                    return (
                      <li key={id}>
                        <label className="flex cursor-pointer gap-3 rounded-lg px-2 py-2 hover:bg-surface-2">
                          <input type="checkbox" checked={on} onChange={() => toggle(id)} className="peer sr-only" />
                          <span
                            aria-hidden
                            className={cn(
                              "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ring",
                              on ? "border-good bg-good text-white" : "border-border-strong bg-surface",
                            )}
                          >
                            {on && (
                              <svg viewBox="0 0 12 12" className="ap-pop size-3" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M2.5 6.5 5 9l4.5-6" />
                              </svg>
                            )}
                          </span>
                          <span className="min-w-0">
                            <span className={cn("block text-[13px] leading-snug text-fg", on && "text-fg-subtle line-through decoration-fg-subtle/40")}>{q.q}</span>
                            <span className="mt-0.5 block text-xs text-fg-subtle">{q.why}</span>
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </Section>
            );
          })}
          {pack.body.talking_points.length > 0 && (
            <Section title="Talking points from your resume" icon={MessageCircleQuestion} count={pack.body.talking_points.length} defaultOpen={false}>
              <ul className="space-y-2">
                {pack.body.talking_points.map((t, i) => (
                  <li key={i} className="rounded-lg border border-border bg-surface-2/60 px-3 py-2">
                    <p className="text-[11px] font-medium text-accent">{t.skill}</p>
                    <p className="mt-0.5 text-[13px] leading-snug text-fg-muted">{t.story_from_resume}</p>
                  </li>
                ))}
              </ul>
            </Section>
          )}
          {pack.body.company_notes.length > 0 && (
            <Section title="Company notes" icon={Building2} count={pack.body.company_notes.length} defaultOpen={false}>
              <ul className="space-y-1.5">
                {pack.body.company_notes.map((n, i) => (
                  <li key={i} className="flex gap-2 text-[13px] text-fg-muted">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
                    {n}
                  </li>
                ))}
              </ul>
            </Section>
          )}
          {pack.body.questions_to_ask.length > 0 && (
            <Section title="Questions to ask them" icon={CircleHelp} count={pack.body.questions_to_ask.length} defaultOpen={false}>
              <ol className="list-decimal space-y-1.5 pl-5 text-[13px] text-fg-muted marker:text-fg-subtle">
                {pack.body.questions_to_ask.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ol>
            </Section>
          )}
        </div>
      ) : null}
    </Card>
  );
}
