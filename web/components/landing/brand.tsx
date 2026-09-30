import Link from "next/link";
import { Radar } from "lucide-react";
import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn("relative flex size-7 items-center justify-center rounded-lg bg-[linear-gradient(135deg,#6366f1,#a855f7_60%,#fb7185)] text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.35),0_6px_16px_-6px_rgb(99_102_241/0.7)]", className)}>
      <Radar className="size-4" aria-hidden />
    </span>
  );
}

export function BrandLink({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex min-h-11 items-center gap-2 rounded-md text-[15px] font-semibold tracking-tight text-fg">
      <BrandMark />
      Scout
    </Link>
  );
}
