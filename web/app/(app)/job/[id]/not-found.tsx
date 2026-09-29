import Link from "next/link";
import { SearchX } from "lucide-react";
import { EmptyState } from "@/components/ui/empty";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <EmptyState
        icon={SearchX}
        title="Job not found"
        description="It may have been closed or merged into a duplicate."
        action={
          <Link href="/today" className="text-sm font-medium text-accent hover:underline">
            Back to Today →
          </Link>
        }
      />
    </div>
  );
}
