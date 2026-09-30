import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ChevronRight, Play } from "lucide-react";
import { auth } from "@/auth";
import { BrandLink } from "@/components/landing/brand";
import { LandingNav } from "@/components/landing/nav";
import { LiveRanking } from "@/components/landing/live-ranking";
import { LandingFX, CountUp } from "@/components/landing/motion";
import { SAMPLE_JOBS, toPreview } from "@/components/landing/product-preview";
import { RunTerminal } from "@/components/landing/terminal";
import { TelegramDigest } from "@/components/landing/telegram";
import { RelativeTime } from "@/components/landing/relative-time";
import { Accent, Bento, BuiltWith, Faq, Honest, Marquee, Pipeline, SectionHeading } from "@/components/landing/sections";
import { WaitlistSection } from "@/components/landing/waitlist-section";
import { demoUrl, isDemo } from "@/lib/env";
import { isOwner } from "@/lib/owner";
import { waitlistCount } from "@/lib/waitlist";
import { REF_RE, SOCIAL_THRESHOLD } from "@/lib/waitlist-options";
import { getLandingStats, getPreviewJobs, getTrackedCompanies } from "@/lib/landing";
import { getLatestEval } from "@/lib/queries";

export const dynamic = "force-dynamic";

const TITLE = "Scout — your job hunt, ranked before breakfast";
const DESCRIPTION =
  "A personal job-hunt copilot. Every morning Scout pulls ~15k postings from ~144 company job boards and public feeds, dedups them, ranks them against your resume with calibrated LLM scoring, and sends the top 10 to Telegram.";

export const metadata: Metadata = {
  title: { absolute: TITLE },
  description: DESCRIPTION,
  openGraph: { title: TITLE, description: DESCRIPTION, type: "website", siteName: "Scout", locale: "en_IN" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
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

export default async function Home({ searchParams }: { searchParams: Promise<{ ref?: string | string[] }> }) {
  const demo = isDemo();
  const [session, stats, previewJobs, calibration, companies, sp] = await Promise.all([demo ? null : safeSession(), getLandingStats(), getPreviewJobs(), safeCalibration(), getTrackedCompanies(), searchParams]);
  const owner = !demo && isOwner(session);
  const mode = demo ? "demo" : owner ? "owner" : "waitlist";
  const waitlist = mode === "waitlist";
  const count = waitlist ? await waitlistCount() : 0;
  const rawRef = typeof sp.ref === "string" ? sp.ref.trim().toLowerCase() : "";
  const referral = REF_RE.test(rawRef) ? rawRef : null;
  const demoLink = demoUrl();
  const jobs = previewJobs ? toPreview(previewJobs) : SAMPLE_JOBS;
  const primary = waitlist ? { href: "#waitlist", label: "Join the waitlist" } : { href: "/today", label: owner ? "Open dashboard" : "Get started" };
  const f = stats.funnel;

  const stat = [
    { label: "open jobs", value: stats.openJobs },
    { label: "companies", value: stats.companies },
    { label: "sources", value: stats.sources },
  ].filter((s): s is { label: string; value: number } => s.value != null);

  const funnel = f
    ? [
        { label: "fetched", value: f.fetched },
        { label: "dupes", value: f.duplicates },
        { label: "India-workable", value: f.india },
        { label: "scored", value: f.ranked },
        { label: "delivered", value: f.delivered },
      ]
    : null;

  const Primary = ({ size = "lg" }: { size?: "lg" | "md" }) => (
    <Link href={primary.href} data-testid="primary-cta" className={`lx-btn inline-flex items-center justify-center gap-2 rounded-full font-medium ${size === "lg" ? "h-12 px-6 text-[15px]" : "h-11 px-5 text-[14px]"}`}>
      <span className="shine" aria-hidden />
      <span>{primary.label}</span>
      <ArrowRight className="size-4" aria-hidden />
    </Link>
  );

  return (
    <div className="lx relative min-h-dvh overflow-x-clip">
      <LandingFX />
      <div aria-hidden className="lx-noise fixed inset-0 z-[60]" />
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[70] focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:text-sm focus:shadow-pop">
        Skip to content
      </a>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[1100px]">
        <div className="lx-aurora">
          <span className="a" />
          <span className="b" />
          <span className="c" />
        </div>
        <div className="lx-dots" />
        <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-b from-transparent to-bg" />
      </div>
      <LandingNav mode={mode} />
      <main id="main" className="relative">
        <section aria-labelledby="hero" className="relative px-4 pt-12 pb-16 sm:px-6 sm:pt-16 sm:pb-24">
          <div className="mx-auto max-w-[1200px] text-center">
            <p className="lx-rise lx-glass inline-flex h-8 items-center whitespace-nowrap gap-2 rounded-full px-3.5 text-[12.5px] text-fg-muted">
              <span className="relative flex size-1.5">
                <span className="absolute inset-0 rounded-full bg-good motion-safe:animate-ping motion-safe:opacity-60" />
                <span className="relative size-1.5 rounded-full bg-good" />
              </span>
              Runs every morning at 08:00 IST
              {stats.lastRunAt && (
                <>
                  <span className="hidden text-fg-subtle sm:inline">·</span>
                  <span className="hidden text-fg-subtle sm:inline">
                    refreshed <RelativeTime iso={stats.lastRunAt} />
                  </span>
                </>
              )}
            </p>
            <h1 id="hero" className="lx-rise mx-auto mt-7 max-w-[16ch] text-[2.6rem] min-[400px]:text-[2.75rem] leading-[0.95] font-semibold tracking-[-0.045em] text-fg [animation-delay:80ms] sm:text-[4.5rem] lg:text-[5.75rem]">
              Your job hunt,
              <br />
              <Accent>ranked</Accent> before <Accent>breakfast.</Accent>
            </h1>
            <p className="lx-rise mx-auto mt-7 max-w-[39rem] text-[16px] leading-relaxed text-pretty text-fg-muted [animation-delay:160ms] sm:text-[18px]">
              Scout reads thousands of fresh postings from company job boards, keeps the ones you can work from India, and ranks them against your resume. The ten best land in Telegram; the rest wait in a keyboard-first inbox.
            </p>
            <div className="lx-rise mt-9 flex flex-col items-stretch justify-center gap-3 [animation-delay:240ms] min-[420px]:flex-row min-[420px]:items-center">
              <Primary />
              <a href="#how-it-works" className="lx-btn-2 inline-flex h-12 items-center justify-center gap-1.5 rounded-full px-6 text-[15px] font-medium backdrop-blur">
                See how it works
                <ChevronRight className="size-4 text-fg-subtle" aria-hidden />
              </a>
              {demoLink && (
                <a href={demoLink} className="inline-flex h-12 items-center justify-center gap-2 rounded-full px-4 text-[15px] font-medium text-fg-muted hover:text-fg">
                  <Play className="size-4" aria-hidden />
                  View demo
                </a>
              )}
            </div>
            {waitlist && (
              <p className="lx-rise mt-5 text-[13px] text-fg-subtle [animation-delay:280ms]" data-testid="beta-line">
                Private beta · currently used by its builder
                {count >= SOCIAL_THRESHOLD && <> · join {fmt(count)} others on the waitlist</>}
              </p>
            )}
            {funnel ? (
              <div className="lx-rise mx-auto mt-12 max-w-[760px] [animation-delay:320ms]" data-testid="stat-strip">
                <p className="lx-eyebrow">Latest run</p>
                <ol className="mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-3 font-mono text-[13px]">
                  {funnel.map((s, i) => (
                    <li key={s.label} className="flex items-center gap-2">
                      <span className="flex items-baseline gap-1.5 rounded-full border border-border bg-surface/60 px-3 py-1.5 backdrop-blur">
                        <CountUp value={s.value} delay={400 + i * 160} duration={1300} className={`font-semibold tabular-nums ${i === funnel.length - 1 ? "text-accent" : "text-fg"}`} />
                        <span className="font-sans text-[12px] text-fg-subtle">{s.label}</span>
                      </span>
                      {i < funnel.length - 1 && <ArrowRight className="size-3 text-fg-subtle" aria-hidden />}
                    </li>
                  ))}
                </ol>
              </div>
            ) : (
              stat.length > 0 && (
                <dl className="lx-rise mx-auto mt-12 flex max-w-xl flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm [animation-delay:320ms]" data-testid="stat-strip">
                  {stat.map((s) => (
                    <div key={s.label} className="flex items-baseline gap-1.5">
                      <dd className="font-mono font-semibold text-fg tabular-nums">{fmt(s.value)}</dd>
                      <dt className="text-fg-subtle">{s.label}</dt>
                    </div>
                  ))}
                </dl>
              )
            )}
          </div>
          <div className="lx-rise mx-auto mt-14 w-full max-w-[1040px] [animation-delay:380ms] sm:mt-20">
            <LiveRanking jobs={jobs} live={Boolean(previewJobs)} />
          </div>
        </section>

        <Marquee names={companies} total={stats.companies} />
        <Pipeline stats={stats} />
        <Bento />

        <section aria-labelledby="digest" className="relative scroll-mt-20 px-4 py-24 sm:px-6 sm:py-32 lg:py-36">
          <div className="mx-auto grid max-w-[1200px] items-center gap-14 lg:grid-cols-[1fr_1fr] lg:gap-20">
            <div>
              <SectionHeading
                align="left"
                id="digest"
                eyebrow="Delivered"
                title={
                  <>
                    Ten jobs in Telegram, <Accent>at 08:00 IST.</Accent>
                  </>
                }
                body="One message per match with the reasons it fits. Rate each with a thumbs up or down to teach the ranker, or mark it Applied in one tap. The full ranked inbox waits on the web."
              />
              {stats.runRows.length > 0 && (
                <div className="mt-10" data-reveal>
                  <RunTerminal runId={stats.runId} rows={stats.runRows} />
                </div>
              )}
            </div>
            <div className="relative" data-reveal>
              <div aria-hidden className="absolute inset-0 -z-10 m-auto size-[80%] rounded-full bg-[radial-gradient(closest-side,rgb(168_85_247/0.28),transparent)] blur-2xl" />
              <TelegramDigest jobs={jobs} live={Boolean(previewJobs)} count={f?.delivered || 10} />
            </div>
          </div>
        </section>

        <Honest calibration={calibration} />
        {waitlist && <WaitlistSection referral={referral} count={count} showCount={count >= SOCIAL_THRESHOLD} />}
        <Faq />
        <BuiltWith />

        <section aria-labelledby="cta" className="px-4 pt-8 pb-24 sm:px-6 sm:pb-32">
          <div className="relative mx-auto max-w-[1200px] overflow-hidden rounded-[28px] border border-border px-6 py-20 text-center sm:py-28" data-reveal>
            <div aria-hidden className="lx-aurora opacity-80">
              <span className="a" />
              <span className="b" />
              <span className="c" />
            </div>
            <div aria-hidden className="lx-dots [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000,transparent)]" />
            <div className="relative">
              <h2 id="cta" className="mx-auto max-w-[18ch] text-[2.25rem] leading-[1] font-semibold tracking-[-0.045em] text-balance text-fg sm:text-6xl">
                Tomorrow&apos;s ten are already being <Accent>ranked.</Accent>
              </h2>
              <p className="mx-auto mt-5 max-w-md text-[16px] text-fg-muted">{waitlist ? "Private beta for now. Join the waitlist and hear first when there’s room." : "Private by default. Self-host it on free tiers, sign in, and start triaging."}</p>
              <div className="mt-9 flex flex-col items-stretch justify-center gap-3 min-[420px]:flex-row min-[420px]:items-center">
                <Primary />
                {demoLink && (
                  <a href={demoLink} className="lx-btn-2 inline-flex h-12 items-center justify-center rounded-full px-6 text-[15px] font-medium">
                    View demo
                  </a>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="relative border-t border-border px-4 py-12 sm:px-6">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-1">
            <BrandLink />
            <p className="text-[12.5px] text-fg-subtle">A personal job-hunt copilot. Public ATS APIs only.</p>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-1 gap-y-1 text-[13.5px] text-fg-muted">
            {[
              ["#how-it-works", "How it works"],
              ["#features", "Features"],
              ["#faq", "FAQ"],
              ["#built-with", "Built with"],
            ].map(([h, l]) => (
              <a key={h} href={h} className="inline-flex min-h-11 items-center rounded-md px-2.5 hover:text-fg">
                {l}
              </a>
            ))}
            <Link href={primary.href} className="inline-flex min-h-11 items-center rounded-md px-2.5 hover:text-fg">
              {primary.label}
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
