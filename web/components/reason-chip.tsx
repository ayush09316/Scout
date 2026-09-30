"use client";

import { Tip } from "./ui/tooltip";
import type { Reason } from "@/lib/reasons";
import { cn } from "@/lib/utils";

export function ReasonChip({ reason, className }: { reason: Reason; className?: string }) {
  const chip = (
    <span className={cn("inline-flex max-w-full items-center gap-1.5 truncate rounded-md sm:max-w-[18rem] border border-border bg-surface-2 px-2 py-0.5 text-xs text-fg-muted", className)}>
      <span className="size-1.5 shrink-0 rounded-full bg-good" aria-hidden />
      <span className="truncate">{reason.text}</span>
    </span>
  );
  if (!reason.detail) return chip;
  return (
    <Tip content={reason.detail}>
      <button type="button" className="relative z-10 inline-flex max-w-full rounded-md" aria-label={`${reason.text} — ${reason.detail}`}>
        {chip}
      </button>
    </Tip>
  );
}

export function ReasonLine({ reason }: { reason: Reason }) {
  const body = (
    <span className="flex gap-2 text-[13px] text-fg-muted">
      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-good" aria-hidden />
      <span className={cn(reason.detail && "underline decoration-border-strong decoration-dotted underline-offset-4")}>{reason.text}</span>
    </span>
  );
  if (!reason.detail) return body;
  return (
    <Tip content={reason.detail}>
      <button type="button" className="rounded-md text-left" aria-label={`${reason.text} — ${reason.detail}`}>
        {body}
      </button>
    </Tip>
  );
}
