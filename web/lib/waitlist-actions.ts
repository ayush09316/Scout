"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { ownerSession } from "@/auth";
import { isDemo } from "./env";
import { take } from "./rate-limit";
import { deleteByCode, deleteById, hashIp, insertEntry, leaveToken, standing, validLeaveToken } from "./waitlist";
import { EMAIL_RE, EXPERIENCE, REF_RE, ROLES, WOULD_PAY } from "./waitlist-options";
import { sendWelcome } from "./waitlist-email";

export type JoinResult =
  | { ok: true; spam?: false; existing: boolean; position: number; total: number; referrals: number; refCode: string; leaveUrl: string; shareUrl: string }
  | { ok: true; spam: true }
  | { ok: false; error: string; field?: string };

const str = (f: FormData, k: string, max: number) => {
  const v = f.get(k);
  const s = typeof v === "string" ? v.trim().replace(/\s+/g, " ") : "";
  return s ? s.slice(0, max) : null;
};

const oneOf = <T extends readonly string[]>(v: string | null, list: T) => (v && (list as readonly string[]).includes(v) ? v : null);

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
      name: str(form, "name", 80),
      role: oneOf(str(form, "role", 40), ROLES),
      experience: oneOf(str(form, "experience", 40), EXPERIENCE),
      city: str(form, "city", 80),
      wouldPay: oneOf(str(form, "would_pay", 40), WOULD_PAY),
      source: str(form, "source", 120),
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
    return { ok: true, existing: !created, position: s.position, total: s.total, referrals: s.referrals, refCode, shareUrl, leaveUrl };
  } catch (e) {
    console.error("waitlist join failed", e);
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
