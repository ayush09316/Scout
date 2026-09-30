"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";

export type SignInState = { error?: string; email?: string } | undefined;

const safeCallback = (v: FormDataEntryValue | null) => {
  const s = typeof v === "string" ? v : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/today";
};

export async function credentialsSignIn(_: SignInState, form: FormData): Promise<SignInState> {
  const email = String(form.get("email") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "MissingFields", email };
  try {
    await signIn("credentials", { email, password, redirectTo: safeCallback(form.get("callbackUrl")) });
  } catch (e) {
    if (e instanceof AuthError) {
      const code = (e as AuthError & { code?: string }).code;
      return { error: code === "rate_limited" ? "RateLimited" : e.type, email };
    }
    throw e;
  }
  return undefined;
}

export async function githubSignIn(form: FormData) {
  await signIn("github", { redirectTo: safeCallback(form.get("callbackUrl")) });
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
