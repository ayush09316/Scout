import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn("animate-shimmer rounded-md bg-muted", className)} />;
}

export function PageHeaderSkeleton({ title = "w-32", description = "w-72", action }: { title?: string; description?: string; action?: string }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex h-5 items-center">
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className={cn("h-7", title)} />
        <div className="mt-1 flex h-5 items-center">
          <Skeleton className={cn("h-3.5 max-w-full", description)} />
        </div>
      </div>
      {action && <Skeleton className={cn("h-9 rounded-lg", action)} />}
    </div>
  );
}

export function CardSkeleton({ className, body = "h-60" }: { className?: string; body?: string }) {
  return (
    <div aria-hidden className={cn("rounded-xl border border-border bg-surface shadow-card", className)}>
      <div className="border-b border-border px-4 py-3">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="mt-2.5 h-3 w-52 max-w-full" />
      </div>
      <div className={cn("p-3", body)}>
        <Skeleton className="size-full rounded-lg" />
      </div>
    </div>
  );
}

export function TileSkeleton() {
  return (
    <div aria-hidden className="rounded-xl border border-border bg-surface px-4 py-3 shadow-card">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="mt-2.5 h-6 w-24" />
      <Skeleton className="mt-2 h-3 w-16" />
    </div>
  );
}
