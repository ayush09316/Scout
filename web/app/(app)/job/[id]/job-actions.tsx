"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Bookmark, Send, ThumbsDown, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addFeedback } from "@/lib/actions";
import type { FeedbackAction } from "@/lib/db/schema";
import { useHotkeys } from "@/lib/hotkeys";
import { handleResult } from "@/lib/toast";
import { cn } from "@/lib/utils";

const stages: FeedbackAction[] = ["saved", "applied", "interview", "offer", "rejected"];

export function JobActions({ jobId, url, lastAction }: { jobId: number; url: string; lastAction: FeedbackAction | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [state, setState] = useState(lastAction);

  const act = (action: FeedbackAction) =>
    start(async () => {
      if (action === "applied") window.open(url, "_blank", "noopener,noreferrer");
      if (handleResult(await addFeedback(jobId, action), `Marked as ${action}`)) {
        setState(action);
        router.refresh();
      }
    });

  useHotkeys({ u: () => act("up"), d: () => act("down"), s: () => act("saved"), a: () => act("applied"), Escape: () => router.back() });

  return (
    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
      <Button size="icon" variant="outline" aria-label="Good match" aria-pressed={state === "up"} disabled={pending} onClick={() => act("up")} className={cn(state === "up" && "border-good/40 bg-good-soft text-good")}>
        <ThumbsUp />
      </Button>
      <Button size="icon" variant="outline" aria-label="Not a fit" aria-pressed={state === "down"} disabled={pending} onClick={() => act("down")} className={cn(state === "down" && "border-bad/40 bg-bad-soft text-bad")}>
        <ThumbsDown />
      </Button>
      {state && stages.includes(state) && state !== "saved" ? (
        <select
          aria-label="Tracker stage"
          value={state}
          disabled={pending}
          onChange={(e) => act(e.target.value as FeedbackAction)}
          className="h-9 rounded-lg border border-border bg-surface px-3 text-sm font-medium capitalize shadow-card"
        >
          {stages.map((s) => (
            <option key={s} value={s} className="capitalize">
              {s}
            </option>
          ))}
        </select>
      ) : (
        <Button variant="outline" disabled={pending} onClick={() => act("saved")} aria-pressed={state === "saved"} className={cn(state === "saved" && "border-accent/40 bg-accent-soft text-accent-soft-fg")}>
          <Bookmark className={cn(state === "saved" && "fill-current")} />
          {state === "saved" ? "Saved" : "Save"}
        </Button>
      )}
      <Button variant="primary" disabled={pending} onClick={() => act("applied")}>
        <Send />
        Apply
      </Button>
    </div>
  );
}
