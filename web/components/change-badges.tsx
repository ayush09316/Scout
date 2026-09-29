import { ArrowDown, ArrowUp, RefreshCcw, RotateCcw } from "lucide-react";
import type { JobBadge } from "@/lib/queries";

const META: Record<JobBadge, { label: string; icon: typeof ArrowUp; cls: string }> = {
  updated: { label: "Updated", icon: RefreshCcw, cls: "bg-accent-soft text-accent-soft-fg" },
  reopened: { label: "Reopened", icon: RotateCcw, cls: "bg-warn-soft text-warn" },
  salary_up: { label: "Salary ↑", icon: ArrowUp, cls: "bg-good-soft text-good" },
  salary_down: { label: "Salary ↓", icon: ArrowDown, cls: "bg-bad-soft text-bad" },
};

export function ChangeBadges({ badges }: { badges: JobBadge[] }) {
  if (!badges.length) return null;
  const order: JobBadge[] = ["reopened", "salary_up", "salary_down", "updated"];
  return (
    <>
      {order
        .filter((b) => badges.includes(b))
        .map((b) => {
          const m = META[b];
          return (
            <span key={b} data-testid="change-badge" className={`inline-flex h-5 items-center gap-1 rounded px-1.5 text-[11px] font-medium ${m.cls}`}>
              {b !== "salary_up" && b !== "salary_down" && <m.icon className="size-3" aria-hidden />}
              {m.label}
            </span>
          );
        })}
    </>
  );
}
