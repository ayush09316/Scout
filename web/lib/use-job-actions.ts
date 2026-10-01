"use client";

import { useRouter } from "next/navigation";
import { addFeedback, addFeedbackBatch, labelJob, labelJobs, undoFeedback, undoFeedbackBatch, unlabelJob, unlabelJobs, type ActionResult } from "./actions";
import type { FeedbackAction } from "./db/schema";
import type { JobListItem } from "./queries";
import { handleResult } from "./toast";

const ONE: Partial<Record<FeedbackAction, string>> = { up: "Marked as a good match", down: "Hidden — noted as not a fit", saved: "Saved to tracker", applied: "Logged as applied" };
const MANY: Partial<Record<FeedbackAction, (n: string) => string>> = {
  up: (n) => `Marked ${n} as good matches`,
  down: (n) => `Dismissed ${n}`,
  saved: (n) => `Saved ${n} to tracker`,
  applied: (n) => `Logged ${n} as applied`,
};

export const jobsN = (n: number) => `${n.toLocaleString("en-IN")} job${n === 1 ? "" : "s"}`;

export type JobActions = ReturnType<typeof useJobActions>;

export function useJobActions({ hide, restore }: { hide?: (ids: number[]) => void; restore?: (ids: number[]) => void } = {}) {
  const router = useRouter();

  const feedback = async (jobs: JobListItem[], action: FeedbackAction) => {
    if (!jobs.length) return false;
    const ids = jobs.map((j) => j.id);
    const one = jobs.length === 1;
    if (one && action === "applied") window.open(jobs[0].url, "_blank", "noopener,noreferrer");
    const res: ActionResult<{ id: number } | { ids: number[] }> = one ? await addFeedback(ids[0], action) : await addFeedbackBatch(ids, action);
    const fb = res.ok && res.data ? ("id" in res.data ? [res.data.id] : res.data.ids) : [];
    const msg = one ? `${ONE[action] ?? "Updated"} · ${jobs[0].companyName}` : (MANY[action]?.(jobsN(ids.length)) ?? `Updated ${jobsN(ids.length)}`);
    const ok = handleResult(res, msg, {
      undo: async () => {
        if (fb.length) await (fb.length === 1 ? undoFeedback(fb[0]) : undoFeedbackBatch(fb));
        restore?.(ids);
        router.refresh();
      },
    });
    if (ok) {
      hide?.(ids);
      router.refresh();
    }
    return ok;
  };

  const label = async (jobs: JobListItem[], value: "fit" | "no") => {
    if (!jobs.length) return false;
    const ids = jobs.map((j) => j.id);
    const one = jobs.length === 1;
    const what = value === "fit" ? "a fit" : "not a fit";
    const res = one ? await labelJob(ids[0], value) : await labelJobs(ids, value);
    return handleResult(res, one ? `Labeled ${what} · ${jobs[0].companyName}` : `Labeled ${jobsN(ids.length)} as ${what}`, {
      undo: async () => {
        handleResult(one ? await unlabelJob(ids[0]) : await unlabelJobs(ids));
      },
    });
  };

  return { feedback, label };
}
