"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, sql } from "drizzle-orm";
import { ownerSession as auth } from "@/auth";
import { db } from "./db";
import { companies, coverNotes, feedback, interviewPacks, labels, profile, resumeVariants, settings, FEEDBACK_ACTIONS, type FeedbackAction, type Preferences, type PrepPack } from "./db/schema";
import type { SearchFilters } from "./search";
import type { TailorResult } from "./tailor";
import { dismissReminderRow, snoozeReminderRow } from "./reminders";
import { isDemo } from "./env";
import { splitFor } from "./split";
import { getJob, getProfile } from "./queries";
import { writeCoverNote } from "./cover-note";
import { cleanKey, geminiUrl, withUserKey } from "./llm";

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

const MAX_BATCH = 1000;

const batchIds = (ids: number[]) => [...new Set(ids.filter(Number.isInteger))];

export async function addFeedbackBatch(jobIds: number[], action: FeedbackAction): Promise<ActionResult<{ ids: number[] }>> {
  const g = await guard();
  if (g) return g as ActionResult<{ ids: number[] }>;
  if (!FEEDBACK_ACTIONS.includes(action)) return { ok: false, error: "Invalid action" };
  const ids = batchIds(jobIds);
  if (!ids.length) return { ok: false, error: "No jobs selected" };
  if (ids.length > MAX_BATCH) return { ok: false, error: `Select at most ${MAX_BATCH} jobs` };
  const rows = await db.insert(feedback).values(ids.map((jobId) => ({ jobId, action, note: null }))).returning({ id: feedback.id });
  revalidatePath("/tracker");
  return { ok: true, data: { ids: rows.map((r) => r.id) } };
}

export async function undoFeedbackBatch(ids: number[]): Promise<ActionResult> {
  const g = await guard();
  if (g) return g;
  const clean = batchIds(ids);
  if (clean.length) await db.delete(feedback).where(inArray(feedback.id, clean));
  revalidatePath("/tracker");
  return { ok: true };
}

export async function labelJobs(jobIds: number[], label: "fit" | "no"): Promise<ActionResult> {
  const g = await guard();
  if (g) return g;
  if (label !== "fit" && label !== "no") return { ok: false, error: "Invalid label" };
  const ids = batchIds(jobIds);
  if (!ids.length) return { ok: false, error: "No jobs selected" };
  if (ids.length > MAX_BATCH) return { ok: false, error: `Select at most ${MAX_BATCH} jobs` };
  await db
    .insert(labels)
    .values(ids.map((jobId) => ({ jobId, label, split: splitFor(jobId) })))
    .onConflictDoUpdate({ target: labels.jobId, set: { label, at: sql`now()` } });
  return { ok: true };
}

export async function unlabelJobs(jobIds: number[]): Promise<ActionResult> {
  const g = await guard();
  if (g) return g;
  const ids = batchIds(jobIds);
  if (ids.length) await db.delete(labels).where(inArray(labels.jobId, ids));
  return { ok: true };
}

export async function generateCoverNote(jobId: number, userKey?: string): Promise<ActionResult<{ body: string; model: string }>> {
  const g = await readGuard();
  if (!g) return { ok: false, error: "Not signed in" };
  const [job, prof] = await Promise.all([getJob(jobId), getProfile()]);
  if (!job) return { ok: false, error: "Job not found" };
  const note = await withUserKey(userKey, () => writeCoverNote(job, prof?.resumeMd ?? "", prof?.preferences ?? {}));
  if (!g.demo) {
    await db.insert(coverNotes).values({ jobId, profileVersion: prof?.version ?? 0, body: note.body, model: note.model });
    revalidatePath(`/job/${jobId}`);
  }
  return { ok: true, data: note };
}

export async function testGeminiKey(key: string): Promise<ActionResult<{ model: string }>> {
  const k = cleanKey(key);
  if (!k) return { ok: false, error: "That doesn't look like a Gemini API key" };
  return withUserKey(k, async () => {
    try {
      const res = await fetch(geminiUrl("generateContent"), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ contents: [{ role: "user", parts: [{ text: "Reply with the single word: ok" }] }], generationConfig: { maxOutputTokens: 5 } }),
        signal: AbortSignal.timeout(15000),
      });
      if (res.ok) return { ok: true, data: { model: "gemini-2.5-flash" } };
      if (res.status === 400 || res.status === 403) return { ok: false, error: "Google rejected this key" };
      if (res.status === 429) return { ok: false, error: "Key works but is rate-limited right now" };
      return { ok: false, error: `Gemini returned ${res.status}` };
    } catch {
      return { ok: false, error: "Couldn't reach Gemini" };
    }
  });
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

export async function setCronEnabled(enabled: boolean): Promise<ActionResult> {
  const g = await guard();
  if (g) return g;
  await db
    .insert(settings)
    .values({ key: "cron_enabled", value: enabled })
    .onConflictDoUpdate({ target: settings.key, set: { value: enabled } });
  revalidatePath("/health");
  return { ok: true };
}

export async function searchAction(q: string) {
  if (q.trim().length < 2) return { hits: [], mode: "keyword" as const };
  if (!isDemo() && !(await auth())) return { hits: [], mode: "keyword" as const };
  const { hybridSearch } = await import("./search");
  const r = await hybridSearch(q.trim(), {}, { limit: 8, candidates: 50 });
  return { hits: r.hits, mode: r.mode };
}

export async function hybridSearchAction(q: string, filters: SearchFilters) {
  if (!isDemo() && !(await auth())) return { hits: [], mode: "keyword" as const, ms: 0, total: 0, offset: 0 };
  const { hybridSearch } = await import("./search");
  return hybridSearch(q, filters, { limit: 20 });
}

async function readGuard(): Promise<{ demo: boolean } | null> {
  if (isDemo()) return { demo: true };
  const session = await auth();
  return session ? { demo: false } : null;
}

export type TailorOutput = TailorResult & { original: string; saved: boolean; profileVersion: number };

export async function tailorResumeAction(jobId: number, userKey?: string): Promise<ActionResult<TailorOutput>> {
  const g = await readGuard();
  if (!g) return { ok: false, error: "Not signed in" };
  const [job, prof] = await Promise.all([getJob(jobId), getProfile()]);
  if (!job) return { ok: false, error: "Job not found" };
  if (!prof?.resumeMd.trim()) return { ok: false, error: "Add your resume in Settings first" };
  const { tailorResume } = await import("./tailor");
  const t = await withUserKey(userKey, () => tailorResume(prof.resumeMd, job));
  if (!g.demo) {
    await db.insert(resumeVariants).values({ jobId, profileVersion: prof.version, bodyMd: t.bodyMd, keywordBefore: t.before, keywordAfter: t.after, addedKeywords: t.added, model: t.model });
    revalidatePath(`/job/${jobId}`);
  }
  return { ok: true, data: { ...t, original: prof.resumeMd, saved: !g.demo, profileVersion: prof.version } };
}

export async function prepPackAction(jobId: number, userKey?: string): Promise<ActionResult<{ body: PrepPack; model: string; saved: boolean }>> {
  const g = await readGuard();
  if (!g) return { ok: false, error: "Not signed in" };
  const [job, prof] = await Promise.all([getJob(jobId), getProfile()]);
  if (!job) return { ok: false, error: "Job not found" };
  const { getCompanyIntel } = await import("./intel");
  const { buildPrepPack } = await import("./prep");
  const intel = await getCompanyIntel(job.companyKey).catch(() => null);
  const pack = await withUserKey(userKey, () => buildPrepPack(job, prof?.resumeMd ?? "", intel));
  if (!g.demo) {
    await db.insert(interviewPacks).values({ jobId, profileVersion: prof?.version ?? 0, body: pack.body, model: pack.model });
    revalidatePath(`/job/${jobId}`);
  }
  return { ok: true, data: { ...pack, saved: !g.demo } };
}

export async function dismissReminder(id: number): Promise<ActionResult> {
  const g = await guard();
  if (g) return g;
  await dismissReminderRow(id);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function snoozeReminder(id: number, days = 3): Promise<ActionResult> {
  const g = await guard();
  if (g) return g;
  await snoozeReminderRow(id, days);
  revalidatePath("/", "layout");
  return { ok: true };
}

