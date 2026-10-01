import { PageHeaderSkeleton, Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 md:px-8 md:py-8">
      <PageHeaderSkeleton title="w-24" description="w-96" />
      <div className="mt-5">
        <div className="flex h-5 items-center justify-between">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-3 w-8" />
        </div>
        <Skeleton className="mt-2 h-2 w-full rounded-full" />
      </div>
      <div className="mt-6 overflow-hidden rounded-xl border border-border bg-surface shadow-card">
        <div className="flex gap-4 border-b border-border p-5">
          <Skeleton className="size-11 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </div>
        <div className="space-y-2.5 p-5">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className={i % 3 === 2 ? "h-4 w-2/3" : "h-4 w-full"} />
          ))}
        </div>
        <div className="flex gap-2 border-t border-border p-4">
          <Skeleton className="h-9 flex-1 rounded-lg" />
          <Skeleton className="h-9 flex-1 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
