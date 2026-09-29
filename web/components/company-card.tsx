import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Card } from "./ui/card";
import { VelocitySparkline } from "./sparkline";
import type { CompanyIntel } from "@/lib/intel";
import { lpa } from "@/lib/format";

export function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-[11px] text-fg-subtle">{label}</p>
      <p className="mt-0.5 truncate font-mono text-[15px] font-semibold tabular-nums text-fg">{value}</p>
      {sub && <p className="truncate text-[11px] text-fg-subtle">{sub}</p>}
    </div>
  );
}

export function CompanyCard({ intel }: { intel: CompanyIntel }) {
  return (
    <Card data-testid="company-card">
      <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold">{intel.name}</h2>
          <p className="mt-0.5 text-xs text-fg-muted">Hiring activity · last 12 weeks</p>
        </div>
        <Link href={`/company/${intel.key}`} className="inline-flex shrink-0 items-center gap-0.5 text-xs font-medium text-accent hover:underline">
          Company intel
          <ArrowUpRight className="size-3.5" aria-hidden />
        </Link>
      </div>
      <div className="px-4 pt-3">
        <VelocitySparkline data={intel.velocity} id={`card-${intel.key}`} height={48} />
      </div>
      <div className="grid grid-cols-3 gap-3 px-4 py-3">
        <Stat label="Open roles" value={intel.openJobs} sub={`${intel.matches} match${intel.matches === 1 ? "" : "es"}`} />
        <Stat label="30d opened" value={<span className="text-good">+{intel.opened30d}</span>} sub={`${intel.closed30d} closed`} />
        <Stat label="Median pay" value={intel.medianSalary ? lpa(intel.medianSalary).replace(" LPA", "") : "—"} sub={intel.medianSalary ? "LPA" : "no data"} />
      </div>
      {intel.topSkills.length > 0 && (
        <div className="flex flex-wrap gap-1 border-t border-border px-4 py-3">
          {intel.topSkills.slice(0, 6).map((s) => (
            <span key={s.skill} className="inline-flex h-5 items-center rounded border border-border bg-surface-2 px-1.5 text-[11px] text-fg-muted">
              {s.skill}
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}
