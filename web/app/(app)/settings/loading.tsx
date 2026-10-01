import { CardSkeleton, PageHeaderSkeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-8">
      <PageHeaderSkeleton title="w-32" description="w-[34rem]" />
      <div className="mt-6 space-y-6">
        <CardSkeleton body="h-[28rem]" />
        <CardSkeleton body="h-36" />
        <CardSkeleton body="h-44" />
        <CardSkeleton body="h-80" />
      </div>
    </div>
  );
}
