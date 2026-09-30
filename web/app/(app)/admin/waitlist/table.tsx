"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Check, ChevronLeft, ChevronRight, Copy, Flame, Search, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { adminDeleteEntry } from "@/lib/waitlist-actions";
import type { WaitlistRow } from "@/lib/waitlist";
import { EXPERIENCE, STAGES } from "@/lib/waitlist-options";
import { cn } from "@/lib/utils";

type Key = "email" | "searchStage" | "roles" | "experience" | "likelihood" | "completedAt" | "referrals" | "createdAt";

const COLS: { key: Key; label: string; className?: string }[] = [
  { key: "email", label: "Email" },
  { key: "searchStage", label: "Stage" },
  { key: "roles", label: "Roles" },
  { key: "experience", label: "Exp" },
  { key: "likelihood", label: "Pay 1–5", className: "text-right" },
  { key: "completedAt", label: "Survey" },
  { key: "referrals", label: "Refs", className: "text-right" },
  { key: "createdAt", label: "Joined" },
];

const PAGE = 25;
const joined = (iso: string) => new Date(iso).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });

const orderOf = (k: Key, r: WaitlistRow) => {
  if (k === "experience") return EXPERIENCE.indexOf(r.experience as (typeof EXPERIENCE)[number]);
  if (k === "searchStage") return STAGES.indexOf(r.searchStage as (typeof STAGES)[number]);
  if (k === "roles") return r.roles.join(", ");
  if (k === "completedAt") return r.completedAt ?? (r.surveyStep > 0 ? `0${r.surveyStep}` : null);
  return r[k];
};

export function CopyLanding() {
  return (
    <Button
      variant="primary"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(window.location.origin + "/");
          toast.success("Landing link copied");
        } catch {
          toast.error("Couldn't copy the link");
        }
      }}
    >
      <Copy aria-hidden />
      Copy landing link
    </Button>
  );
}

export function WaitlistTable({ rows }: { rows: WaitlistRow[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [hot, setHot] = useState(false);
  const [sort, setSort] = useState<{ key: Key; dir: 1 | -1 }>({ key: "createdAt", dir: -1 });
  const [page, setPage] = useState(0);
  const [confirm, setConfirm] = useState<WaitlistRow | null>(null);
  const [pending, start] = useTransition();

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    const base = hot ? rows.filter((r) => r.hot) : rows;
    const list = t ? base.filter((r) => [r.email, r.name, r.searchStage, r.experience, r.payReason, r.source, ...r.roles, ...r.locations].some((v) => v?.toLowerCase().includes(t))) : base;
    return [...list].sort((a, b) => {
      const av = orderOf(sort.key, a);
      const bv = orderOf(sort.key, b);
      const an = av == null || av === "" || av === -1;
      const bn = bv == null || bv === "" || bv === -1;
      if (an !== bn) return an ? 1 : -1;
      if (av === bv) return b.id - a.id;
      return (av! < bv! ? -1 : 1) * sort.dir;
    });
  }, [rows, q, sort, hot]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const cur = Math.min(page, pages - 1);
  const shown = filtered.slice(cur * PAGE, cur * PAGE + PAGE);

  const toggle = (key: Key) => {
    setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: key === "createdAt" || key === "referrals" || key === "likelihood" || key === "completedAt" ? -1 : 1 }));
    setPage(0);
  };

  return (
    <Card>
      <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-fg">Signups</h2>
          <p className="mt-0.5 text-xs text-fg-muted">
            {filtered.length === rows.length ? `${rows.length.toLocaleString("en-IN")} people` : `${filtered.length.toLocaleString("en-IN")} of ${rows.length.toLocaleString("en-IN")} match`}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
        <button
          type="button"
          aria-pressed={hot}
          data-testid="wl-hot-toggle"
          onClick={() => {
            setHot((h) => !h);
            setPage(0);
          }}
          className={cn(
            "inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border px-3 text-sm font-medium shadow-card transition-colors focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none",
            hot ? "border-accent/50 bg-accent-soft text-accent" : "border-border bg-surface text-fg-muted hover:bg-muted hover:text-fg",
          )}
        >
          <Flame className="size-4" aria-hidden />
          Hot leads only
        </button>
        <label className="relative flex w-full items-center sm:w-72">
          <Search className="pointer-events-none absolute left-3 size-4 text-fg-subtle" aria-hidden />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(0);
            }}
            placeholder="Search email, stage, role, city…"
            aria-label="Search signups"
            className="h-9 w-full rounded-lg border border-border bg-surface pr-3 pl-9 text-sm text-fg shadow-card outline-none placeholder:text-fg-subtle focus-visible:border-accent focus-visible:ring-3 focus-visible:ring-ring/30"
          />
        </label>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-[13px]" data-testid="wl-table">
          <thead>
            <tr className="border-b border-border text-left text-xs text-fg-muted">
              {COLS.map((c) => (
                <th key={c.key} scope="col" aria-sort={sort.key === c.key ? (sort.dir === 1 ? "ascending" : "descending") : "none"} className={cn("px-3 py-2 font-medium first:pl-4", c.className)}>
                  <button type="button" onClick={() => toggle(c.key)} className={cn("inline-flex items-center gap-1 rounded hover:text-fg", sort.key === c.key && "text-fg")}>
                    {c.label}
                    {sort.key === c.key && (sort.dir === 1 ? <ArrowUp className="size-3" aria-hidden /> : <ArrowDown className="size-3" aria-hidden />)}
                  </button>
                </th>
              ))}
              <th scope="col" className="w-12 px-3 py-2">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.id} className="border-b border-border last:border-0 hover:bg-surface-2">
                <td className="max-w-[240px] truncate py-2.5 pr-3 pl-4 font-medium text-fg" title={r.email}>
                  {r.email}
                </td>
                <td className="px-3 whitespace-nowrap text-fg-muted">
                  {r.searchStage ?? <Dash />}
                  {r.hot && (
                    <span className="ml-1.5 inline-flex items-center gap-0.5 rounded-full bg-accent-soft px-1.5 py-0.5 align-middle text-[10.5px] font-medium text-accent">
                      <Flame className="size-3" aria-hidden />
                      Hot
                    </span>
                  )}
                </td>
                <td className="max-w-[180px] truncate px-3 text-fg-muted" title={r.roles.join(", ") || undefined}>
                  {r.roles.length ? r.roles.join(", ") : <Dash />}
                </td>
                <td className="px-3 whitespace-nowrap text-fg-muted">{r.experience ?? <Dash />}</td>
                <td className="px-3 text-right font-mono tabular-nums text-fg">{r.likelihood ?? <Dash />}</td>
                <td className="px-3 whitespace-nowrap text-fg-muted">
                  {r.completedAt ? (
                    <span className="inline-flex items-center gap-1 text-good">
                      <Check className="size-3.5" aria-hidden />
                      Done
                    </span>
                  ) : r.surveyStep > 0 ? (
                    `${r.surveyStep}/5`
                  ) : (
                    <Dash />
                  )}
                </td>
                <td className="px-3 text-right font-mono tabular-nums text-fg">{r.referrals}</td>
                <td className="px-3 whitespace-nowrap text-fg-subtle tabular-nums">{joined(r.createdAt)}</td>
                <td className="px-3">
                  <button type="button" onClick={() => setConfirm(r)} aria-label={`Delete ${r.email}`} className="inline-flex size-8 items-center justify-center rounded-md text-fg-subtle hover:bg-bad-soft hover:text-bad">
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={COLS.length + 1} className="px-4 py-10 text-center text-sm text-fg-muted">
                  {q.trim() ? <>No signups match “{q.trim()}”.</> : "No hot leads yet."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {pages > 1 && (
        <div className="flex items-center justify-between border-t border-border px-4 py-2.5 text-xs text-fg-muted">
          <span>
            Page {cur + 1} of {pages}
          </span>
          <div className="flex gap-1">
            <Button size="icon-sm" variant="ghost" disabled={cur === 0} onClick={() => setPage(cur - 1)} aria-label="Previous page">
              <ChevronLeft />
            </Button>
            <Button size="icon-sm" variant="ghost" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)} aria-label="Next page">
              <ChevronRight />
            </Button>
          </div>
        </div>
      )}
      <Dialog open={confirm != null} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent title="Delete signup" className="max-w-sm">
          <div className="p-5">
            <h3 className="text-sm font-semibold text-fg">Delete this signup?</h3>
            <p className="mt-1 text-sm break-all text-fg-muted">{confirm?.email} will be removed permanently. Anyone they referred keeps their spot.</p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirm(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                disabled={pending}
                onClick={() => {
                  const r = confirm;
                  if (!r) return;
                  start(async () => {
                    const res = await adminDeleteEntry(r.id);
                    if (res.ok) {
                      toast.success("Signup deleted");
                      setConfirm(null);
                      router.refresh();
                    } else toast.error(res.error ?? "Couldn't delete");
                  });
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function Dash() {
  return <span className="text-fg-subtle">—</span>;
}
