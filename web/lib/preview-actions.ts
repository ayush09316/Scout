"use server";

import { auth } from "@/auth";
import { isDemo } from "./env";
import { getJob, getProfile } from "./queries";

export type JobPreview = {
  id: number;
  descriptionMd: string;
  embedSim: number | null;
  fitScore: number | null;
  applyProb: number | null;
  seniorityMatch: boolean | null;
  scoreSeniority: string | null;
  model: string | null;
  matched: string[];
  missing: string[];
};

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function getJobPreview(id: number): Promise<JobPreview | null> {
  if (!isDemo() && !(await auth())) return null;
  if (!Number.isFinite(id)) return null;
  const [job, prof] = await Promise.all([getJob(id), getProfile()]);
  if (!job) return null;
  const desc = job.descriptionMd.toLowerCase();
  const matched = (prof?.preferences.skills ?? []).filter((s) => new RegExp(`(^|[^a-z])${esc(s.toLowerCase())}([^a-z]|$)`).test(desc));
  return {
    id: job.id,
    descriptionMd: job.descriptionMd.length > 6000 ? `${job.descriptionMd.slice(0, 6000)}…` : job.descriptionMd,
    embedSim: job.embedSim,
    fitScore: job.fitScore,
    applyProb: job.applyProb,
    seniorityMatch: job.seniorityMatch,
    scoreSeniority: job.scoreSeniority,
    model: job.model,
    matched,
    missing: job.missingSkills.filter((m) => !matched.includes(m)),
  };
}
