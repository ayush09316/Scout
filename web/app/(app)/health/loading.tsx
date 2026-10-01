import { CardSkeleton, PageHeaderSkeleton, Skeleton, TileSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
      <PageHeaderSkeleton title="w-28" description="w-64" />
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <TileSkeleton key={i} />
        ))}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <CardSkeleton body="h-36" />
        <CardSkeleton body="h-36" />
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="rounded-xl border border-border bg-surface shadow-card">
          <div className="border-b border-border px-4 py-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="mt-2.5 h-3 w-56 max-w-full" />
          </div>
          <div className="space-y-3 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-full" />
            ))}
          </div>
        </div>
        <CardSkeleton body="h-64" />
      </div>
    </div>
  );
}
