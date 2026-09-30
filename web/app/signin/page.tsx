import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Gauge, KeyRound, Layers, Send } from "lucide-react";
import { auth, configuredProviders } from "@/auth";
import { BrandLink } from "@/components/landing/brand";
import { ProductPreview, SAMPLE_JOBS } from "@/components/landing/product-preview";
import { ThemeToggle } from "@/components/theme-toggle";
import { isDemo } from "@/lib/env";
import { SignInForm } from "./signin-form";

export const metadata: Metadata = { title: "Sign in", description: "Sign in to your Scout job-hunt copilot." };
export const dynamic = "force-dynamic";

const safe = (v?: string) => (v && v.startsWith("/") && !v.startsWith("//") ? v : "/today");

const HIGHLIGHTS = [
  { icon: Layers, text: "~15k postings a morning, deduplicated and filtered to jobs you can work from India." },
  { icon: Gauge, text: "Calibrated fit scores, measured against jobs you labelled yourself." },
  { icon: Send, text: "The top ten in Telegram at 08:00 IST, the rest in a keyboard-first inbox." },
  { icon: KeyRound, text: "Your Gemini key never leaves your browser." },
];

export default async function SignIn({ searchParams }: { searchParams: Promise<{ callbackUrl?: string; error?: string }> }) {
  if (isDemo()) redirect("/today");
  const { callbackUrl, error } = await searchParams;
  const target = safe(callbackUrl);
  const session = await auth().catch(() => null);
  if (session) redirect(target);
  const p = configuredProviders();
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <main className="relative flex flex-col px-4 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <BrandLink />
          <ThemeToggle compact />
        </div>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          <Link href="/" className="mb-8 inline-flex w-fit items-center gap-1.5 rounded-md text-[13px] text-fg-muted hover:text-fg">
            <ArrowLeft className="size-3.5" aria-hidden />
            Back to home
          </Link>
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-fg">Sign in to Scout</h1>
          <p className="mt-1.5 text-sm text-fg-muted">Your ranked job inbox, tracker and evals.</p>
          <div className="mt-8">
            <SignInForm callbackUrl={target} initialError={error} credentials={p.credentials} github={p.github} />
          </div>
          <p className="mt-8 text-xs text-fg-subtle">Private instance · access is limited to the owner{p.github ? " and an allowlist" : ""}.</p>
        </div>
      </main>
      <aside aria-label="About Scout" className="relative hidden overflow-hidden border-l border-border bg-surface-2/60 lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:px-12 lg:pt-20 xl:px-16">
        <div aria-hidden className="landing-grid pointer-events-none absolute inset-0" />
        <div aria-hidden className="pointer-events-none absolute inset-0 [background:radial-gradient(60%_50%_at_60%_30%,var(--accent-soft),transparent_70%)]" />
        <div className="relative">
          <p className="font-mono text-[11px] font-medium tracking-[0.14em] text-accent uppercase">Scout</p>
          <p className="mt-3 max-w-md text-3xl leading-tight font-semibold tracking-[-0.03em] text-balance text-fg">Your job hunt, ranked before breakfast.</p>
          <ul className="mt-8 grid max-w-md gap-3.5">
            {HIGHLIGHTS.map((h) => (
              <li key={h.text} className="flex items-start gap-3 text-sm text-fg-muted">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg border border-border bg-surface text-accent">
                  <h.icon className="size-3.5" aria-hidden />
                </span>
                <span className="pt-1">{h.text}</span>
              </li>
            ))}
          </ul>
          <div className="mt-10 -mr-32 max-w-none xl:-mr-48">
            <div className="origin-top-left scale-[0.92]">
              <ProductPreview jobs={SAMPLE_JOBS} live={false} />
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
