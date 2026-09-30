"use client";

import { useMemo, useState } from "react";
import { ArrowRight, History as HistoryIcon } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { DiffPane, diffStats } from "@/components/diff-view";
import type { JobEvent, JobVersion } from "@/lib/intel";
import { salaryLabel } from "@/lib/format";
import { cn, formatDateTime, istDate } from "@/lib/utils";

const KIND: Record<string, { label: string; dot: string }> = {
  opened: { label: "Posted", dot: "bg-accent" },
  changed: { label: "Description updated", dot: "bg-accent" },
  closed: { label: "Closed", dot: "bg-bad" },
  reopened: { label: "Reopened", dot: "bg-warn" },
  salary_changed: { label: "Salary changed", dot: "bg-good" },
};

const numOr = (v: unknown) => (typeof v === "number" ? v : typeof v === "string" && /^\d+$/.test(v) ? Number(v) : null);

function makeRange(currency: string) {
  return (min: number | null, max: number | null) => {
    if (min == null && max == null) return "—";
    return salaryLabel({ kind: "actual", low: (min ?? max)!, high: max != null && min != null ? max : null, currency });
  };
}

function eventDetail(e: JobEvent, range: (a: number | null, b: number | null) => string) {
  const d = e.detail ?? {};
  if (e.kind === "salary_changed") {
    const o = (d.old ?? d.from ?? {}) as Record<string, unknown>;
    const nw = (d.new ?? d.to ?? {}) as Record<string, unknown>;
    const a = range(numOr(o.min ?? o.salary_min), numOr(o.max ?? o.salary_max));
    const b = range(numOr(nw.min ?? nw.salary_min), numOr(nw.max ?? nw.salary_max));
    if (a !== "—" || b !== "—") return `${a} → ${b}`;
  }
  if (e.kind === "closed" && typeof d.missed_runs === "number") return `Missing from ${d.missed_runs} consecutive runs`;
  if (e.kind === "changed") {
    const out: string[] = [];
    const t = d.title as { old?: string; new?: string } | undefined;
    const l = d.location as { old?: string; new?: string } | undefined;
    if (t?.new) out.push(`Title: ${t.old ?? "—"} → ${t.new}`);
    if (l?.new) out.push(`Location: ${l.old ?? "—"} → ${l.new}`);
    if (typeof d.description_delta === "number") out.push(`Description ${d.description_delta >= 0 ? "+" : ""}${d.description_delta} chars`);
    if (!out.length && Array.isArray(d.fields) && d.fields.length) out.push(`Changed: ${(d.fields as string[]).join(", ")}`);
    if (out.length) return out.join(" · ");
  }
  if (typeof d.note === "string") return d.note;
  return null;
}

type Snap = { id: string; label: string; title: string; location: string | null; salaryMin: number | null; salaryMax: number | null; descriptionMd: string };

export function JobHistory({ events, versions, current, currency, firstSeenAt }: { events: JobEvent[]; versions: JobVersion[]; current: Omit<Snap, "id" | "label">; currency: string; firstSeenAt: string }) {
  const range = makeRange(currency);
  const snaps: Snap[] = useMemo(() => {
    const vs = versions.map((v, i) => ({ ...v, id: String(v.id), label: `v${versions.length - i} · ${formatDateTime(v.capturedAt)}` }));
    const latest = vs[0];
    const same = latest && latest.descriptionMd === current.descriptionMd && latest.title === current.title && latest.location === current.location && latest.salaryMin === current.salaryMin && latest.salaryMax === current.salaryMax;
    return same ? vs : [{ id: "current", label: "Current posting", ...current }, ...vs];
  }, [versions, current]);
  const [bId, setB] = useState(snaps[0]?.id ?? "");
  const [aId, setA] = useState(snaps[1]?.id ?? snaps[0]?.id ?? "");
  const a = snaps.find((s) => s.id === aId) ?? snaps[1];
  const b = snaps.find((s) => s.id === bId) ?? snaps[0];
  const opts = snaps.map((s) => ({ value: s.id, label: s.label }));
  const stats = a && b ? diffStats(a.descriptionMd, b.descriptionMd) : null;

  const changes = events.filter((e) => e.kind !== "opened");
  const quiet = changes.length === 0 && snaps.length < 2;
  const [open, setOpen] = useState(false);

  if (quiet && (!open || !events.length)) {
    return (
      <div data-testid="job-history" className="flex flex-wrap items-center gap-2 rounded-xl border border-dashed border-border px-4 py-3 text-[13px] text-fg-subtle">
        <HistoryIcon className="size-4 shrink-0" aria-hidden />
        <span className="flex-1">No changes since first seen on {istDate(firstSeenAt, true)}.</span>
        {events.length > 0 && (
          <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-8 items-center rounded-md px-2 text-xs font-medium text-fg-muted hover:bg-muted hover:text-fg" aria-expanded={false}>
            Show timeline
          </button>
        )}
      </div>
    );
  }

  const fields = a && b
    ? [
        { k: "Title", x: a.title, y: b.title },
        { k: "Location", x: a.location ?? "—", y: b.location ?? "—" },
        { k: "Salary", x: range(a.salaryMin, a.salaryMax), y: range(b.salaryMin, b.salaryMax) },
      ]
    : [];

  return (
    <Card data-testid="job-history">
      <CardHeader title="History" description={`${events.length} event${events.length === 1 ? "" : "s"} · ${versions.length} captured version${versions.length === 1 ? "" : "s"}`} />
      <div className="grid gap-0 md:grid-cols-[240px_minmax(0,1fr)]">
        <ol className="relative space-y-4 border-b border-border p-4 before:absolute before:top-5 before:bottom-5 before:left-[21px] before:w-px before:bg-border md:border-r md:border-b-0" aria-label="Job events">
          {events.length === 0 && <li className="text-[13px] text-fg-subtle">No events yet.</li>}
          {events.map((e) => {
            const m = KIND[e.kind] ?? { label: e.kind, dot: "bg-fg-subtle" };
            const d = eventDetail(e, range);
            return (
              <li key={e.id} className="relative flex gap-3 pl-0.5">
                <span className={cn("relative mt-1 size-2.5 shrink-0 rounded-full ring-4 ring-surface", m.dot)} aria-hidden />
                <div className="min-w-0 text-[13px]">
                  <p className="font-medium text-fg">{m.label}</p>
                  {d && <p className="text-xs break-words text-fg-muted">{d}</p>}
                  <p className="text-xs text-fg-subtle">{formatDateTime(e.at)}</p>
                </div>
              </li>
            );
          })}
        </ol>
        <div className="min-w-0 p-4" data-testid="version-diff">
          {snaps.length < 2 ? (
            <p className="text-[13px] text-fg-subtle">Only one version captured so far — a diff appears after the posting changes.</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Select ariaLabel="Compare from version" value={aId} onChange={setA} options={opts} className="max-w-[46%] min-w-0 flex-1 sm:flex-none" />
                <ArrowRight className="size-3.5 shrink-0 text-fg-subtle" aria-hidden />
                <Select ariaLabel="Compare to version" value={bId} onChange={setB} options={opts} className="max-w-[46%] min-w-0 flex-1 sm:flex-none" />
                {stats && (
                  <span className="ml-auto font-mono text-[11px] tabular-nums text-fg-subtle">
                    <span className="text-good">+{stats.added}</span> <span className="text-bad">−{stats.removed}</span>
                  </span>
                )}
              </div>
              <dl className="mt-3 divide-y divide-border rounded-lg border border-border text-[13px]">
                {fields.map((f) => {
                  const changed = f.x !== f.y;
                  return (
                    <div key={f.k} className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2", changed && "bg-warn-soft/50")} data-changed={changed || undefined}>
                      <dt className="w-16 shrink-0 text-xs text-fg-subtle">{f.k}</dt>
                      <dd className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                        {changed ? (
                          <>
                            <del className="text-bad decoration-bad/40">{f.x}</del>
                            <ArrowRight className="size-3 text-fg-subtle" aria-hidden />
                            <ins className="font-medium text-good no-underline">{f.y}</ins>
                          </>
                        ) : (
                          <span className="text-fg-muted">{f.y}</span>
                        )}
                      </dd>
                    </div>
                  );
                })}
              </dl>
              <div className="mt-3 max-h-96 overflow-y-auto rounded-lg border border-border p-3">
                {a && b && a.descriptionMd === b.descriptionMd ? <p className="text-[13px] text-fg-subtle">Descriptions are identical.</p> : a && b && <DiffPane a={a.descriptionMd} b={b.descriptionMd} side="inline" />}
              </div>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}
