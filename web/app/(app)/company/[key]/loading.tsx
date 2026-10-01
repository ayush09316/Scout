import { CardSkeleton, Skeleton, TileSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
      <div className="flex h-5 items-center">
        <Skeleton className="h-3 w-44" />
      </div>
      <div className="mt-4 flex items-center gap-4">
        <Skeleton className="size-13 rounded-lg" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={i === 4 ? "col-span-2 sm:col-span-1" : undefined}>
            <TileSkeleton />
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <CardSkeleton body="h-56" />
        <div className="flex flex-col gap-4">
          <CardSkeleton body="h-24" />
          <CardSkeleton body="h-24" />
        </div>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          <Skeleton className="mb-3 h-5 w-28" />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4 rounded-xl border border-border bg-surface p-4">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
                <Skeleton className="size-12 rounded-full" />
              </div>
            ))}
          </div>
        </div>
        <CardSkeleton className="self-start" body="h-48" />
      </div>
    </div>
  );
}
