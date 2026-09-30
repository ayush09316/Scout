import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";
import { auth } from "@/auth";
import { buttonClass } from "@/components/ui/button";
import { BrandLink } from "@/components/landing/brand";
import { LandingNav } from "@/components/landing/nav";
import { ProductPreview, SAMPLE_JOBS, toPreview } from "@/components/landing/product-preview";
import { RelativeTime } from "@/components/landing/relative-time";
import { Bento, BuiltWith, Honest, Pipeline } from "@/components/landing/sections";
import { demoUrl, isDemo } from "@/lib/env";
import { getLandingStats, getPreviewJobs } from "@/lib/landing";
import { getLatestEval } from "@/lib/queries";

export const dynamic = "force-dynamic";

const TITLE = "Scout — your job hunt, ranked before breakfast";
const DESCRIPTION =
  "A personal job-hunt copilot. Every morning Scout pulls ~15k postings from ~144 company job boards and public feeds, dedups them, ranks them against your resume with calibrated LLM scoring, and sends the top 10 to Telegram.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  openGraph: { title: TITLE, description: DESCRIPTION, type: "website", siteName: "Scout", locale: "en_IN" },
  twitter: { card: "summary", title: TITLE, description: DESCRIPTION },
};

const fmt = (n: number) => new Intl.NumberFormat("en-IN").format(n);

async function safeCalibration() {
  try {
    const e = await getLatestEval();
    const c = e?.report.calibration?.filter((p) => Number.isFinite(p.predicted) && Number.isFinite(p.observed));
    return c && c.length >= 3 ? c.map((p) => ({ predicted: p.predicted, observed: p.observed })) : null;
  } catch {
    return null;
  }
}

async function safeSession() {
  try {
    return await auth();
  } catch {
    return null;
  }
}

export default async function Home() {
  const demo = isDemo();
  const [session, stats, previewJobs, calibration] = await Promise.all([demo ? null : safeSession(), getLandingStats(), getPreviewJobs(), safeCalibration()]);
  const signedIn = Boolean(session);
  const canOpen = demo || signedIn;
  const demoLink = demoUrl();
  const jobs = previewJobs ? toPreview(previewJobs) : SAMPLE_JOBS;
  const primary = canOpen ? { href: "/today", label: "Open dashboard" } : { href: "/signin", label: "Sign in" };

  const stat = [
    { label: "open jobs", value: stats.openJobs != null ? fmt(stats.openJobs) : null },
    { label: "companies", value: stats.companies != null ? fmt(stats.companies) : null },
    { label: "sources", value: stats.sources != null ? fmt(stats.sources) : null },
  ].filter((s) => s.value);

  return (
    <div className="min-h-dvh overflow-x-clip">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:shadow-pop">
        Skip to content
      </a>
      <LandingNav canOpen={canOpen} signedIn={signedIn} />
      <main id="main">
        <section aria-labelledby="hero" className="relative px-4 pt-16 pb-20 sm:px-6 sm:pt-24 sm:pb-28">
          <div aria-hidden className="landing-grid pointer-events-none absolute inset-x-0 top-0 -z-10 h-[640px]" />
          <div className="mx-auto max-w-3xl text-center">
            <p className="landing-rise inline-flex items-center gap-2 rounded-full border border-border bg-surface/80 px-3 py-1 text-xs text-fg-muted shadow-card backdrop-blur">
              <span className="relative flex size-1.5">
                <span className="absolute inset-0 rounded-full bg-good motion-safe:animate-ping motion-safe:opacity-60" />
                <span className="relative size-1.5 rounded-full bg-good" />
              </span>
              Runs every morning at 08:00 IST
            </p>
            <h1 id="hero" className="landing-rise mt-6 text-[2.5rem] leading-[1.05] font-semibold tracking-[-0.04em] text-balance text-fg [animation-delay:60ms] sm:text-6xl lg:text-[4.25rem]">
              Your job hunt, <span className="landing-ink">ranked before breakfast.</span>
            </h1>
            <p className="landing-rise mx-auto mt-5 max-w-xl text-base leading-relaxed text-pretty text-fg-muted [animation-delay:110ms] sm:text-lg">
              Scout reads thousands of fresh postings from company job boards, keeps the ones you can work from India, and ranks them against your resume. The ten best land in Telegram; the rest wait in a keyboard-first inbox.
            </p>
            <div className="landing-rise mt-8 flex flex-col items-stretch justify-center gap-2.5 [animation-delay:140ms] min-[420px]:flex-row min-[420px]:items-center">
              <Link href={primary.href} className={buttonClass("primary", "md", "h-11 px-5 text-[15px]")}>
                {primary.label}
                <ArrowRight aria-hidden />
              </Link>
              <a href="#how-it-works" className={buttonClass("outline", "md", "h-11 px-5 text-[15px]")}>
                See how it works
              </a>
              {demoLink && (
                <a href={demoLink} className={buttonClass("ghost", "md", "h-11 px-4 text-[15px]")}>
                  <Play aria-hidden />
                  View demo
                </a>
              )}
            </div>
            {(stat.length > 0 || stats.lastRunAt) && (
              <dl className="landing-rise mx-auto mt-10 flex max-w-xl flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm [animation-delay:170ms]" data-testid="stat-strip">
                {stat.map((s) => (
                  <div key={s.label} className="flex items-baseline gap-1.5">
                    <dd className="font-mono font-semibold text-fg tabular-nums">{s.value}</dd>
                    <dt className="text-fg-subtle">{s.label}</dt>
                  </div>
                ))}
                {stats.lastRunAt && (
                  <div className="flex items-baseline gap-1.5">
                    <dt className="text-fg-subtle">refreshed</dt>
                    <dd className="font-medium text-fg-muted">
                      <RelativeTime iso={stats.lastRunAt} />
                    </dd>
                  </div>
                )}
              </dl>
            )}
          </div>
          <div className="mt-14 sm:mt-20">
            <ProductPreview jobs={jobs} live={Boolean(previewJobs)} />
          </div>
        </section>

        <Pipeline stats={stats} />
        <Bento />
        <Honest calibration={calibration} />
        <BuiltWith />

        <section aria-labelledby="cta" className="px-4 pb-20 sm:px-6">
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl border border-border bg-surface px-6 py-14 text-center shadow-pop sm:py-20">
            <div aria-hidden className="pointer-events-none absolute inset-0 [background:radial-gradient(50%_80%_at_50%_0%,var(--accent-soft),transparent_70%)]" />
            <div className="relative">
              <h2 id="cta" className="text-[1.75rem] leading-tight font-semibold tracking-[-0.025em] text-balance text-fg sm:text-4xl">
                Tomorrow&apos;s ten are already being ranked.
              </h2>
              <p className="mx-auto mt-3 max-w-md text-[15px] text-fg-muted">Private by default. Self-host it on free tiers, sign in, and start triaging.</p>
              <div className="mt-8 flex flex-col items-stretch justify-center gap-2.5 min-[420px]:flex-row min-[420px]:items-center">
                <Link href={primary.href} className={buttonClass("primary", "md", "h-11 px-5 text-[15px]")}>
                  {primary.label}
                  <ArrowRight aria-hidden />
                </Link>
                {demoLink && (
                  <a href={demoLink} className={buttonClass("outline", "md", "h-11 px-5 text-[15px]")}>
                    View demo
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="border-t border-border px-4 py-10 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2">
            <BrandLink />
            <p className="text-xs text-fg-subtle">A personal job-hunt copilot. Public ATS APIs only.</p>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-fg-muted">
            <a href="#features" className="hover:text-fg">Features</a>
            <a href="#how-it-works" className="hover:text-fg">How it works</a>
            <a href="#built-with" className="hover:text-fg">Built with</a>
            <Link href={primary.href} className="hover:text-fg">{primary.label}</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
