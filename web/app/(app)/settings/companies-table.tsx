"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { updateCompany } from "@/lib/actions";
import { handleResult } from "@/lib/toast";
import { cn, timeAgo } from "@/lib/utils";

type Company = { id: number; name: string; ats: string; slug: string; tier: number; active: boolean; lastFetchedAt: string | null; openJobs: number };

export function CompaniesTable({ companies }: { companies: Company[] }) {
  const [rows, setRows] = useState(companies);
  const [q, setQ] = useState("");
  const shown = useMemo(() => rows.filter((c) => (c.name + c.slug + c.ats).toLowerCase().includes(q.toLowerCase())), [rows, q]);

  const patch = async (c: Company, p: { active?: boolean; tier?: number }) => {
    const prev = rows;
    setRows((rs) => rs.map((r) => (r.id === c.id ? { ...r, ...p } : r)));
    const res = await updateCompany(c.id, p);
    if (!handleResult(res, p.active !== undefined ? `${c.name} ${p.active ? "enabled" : "paused"}` : `${c.name} → tier ${p.tier}`)) setRows(prev);
  };

  return (
    <Card>
      <CardHeader
        title="Companies"
        description={`${rows.filter((r) => r.active).length} of ${rows.length} active · tier 1 always bypasses the embedding pre-filter`}
        action={
          <div className="relative hidden sm:block">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-fg-subtle" aria-hidden />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filter"
              aria-label="Filter companies"
              className="h-8 w-44 rounded-lg border border-border bg-surface pr-2 pl-8 text-[13px] focus:border-accent focus:ring-2 focus:ring-ring focus:outline-none"
            />
          </div>
        }
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] text-[13px]">
          <thead>
            <tr className="border-b border-border text-left text-xs text-fg-subtle">
              <th className="px-4 py-2.5 font-medium">Company</th>
              <th className="px-3 py-2.5 font-medium">Source</th>
              <th className="px-3 py-2.5 text-right font-medium">Open</th>
              <th className="px-3 py-2.5 font-medium">Tier</th>
              <th className="px-3 py-2.5 font-medium">Fetched</th>
              <th className="px-4 py-2.5 text-right font-medium">Active</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((c) => (
              <tr key={c.id} className={cn("border-b border-border last:border-0", !c.active && "text-fg-subtle")}>
                <td className="px-4 py-2 font-medium">{c.name}</td>
                <td className="px-3 py-2 font-mono text-xs text-fg-muted">
                  {c.ats}/{c.slug}
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">{c.openJobs}</td>
                <td className="px-3 py-2">
                  <div role="radiogroup" aria-label={`${c.name} tier`} className="inline-flex rounded-md border border-border p-0.5">
                    {[1, 2, 3].map((t) => (
                      <button
                        key={t}
                        role="radio"
                        aria-checked={c.tier === t}
                        onClick={() => c.tier !== t && patch(c, { tier: t })}
                        className={cn("h-6 w-7 rounded font-mono text-xs", c.tier === t ? "bg-accent-soft font-semibold text-accent-soft-fg" : "text-fg-subtle hover:text-fg")}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-2 text-xs text-fg-subtle">{c.lastFetchedAt ? `${timeAgo(c.lastFetchedAt)} ago` : "never"}</td>
                <td className="px-4 py-2 text-right">
                  <Switch checked={c.active} onCheckedChange={(v) => patch(c, { active: v })} aria-label={`${c.name} active`} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
