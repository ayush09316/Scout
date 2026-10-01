import { CardSkeleton, PageHeaderSkeleton, Skeleton, TileSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
      <PageHeaderSkeleton title="w-32" description="w-[28rem]" action="w-32" />
      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <TileSkeleton key={i} />
        ))}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <CardSkeleton />
        <CardSkeleton />
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <CardSkeleton key={i} body="h-48" />
        ))}
      </div>
      <Skeleton className="mt-4 h-96 rounded-xl" />
    </div>
  );
}
