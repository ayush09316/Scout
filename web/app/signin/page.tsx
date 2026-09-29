import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Radar } from "lucide-react";
import { signIn } from "@/auth";
import { isDemo } from "@/lib/env";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

function GitHubMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4 fill-current">
      <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.43-2.7 5.4-5.26 5.69.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  );
}

export default async function SignIn({ searchParams }: { searchParams: Promise<{ callbackUrl?: string; error?: string }> }) {
  if (isDemo()) redirect("/today");
  const { callbackUrl, error } = await searchParams;
  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4">
      <div aria-hidden className="pointer-events-none absolute inset-0 [background:radial-gradient(600px_300px_at_50%_0%,var(--accent-soft),transparent)]" />
      <div className="relative w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <span className="flex size-11 items-center justify-center rounded-xl bg-accent text-accent-fg shadow-card">
            <Radar className="size-5" aria-hidden />
          </span>
          <h1 className="mt-5 text-xl font-semibold tracking-tight">Sign in to Scout</h1>
          <p className="mt-1.5 text-sm text-fg-muted">Your ranked job inbox, tracker and evals.</p>
        </div>
        <div className="mt-8 rounded-xl border border-border bg-surface p-5 shadow-card">
          {error && (
            <p role="alert" className="mb-4 rounded-lg bg-bad-soft px-3 py-2 text-[13px] text-bad">
              {error === "AccessDenied" ? "This GitHub account isn't on the allowlist." : "Sign-in failed. Please try again."}
            </p>
          )}
          <form
            action={async () => {
              "use server";
              await signIn("github", { redirectTo: callbackUrl?.startsWith("/") ? callbackUrl : "/today" });
            }}
          >
            <button type="submit" className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-fg text-sm font-medium text-bg transition-opacity hover:opacity-90">
              <GitHubMark />
              Continue with GitHub
            </button>
          </form>
          <p className="mt-4 text-center text-xs text-fg-subtle">Private instance · access limited to an allowlist</p>
        </div>
      </div>
    </main>
  );
}
