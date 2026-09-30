import Link from "next/link";
import { Radar } from "lucide-react";
import { cn } from "@/lib/utils";

export function BrandMark({ className }: { className?: string }) {
  return (
    <span className={cn("flex size-7 items-center justify-center rounded-lg bg-accent text-accent-fg shadow-[inset_0_1px_0_oklch(1_0_0/0.25)]", className)}>
      <Radar className="size-4" aria-hidden />
    </span>
  );
}

export function BrandLink({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 rounded-md text-[15px] font-semibold tracking-tight text-fg">
      <BrandMark />
      Scout
    </Link>
  );
}
