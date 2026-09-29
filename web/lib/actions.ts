"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "./db";
import { companies, coverNotes, feedback, labels, profile, FEEDBACK_ACTIONS, type FeedbackAction, type Preferences } from "./db/schema";
import { isDemo } from "./env";
import { splitFor } from "./split";
import { getJob, getProfile } from "./queries";
import { writeCoverNote } from "./cover-note";

export type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false; demo?: boolean; error: string };

async function guard(): Promise<ActionResult | null> {
  if (isDemo()) return { ok: false, demo: true, error: "Demo mode — changes are disabled" };
  const session = await auth();
  if (!session) return { ok: false, error: "Not signed in" };
  return null;
}

export async function addFeedback(jobId: number, action: FeedbackAction, note?: string): Promise<ActionResult<{ id: number }>> {
  const g = await guard();
  if (g) return g as ActionResult<{ id: number }>;
  if (!FEEDBACK_ACTIONS.includes(action)) return { ok: false, error: "Invalid action" };
  const [row] = await db.insert(feedback).values({ jobId, action, note: note ?? null }).returning({ id: feedback.id });
  revalidatePath("/tracker");
  revalidatePath(`/job/${jobId}`);
  return { ok: true, data: { id: row.id } };
}

export async function undoFeedback(id: number): Promise<ActionResult> {
  const g = await guard();
  if (g) return g;
  await db.delete(feedback).where(eq(feedback.id, id));
  revalidatePath("/tracker");
  return { ok: true };
}

export async function labelJob(jobId: number, label: "fit" | "no"): Promise<ActionResult> {
  const g = await guard();
  if (g) return g;
  await db
    .insert(labels)
    .values({ jobId, label, split: splitFor(jobId) })
    .onConflictDoUpdate({ target: labels.jobId, set: { label, at: sql`now()` } });
  return { ok: true };
}

export async function unlabelJob(jobId: number): Promise<ActionResult> {
  const g = await guard();
  if (g) return g;
  await db.delete(labels).where(eq(labels.jobId, jobId));
  return { ok: true };
}

export async function generateCoverNote(jobId: number): Promise<ActionResult<{ body: string; model: string }>> {
  const g = await guard();
  if (g) return g as ActionResult<{ body: string; model: string }>;
  const [job, prof] = await Promise.all([getJob(jobId), getProfile()]);
  if (!job) return { ok: false, error: "Job not found" };
  const note = await writeCoverNote(job, prof?.resumeMd ?? "", prof?.preferences ?? {});
  await db.insert(coverNotes).values({ jobId, profileVersion: prof?.version ?? 0, body: note.body, model: note.model });
  revalidatePath(`/job/${jobId}`);
  return { ok: true, data: note };
}

export async function saveProfile(resumeMd: string, preferences: Preferences): Promise<ActionResult<{ version: number }>> {
  const g = await guard();
  if (g) return g as ActionResult<{ version: number }>;
  if (!resumeMd.trim()) return { ok: false, error: "Resume can't be empty" };
  const current = await getProfile();
  const version = (current?.version ?? 0) + 1;
  await db.insert(profile).values({ version, resumeMd, preferences });
  revalidatePath("/settings");
  return { ok: true, data: { version } };
}

export async function updateCompany(id: number, patch: { active?: boolean; tier?: number }): Promise<ActionResult> {
  const g = await guard();
  if (g) return g;
  const set: { active?: boolean; tier?: number } = {};
  if (typeof patch.active === "boolean") set.active = patch.active;
  if (patch.tier && [1, 2, 3].includes(patch.tier)) set.tier = patch.tier;
  await db.update(companies).set(set).where(and(eq(companies.id, id)));
  revalidatePath("/settings");
  return { ok: true };
}

export async function searchAction(q: string) {
  const { searchJobs } = await import("./queries");
  if (q.trim().length < 2) return [];
  return searchJobs(q.trim());
}
