import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  visual,
  glow,
  className,
}: {
  icon: LucideIcon;
  title: React.ReactNode;
  description: React.ReactNode;
  action?: React.ReactNode;
  visual?: React.ReactNode;
  glow?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("relative flex flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-border-strong px-6 py-16 text-center", glow && "app-glow", className)}>
      {visual ?? (
        <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-muted text-fg-muted">
          <Icon className="size-5" aria-hidden />
        </div>
      )}
      <h3 className="text-sm font-semibold text-fg">{title}</h3>
      <div className="mt-1 max-w-md text-sm text-fg-muted">{description}</div>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
