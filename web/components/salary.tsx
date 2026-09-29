"use client";

import { Wallet } from "lucide-react";
import { Badge } from "./ui/badge";
import { Tip } from "./ui/tooltip";
import { salaryBasisText, salaryLabel, salaryOriginal, type Salary } from "@/lib/format";
import { cn } from "@/lib/utils";

export function SalaryBadge({ salary, className }: { salary: Salary | null; className?: string }) {
  if (!salary) return null;
  const est = salary.kind === "estimate";
  const badge = (
    <Badge tone={est ? "outline" : "good"} className={cn(est && "border-dashed", className)} data-testid="salary">
      <Wallet aria-hidden />
      {salaryLabel(salary)}
    </Badge>
  );
  const orig = salaryOriginal(salary);
  if (!est && !orig) return badge;
  if (!est)
    return (
      <Tip content={<p>Listed as {orig}</p>}>
        <button type="button" className="relative z-10 inline-flex max-w-full rounded-md" aria-label={`${salaryLabel(salary)} — listed as ${orig}`}>
          {badge}
        </button>
      </Tip>
    );
  const conf = Math.round((salary.confidence ?? 0) * 100);
  return (
    <Tip
      content={
        <div className="space-y-1">
          <p className="font-medium text-fg">Estimated salary</p>
          <p>
            Confidence <span className={cn("font-mono tabular-nums", conf < 40 ? "text-warn" : "text-fg")}>{conf}%</span> · {salary.n ?? 0} comparable
            {salary.n === 1 ? "" : "s"}
          </p>
          {conf < 40 && <p className="text-warn">Low confidence — treat as a rough range.</p>}
          <p>{salaryBasisText(salary)}</p>
          {salary.model && <p className="font-mono text-[11px] text-fg-subtle">{salary.model}</p>}
        </div>
      }
    >
      <button type="button" className="relative z-10 inline-flex max-w-full rounded-md" aria-label={`${salaryLabel(salary)} — estimate details`}>
        {badge}
      </button>
    </Tip>
  );
}
