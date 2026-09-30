import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Gauge, KeyRound, Layers, Send } from "lucide-react";
import { auth, configuredProviders } from "@/auth";
import { BrandLink } from "@/components/landing/brand";
import { LiveRanking } from "@/components/landing/live-ranking";
import { SAMPLE_JOBS } from "@/components/landing/product-preview";
import { Accent } from "@/components/landing/sections";
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
    <div className="lx relative grid min-h-dvh overflow-x-clip lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="lx-aurora">
          <span className="a" />
          <span className="b" />
          <span className="c" />
        </div>
        <div className="lx-dots" />
      </div>
      <div aria-hidden className="lx-noise fixed inset-0 z-[60]" />
      <main className="relative flex flex-col px-4 py-4 sm:px-10">
        <div className="flex items-center justify-between">
          <BrandLink />
          <ThemeToggle compact />
        </div>
        <div className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-10">
          <Link href="/" className="mb-6 inline-flex min-h-11 w-fit items-center gap-1.5 rounded-md text-[13px] text-fg-muted hover:text-fg">
            <ArrowLeft className="size-3.5" aria-hidden />
            Back to home
          </Link>
          <div className="lx-rise lx-glass rounded-[24px] p-6 shadow-[var(--lx-glow)] sm:p-8">
            <h1 className="text-[2rem] leading-[1.05] font-semibold tracking-[-0.04em] text-fg">
              Sign in to <Accent>Scout</Accent>
            </h1>
            <p className="mt-2 text-[14px] text-fg-muted">Your ranked job inbox, tracker and evals.</p>
            <div className="mt-7">
              <SignInForm callbackUrl={target} initialError={error} credentials={p.credentials} github={p.github} />
            </div>
          </div>
          <p className="mt-6 text-center text-xs text-fg-subtle">Private instance · access is limited to the owner{p.github ? " and an allowlist" : ""}.</p>
        </div>
      </main>
      <aside aria-label="About Scout" className="relative hidden overflow-hidden border-l border-border lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:justify-center lg:px-12 lg:py-10 xl:px-16">
        <div className="relative">
          <p className="lx-eyebrow">Scout</p>
          <p className="mt-3 max-w-[14ch] text-[2.5rem] leading-[0.98] font-semibold tracking-[-0.045em] text-balance text-fg xl:text-[2.9rem]">
            Your job hunt, <Accent>ranked</Accent> before <Accent>breakfast.</Accent>
          </p>
          <ul className="mt-6 grid max-w-md gap-2.5">
            {HIGHLIGHTS.map((h) => (
              <li key={h.text} className="flex items-start gap-3 text-[13.5px] text-fg-muted">
                <span className="lx-glass flex size-7 shrink-0 items-center justify-center rounded-lg text-accent">
                  <h.icon className="size-3.5" aria-hidden />
                </span>
                <span className="pt-1">{h.text}</span>
              </li>
            ))}
          </ul>
          <div className="mt-8 max-w-[540px]">
            <LiveRanking jobs={SAMPLE_JOBS} live={false} compact />
          </div>
        </div>
      </aside>
    </div>
  );
}
