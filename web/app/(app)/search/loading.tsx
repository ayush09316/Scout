import { PageHeaderSkeleton, Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-8">
      <PageHeaderSkeleton title="w-28" description="w-[30rem]" />
      <Skeleton className="mt-5 h-14 w-full rounded-xl" />
      <div className="mt-3 flex flex-wrap gap-2">
        {["w-48", "w-32", "w-32", "w-24", "w-28", "w-28", "w-44"].map((w, i) => (
          <Skeleton key={i} className={`h-8 rounded-lg ${w}`} />
        ))}
      </div>
      <div className="mt-8">
        <Skeleton className="mb-2 h-3 w-8" />
        <div className="flex flex-wrap gap-2">
          {["w-56", "w-44", "w-64", "w-48"].map((w, i) => (
            <Skeleton key={i} className={`h-8 rounded-lg ${w}`} />
          ))}
        </div>
      </div>
    </div>
  );
}
