import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "accent" | "good" | "warn" | "bad" | "outline";

const tones: Record<Tone, string> = {
  neutral: "bg-muted text-fg-muted",
  accent: "bg-accent-soft text-accent-soft-fg",
  good: "bg-good-soft text-good",
  warn: "bg-warn-soft text-warn",
  bad: "bg-bad-soft text-bad",
  outline: "border border-border text-fg-muted",
};

export function Badge({ tone = "neutral", className, ...props }: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn("inline-flex h-6 max-w-full items-center gap-1 truncate rounded-md px-2 text-xs font-medium [&_svg]:size-3 [&_svg]:shrink-0", tones[tone], className)}
      {...props}
    />
  );
}
