"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { ownerSession } from "@/auth";
import { isDemo } from "./env";
import { take } from "./rate-limit";
import { deleteByCode, deleteById, hashIp, insertEntry, leaveToken, saveStep, standing, surveyToken, validLeaveToken, validSurveyToken, type StepAnswers } from "./waitlist";
import { EMAIL_RE, EXPERIENCE, LIKELIHOOD, LOCATIONS, MAX_PAINS, MAX_REASON, MAX_ROLES, PAINS, REF_RE, ROLES, STAGES, SURVEY_STEPS, TOOLS } from "./waitlist-options";
import { sendWelcome } from "./waitlist-email";

export type JoinResult =
  | { ok: true; spam?: false; existing: boolean; position: number; total: number; referrals: number; refCode: string; token: string; surveyStep: number; surveyDone: boolean; leaveUrl: string; shareUrl: string }
  | { ok: true; spam: true }
  | { ok: false; error: string; field?: string };

const str = (f: FormData, k: string, max: number) => {
  const v = f.get(k);
  const s = typeof v === "string" ? v.trim().replace(/\s+/g, " ") : "";
  return s ? s.slice(0, max) : null;
};


async function origin() {
  const h = await headers();
  const env = process.env.AUTH_URL || process.env.NEXT_PUBLIC_SITE_URL;
  if (env) return env.replace(/\/+$/, "").replace(/\/api\/auth$/, "");
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function joinWaitlist(form: FormData): Promise<JoinResult> {
  if (str(form, "website", 200)) return { ok: true, spam: true };
  const email = str(form, "email", 254);
  if (!email || !EMAIL_RE.test(email)) return { ok: false, field: "email", error: "Enter a valid email address." };
  if (form.get("consent") !== "on") return { ok: false, field: "consent", error: "Tick the consent box so we can contact you." };

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
  if (!take(`wl|${ip}`, 5, 10 * 60_000)) return { ok: false, error: "Too many attempts from this network. Try again in a few minutes." };

  const ref = str(form, "ref", 12)?.toLowerCase() ?? null;
  try {
    const { refCode, created } = await insertEntry({
      email,
      referredBy: ref && REF_RE.test(ref) ? ref : null,
      ipHash: hashIp(ip),
      userAgent: h.get("user-agent")?.slice(0, 300) ?? null,
    });
    const s = await standing(refCode);
    if (!s) return { ok: false, error: "Something went wrong. Please try again." };
    const base = await origin();
    const shareUrl = `${base}/?ref=${refCode}`;
    const leaveUrl = `${base}/waitlist/leave?code=${refCode}&t=${leaveToken(refCode)}`;
    if (created) await sendWelcome({ to: s.email, position: s.position, shareUrl, leaveUrl });
    revalidatePath("/admin/waitlist");
    return { ok: true, existing: !created, position: s.position, total: s.total, referrals: s.referrals, refCode, token: surveyToken(refCode), surveyStep: s.surveyStep, surveyDone: s.surveyDone, shareUrl, leaveUrl };
  } catch (e) {
    console.error("waitlist join failed", e);
    return { ok: false, error: "We couldn't save that right now. Please try again." };
  }
}

export type SaveResult = { ok: true; position: number; total: number; referrals: number; surveyStep: number; surveyDone: boolean } | { ok: false; error: string };

const BAD = "That answer isn't one of the options.";

const pickOne = (v: unknown, list: readonly string[]) => (v == null || v === "" ? null : typeof v === "string" && list.includes(v) ? v : undefined);

const pickMany = (v: unknown, list: readonly string[], max: number) => {
  if (v == null) return [];
  if (!Array.isArray(v) || v.some((x) => typeof x !== "string" || !list.includes(x))) return undefined;
  const out = [...new Set(v as string[])];
  return out.length > max ? undefined : out;
};

function parseStep(step: number, raw: unknown): StepAnswers | null | undefined {
  if (raw == null) return null;
  if (typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const a = raw as Record<string, unknown>;
  if (step === 1) {
    const stage = pickOne(a.stage, STAGES);
    return stage === undefined ? undefined : { step, stage };
  }
  if (step === 2) {
    const roles = pickMany(a.roles, ROLES, MAX_ROLES);
    const experience = pickOne(a.experience, EXPERIENCE);
    const locations = pickMany(a.locations, LOCATIONS, LOCATIONS.length);
    return roles === undefined || experience === undefined || locations === undefined ? undefined : { step, roles, experience, locations };
  }
  if (step === 3) {
    const pains = pickMany(a.pains, PAINS, MAX_PAINS);
    return pains === undefined ? undefined : { step, pains };
  }
  if (step === 4) {
    const tools = pickMany(a.tools, TOOLS, TOOLS.length);
    return tools === undefined ? undefined : { step, tools };
  }
  const l = a.likelihood;
  if (l != null && !(LIKELIHOOD as readonly unknown[]).includes(l)) return undefined;
  if (a.reason != null && typeof a.reason !== "string") return undefined;
  const reason = typeof a.reason === "string" ? a.reason.trim().slice(0, MAX_REASON) || null : null;
  return { step: 5, likelihood: (l as number | null) ?? null, reason };
}

export async function saveWaitlistAnswers(refCode: string, token: string, step: number, answers: unknown): Promise<SaveResult> {
  if (typeof refCode !== "string" || typeof token !== "string" || !REF_RE.test(refCode) || !validSurveyToken(refCode, token)) return { ok: false, error: "This link has expired. Rejoin with your email to continue." };
  if (!Number.isInteger(step) || step < 1 || step > SURVEY_STEPS) return { ok: false, error: "Unknown step." };
  const parsed = parseStep(step, answers);
  if (parsed === undefined) return { ok: false, error: BAD };
  try {
    if (!(await saveStep(refCode, step, parsed))) return { ok: false, error: "We couldn't find your spot on the list." };
    const s = await standing(refCode);
    if (!s) return { ok: false, error: "We couldn't find your spot on the list." };
    revalidatePath("/admin/waitlist");
    return { ok: true, position: s.position, total: s.total, referrals: s.referrals, surveyStep: s.surveyStep, surveyDone: s.surveyDone };
  } catch (e) {
    console.error("waitlist survey save failed", e);
    return { ok: false, error: "We couldn't save that right now. Please try again." };
  }
}

export async function leaveWaitlist(form: FormData): Promise<{ ok: boolean }> {
  const code = str(form, "code", 12) ?? "";
  const t = str(form, "t", 64) ?? "";
  if (!REF_RE.test(code) || !validLeaveToken(code, t)) return { ok: false };
  await deleteByCode(code);
  return { ok: true };
}

export async function adminDeleteEntry(id: number): Promise<{ ok: boolean; error?: string }> {
  if (isDemo()) return { ok: false, error: "Demo mode — changes are disabled" };
  if (!(await ownerSession())) return { ok: false, error: "Not signed in" };
  if (!Number.isInteger(id) || id <= 0) return { ok: false, error: "Invalid id" };
  await deleteById(id);
  revalidatePath("/admin/waitlist");
  return { ok: true };
}
