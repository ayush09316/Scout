import { BellRing, Building2, CloudDownload, Code2, Database, FileDiff, FileText, Filter, GitBranch, KeyRound, Layers, Plus, Search, Send, ShieldCheck, Sigma, Sparkles, Target, Wallet, Workflow } from "lucide-react";
import type { LandingStats } from "@/lib/landing";
import { cn } from "@/lib/utils";
import { CountUp } from "./motion";

const fmt = (n: number) => new Intl.NumberFormat("en-IN").format(n);

export function Accent({ children }: { children: React.ReactNode }) {
  return <span className="font-display lx-ink text-[1.08em] whitespace-nowrap italic">{children}</span>;
}

export function SectionHeading({ id, eyebrow, title, body, align = "center" }: { id: string; eyebrow: string; title: React.ReactNode; body?: React.ReactNode; align?: "center" | "left" }) {
  return (
    <div className={cn(align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-2xl")} data-reveal>
      <p className="lx-eyebrow">{eyebrow}</p>
      <h2 id={id} className="mt-4 text-[2.1rem] leading-[1.02] font-semibold tracking-[-0.04em] text-balance text-fg sm:text-5xl lg:text-[3.5rem]">
        {title}
      </h2>
      {body && <p className={cn("mt-5 text-[15.5px] leading-relaxed text-pretty text-fg-muted sm:text-[17px]", align === "center" && "mx-auto max-w-xl")}>{body}</p>}
    </div>
  );
}

const SECTION = "relative scroll-mt-20 px-4 py-24 sm:px-6 sm:py-32 lg:py-36";

export function Marquee({ names, total }: { names: string[]; total: number | null }) {
  if (names.length < 6) return null;
  const loop = [...names, ...names];
  return (
    <section aria-label="Companies Scout tracks" className="relative px-4 pt-6 pb-4 sm:px-6">
      <p className="lx-eyebrow text-center" data-reveal>
        Reading {total ? fmt(total) : "every"} company job boards, every morning
      </p>
      <div className="lx-marquee relative mx-auto mt-7 max-w-[1200px] overflow-hidden" data-reveal>
        <ul className="lx-marquee-track">
          {loop.map((n, i) => (
            <li key={`${n}-${i}`} aria-hidden={i >= names.length} className="flex shrink-0 items-center gap-10 pr-10 text-[17px] font-semibold tracking-[-0.02em] whitespace-nowrap text-fg-subtle/80 transition-colors hover:text-fg">
              {n}
              <span className="size-1 rounded-full bg-border-strong" aria-hidden />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function Pipeline({ stats }: { stats: LandingStats }) {
  const f = stats.funnel;
  const steps = [
    { icon: CloudDownload, name: "Fetch", value: f?.fetched, alt: "~15k", unit: "postings", body: `${stats.companies ? fmt(stats.companies) : "~144"} company boards on Greenhouse, Lever and Ashby, plus HN Who's Hiring, Remotive, RemoteOK and Arbeitnow.` },
    { icon: Layers, name: "Dedupe", value: f?.duplicates, alt: "~2.9k", unit: "duplicates collapsed", body: "Fuzzy title + company + vector match folds reposts and cross-posted roles into one card." },
    { icon: Filter, name: "Filter", value: f?.india, alt: "—", unit: "workable from India", body: "Location and remote-region rules, title keywords, seniority, experience ceiling, posting age." },
    { icon: Target, name: "Rank", value: f?.ranked, alt: "—", unit: "scored against your resume", body: "Hard filters, then pgvector bge-small similarity, then typed LLM scoring, calibrated." },
    { icon: Send, name: "Deliver", value: f?.delivered, alt: "≤10", unit: "new in today's digest", body: "Up to ten new matches at 08:00 IST with one-tap feedback, and the full ranked inbox on the web." },
  ];
  return (
    <section aria-labelledby="how-it-works" className={SECTION}>
      <SectionHeading
        id="how-it-works"
        eyebrow="How it works"
        title={
          <>
            Fifteen thousand postings in. <Accent>Ten</Accent> worth your morning out.
          </>
        }
        body={f ? "These are the counts from the most recent run, read straight from the database." : "One batch every morning on a GitHub Actions cron. No servers to babysit."}
      />
      <div className="relative mx-auto mt-16 max-w-[1200px] sm:mt-20">
        <div aria-hidden className="pointer-events-none absolute top-7 bottom-7 left-[27px] w-px lg:top-[27px] lg:right-[10%] lg:bottom-auto lg:left-[10%] lg:h-px lg:w-auto">
          <svg className="absolute inset-0 size-full overflow-visible" preserveAspectRatio="none">
            <line x1="0" y1="0" x2="0" y2="100%" className="lg:hidden" stroke="var(--border-strong)" strokeWidth="1" strokeDasharray="4 8" />
            <line x1="0" y1="0" x2="0" y2="100%" className="lx-dash lg:hidden" stroke="url(#lx-g-v)" strokeWidth="1.5" strokeDasharray="4 8" />
            <line x1="0" y1="0" x2="100%" y2="0" className="hidden lg:block" stroke="var(--border-strong)" strokeWidth="1" strokeDasharray="4 8" />
            <line x1="0" y1="0" x2="100%" y2="0" className="lx-dash hidden lg:block" stroke="url(#lx-g-h)" strokeWidth="1.5" strokeDasharray="4 8" />
            <defs>
              <linearGradient id="lx-g-h" x1="0" x2="1" y1="0" y2="0">
                <stop offset="0" stopColor="#6366f1" />
                <stop offset="0.6" stopColor="#a855f7" />
                <stop offset="1" stopColor="#fb7185" />
              </linearGradient>
              <linearGradient id="lx-g-v" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="#6366f1" />
                <stop offset="0.6" stopColor="#a855f7" />
                <stop offset="1" stopColor="#fb7185" />
              </linearGradient>
            </defs>
          </svg>
          {[0, 1.4, 2.8].map((d) => (
            <span key={d} className="lx-travel" style={{ "--d": `${d}s` } as React.CSSProperties}>
              <span className="absolute top-0 left-1/2 size-2 -translate-x-1/2 rounded-full bg-[#c084fc] shadow-[0_0_12px_3px_rgb(168_85_247/0.7)] lg:top-1/2 lg:left-0 lg:-translate-x-0 lg:-translate-y-1/2" />
            </span>
          ))}
        </div>
        <ol className="relative grid gap-10 lg:grid-cols-5 lg:gap-4">
          {steps.map((s, i) => (
            <li key={s.name} className="relative flex gap-5 lg:flex-col lg:items-center lg:gap-0 lg:text-center" data-reveal style={{ "--d": `${i * 90}ms` } as React.CSSProperties}>
              <span className="lx-glass relative z-10 flex size-14 shrink-0 items-center justify-center rounded-2xl text-fg shadow-[0_8px_24px_-12px_rgb(99_102_241/0.6)]">
                <span aria-hidden className="absolute inset-0 rounded-2xl bg-[linear-gradient(135deg,rgb(99_102_241/0.18),rgb(168_85_247/0.12),transparent)]" />
                <s.icon className="relative size-5" aria-hidden />
              </span>
              <div className="min-w-0 lg:mt-6">
                <p className="font-mono text-[11px] tracking-[0.14em] text-fg-subtle uppercase">
                  0{i + 1} · {s.name}
                </p>
                <p className="mt-2 font-mono text-[2rem] leading-none font-semibold tracking-[-0.04em] text-fg tabular-nums">
                  {s.value != null ? <CountUp value={s.value} delay={i * 140} /> : s.alt}
                </p>
                <p className="mt-1.5 text-[13px] text-fg-muted">{s.unit}</p>
                <p className="mt-3 text-[13px] leading-relaxed text-fg-subtle lg:mx-auto lg:max-w-[210px]">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
      <p className="mx-auto mt-14 max-w-2xl text-center font-mono text-[11.5px] leading-relaxed text-fg-subtle" data-reveal>
        Scoring falls back Jev → Gemini → Groq → local model → keyword heuristic on errors, rate limits or invalid output, under a daily cost cap.
      </p>
    </section>
  );
}

function Tile({ className, icon: Icon, title, body, children, i }: { className?: string; icon: React.ComponentType<{ className?: string }>; title: string; body: string; children?: React.ReactNode; i: number }) {
  return (
    <li
      data-reveal
      data-inview
      style={{ "--d": `${(i % 3) * 80}ms` } as React.CSSProperties}
      className={cn("lx-spot lx-lift group flex flex-col overflow-hidden rounded-[20px] border border-border bg-surface/70 backdrop-blur-sm hover:border-border-strong", className)}
    >
      <div className="relative flex min-h-[168px] flex-1 items-center justify-center overflow-hidden px-5 py-7">
        <div aria-hidden className="absolute inset-0 [background-image:radial-gradient(var(--lx-dot)_1px,transparent_1px)] [background-size:16px_16px] [mask-image:radial-gradient(ellipse_70%_70%_at_50%_50%,#000,transparent)]" />
        <div className="relative flex w-full justify-center">{children}</div>
      </div>
      <div className="border-t border-border px-5 pt-4 pb-5">
        <h3 className="flex items-center gap-2 text-[14.5px] font-semibold tracking-tight text-fg">
          <Icon className="size-4 text-accent" aria-hidden />
          {title}
        </h3>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-fg-muted">{body}</p>
      </div>
    </li>
  );
}

function Key({ children, d }: { children: React.ReactNode; d: number }) {
  return (
    <kbd
      style={{ "--d": `${d}s` } as React.CSSProperties}
      className="lx-hkey inline-flex size-11 items-center justify-center rounded-xl border border-border bg-surface font-mono text-sm font-semibold text-fg-muted shadow-[0_2px_0_var(--border-strong)] sm:size-12"
    >
      {children}
    </kbd>
  );
}

function MiniKanban() {
  const cols = ["Saved", "Applied", "Interview"];
  return (
    <div className="grid w-full max-w-[300px] grid-cols-3 gap-2" aria-hidden>
      {cols.map((c, ci) => (
        <div key={c} className="rounded-lg border border-border bg-surface p-1.5">
          <p className="px-0.5 pb-1.5 text-[10px] font-medium text-fg-subtle">{c}</p>
          <div className="relative flex min-h-[74px] flex-col gap-1">
            {ci === 0 && (
              <div className="lx-kan absolute inset-x-0 top-0 z-10 rounded-md border border-accent/40 bg-accent-soft px-1.5 py-1.5 shadow-card">
                <div className="h-1.5 w-4/5 rounded-full bg-accent/70" />
                <div className="mt-1 h-1 w-1/2 rounded-full bg-accent/30" />
              </div>
            )}
            {Array.from({ length: ci === 0 ? 3 : ci === 1 ? 1 : 1 }).map((_, i) => (
              <div key={i} className={cn("rounded-md border border-border bg-surface-2 px-1.5 py-1.5", ci === 0 && i === 0 && "opacity-0", ci === 1 && "mt-[26px]")}>
                <div className="h-1.5 w-4/5 rounded-full bg-border-strong" />
                <div className="mt-1 h-1 w-1/2 rounded-full bg-border" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function MiniDiff() {
  return (
    <div className="w-full max-w-[300px] overflow-hidden rounded-lg border border-border bg-surface font-mono text-[11px] leading-6" aria-hidden>
      <div className="flex items-center justify-between border-b border-border px-2.5 py-1 text-[10px] text-fg-subtle">
        <span>posting changed</span>
        <span className="lx-diff-hl rounded bg-good-soft px-1 text-good" style={{ "--d": "700ms" } as React.CSSProperties}>
          salary ↑
        </span>
      </div>
      <p className="px-2.5 text-fg-subtle">  Location: Bengaluru</p>
      <p className="lx-diff-hl bg-bad-soft px-2.5 text-bad" style={{ "--d": "0ms" } as React.CSSProperties}>
        - Compensation: ₹30–38 LPA
      </p>
      <p className="lx-diff-hl bg-good-soft px-2.5 text-good" style={{ "--d": "250ms" } as React.CSSProperties}>
        + Compensation: ₹34–44 LPA
      </p>
      <p className="lx-diff-hl bg-good-soft px-2.5 text-good" style={{ "--d": "450ms" } as React.CSSProperties}>
        + Remote within India
      </p>
    </div>
  );
}

function MiniSalary() {
  return (
    <div className="w-full max-w-[280px]" aria-hidden>
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-sm font-semibold text-fg">₹34–46 LPA</span>
        <span className="text-[10px] text-fg-subtle">est. · 62% confidence</span>
      </div>
      <div className="relative mt-3 h-2 rounded-full bg-muted">
        <div className="absolute inset-y-0 right-[30%] left-[22%]">
          <div className="lx-bar-fill h-full rounded-full bg-[linear-gradient(90deg,#6366f1,#a855f7,#fb7185)]" />
        </div>
        <div className="absolute -top-1 left-[46%] h-4 w-0.5 rounded bg-fg" />
      </div>
      <div className="mt-2 flex justify-between font-mono text-[10px] text-fg-subtle">
        <span>p25</span>
        <span>median</span>
        <span>p75</span>
      </div>
      <p className="mt-2 text-[10px] text-fg-subtle">From comparable postings grouped by role family, seniority and city</p>
    </div>
  );
}

function MiniGaps({ gaps }: { gaps: { skill: string; unlocked: number }[] }) {
  const rows = gaps.length ? gaps.slice(0, 3) : [{ skill: "Go", unlocked: 0 }, { skill: "TypeScript", unlocked: 0 }, { skill: "Kafka", unlocked: 0 }];
  const max = Math.max(1, ...rows.map((r) => r.unlocked));
  return (
    <div className="flex w-full max-w-[300px] flex-col gap-2 text-[12px]" aria-hidden>
      {rows.map((r, i) => (
        <div key={r.skill} className="flex items-center gap-2.5">
          <span className="w-24 truncate text-fg">{r.skill}</span>
          <span className="h-1.5 flex-1 rounded-full bg-muted">
            <span className="lx-grow block h-full rounded-full bg-gradient-to-r from-accent to-[#a855f7]" style={{ width: gaps.length ? `${Math.max(12, (r.unlocked / max) * 100)}%` : `${80 - i * 20}%`, animationDelay: `${i * 120}ms` }} />
          </span>
          {gaps.length > 0 && <span className="w-12 text-right font-mono text-[11px] text-good tabular-nums">+{r.unlocked}</span>}
        </div>
      ))}
      <p className="mt-0.5 text-[10px] text-fg-subtle">{gaps.length ? "More matches if you add the skill · from your latest run" : "Ranked by how many matches each skill would unlock"}</p>
    </div>
  );
}

function MiniSearch() {
  return (
    <div className="w-full max-w-[300px]" aria-hidden>
      <div className="flex h-8 items-center gap-2 rounded-lg border border-border bg-surface px-2.5 text-[12px] text-fg shadow-card">
        <Search className="size-3.5 text-fg-subtle" />
        <span className="flex-1 truncate">event sourcing, remote India</span>
      </div>
      <div className="mt-2.5 flex flex-col gap-1.5">
        {[
          ["Keyword", "bg-[#f59e0b]", "w-3/5"],
          ["Semantic", "bg-accent", "w-4/5"],
        ].map(([k, c, w]) => (
          <div key={k} className="flex items-center gap-2 text-[10px] text-fg-subtle">
            <span className={cn("size-1.5 rounded-full", c)} />
            <span className="w-14">{k}</span>
            <span className="h-1 flex-1 rounded-full bg-muted">
              <span className={cn("block h-1", w)}>
                <span className={cn("lx-bar-fill block h-1 rounded-full", c)} />
              </span>
            </span>
          </div>
        ))}
        <p className="mt-1 font-mono text-[10px] text-fg-subtle">fused with reciprocal rank fusion</p>
      </div>
    </div>
  );
}

function MiniVelocity() {
  const bars = [3, 4, 3, 5, 6, 5, 7, 9, 8, 11, 12, 14];
  return (
    <div className="w-full max-w-[280px]" aria-hidden>
      <div className="flex items-baseline justify-between text-[11px]">
        <span className="font-medium text-fg">Hiring velocity</span>
        <span className="text-fg-subtle">12 weeks</span>
      </div>
      <div className="mt-3 flex h-16 items-end gap-1">
        {bars.map((b, i) => (
          <span key={i} className="flex h-full flex-1 items-end">
            <span
              className={cn("lx-vbar block w-full rounded-t-sm", i >= bars.length - 3 ? "bg-[linear-gradient(180deg,#a855f7,#6366f1)]" : "bg-accent/25")}
              style={{ height: `${(b / 14) * 100}%`, "--d": `${i * 45}ms` } as React.CSSProperties}
            />
          </span>
        ))}
      </div>
    </div>
  );
}

function MiniDocs() {
  return (
    <div className="relative h-[112px] w-full max-w-[260px]" aria-hidden>
      <div className="absolute top-3 left-6 h-24 w-40 rotate-[-4deg] rounded-lg border border-border bg-surface p-2.5 shadow-card transition-transform duration-500 group-hover:-translate-x-2 group-hover:rotate-[-7deg]">
        <p className="text-[10px] font-semibold text-fg">Interview prep</p>
        <div className="mt-2 space-y-1">
          <div className="h-1 w-full rounded bg-border" />
          <div className="h-1 w-4/5 rounded bg-border" />
          <div className="h-1 w-3/5 rounded bg-border" />
        </div>
      </div>
      <div className="absolute top-0 right-4 h-24 w-40 rotate-[3deg] rounded-lg border border-border bg-surface p-2.5 shadow-pop transition-transform duration-500 group-hover:translate-x-2 group-hover:rotate-[5deg]">
        <p className="text-[10px] font-semibold text-fg">Tailored resume</p>
        <div className="mt-2 space-y-1">
          <div className="h-1 w-full rounded bg-border" />
          <div className="h-1 w-11/12 rounded bg-good/50" />
          <div className="h-1 w-3/4 rounded bg-border" />
          <div className="h-1 w-5/6 rounded bg-good/50" />
        </div>
        <p className="mt-2 text-[9px] text-fg-subtle">Reorders real experience only</p>
      </div>
    </div>
  );
}

export function Bento({ gaps = [] }: { gaps?: { skill: string; unlocked: number }[] }) {
  return (
    <section aria-labelledby="features" className={SECTION}>
      <SectionHeading
        id="features"
        eyebrow="Features"
        title={
          <>
            A dashboard built for the <Accent>ten minutes</Accent> you actually have.
          </>
        }
        body="Triage, track and prepare without leaving the keyboard. Every number on a card can be traced back to how it was made."
      />
      <ul className="mx-auto mt-16 grid max-w-[1200px] gap-3 sm:mt-20 sm:grid-cols-2 lg:grid-cols-3 lg:gap-4">
        <Tile i={0} className="sm:col-span-2" icon={Workflow} title="Keyboard-first triage" body="J and K to move, U and D to rate, S to save, A to apply. Undo is always one toast away.">
          <div className="flex flex-wrap items-center justify-center gap-2" aria-hidden>
            <Key d={0}>J</Key>
            <Key d={0.3}>K</Key>
            <span className="mx-1 h-6 w-px bg-border" />
            <Key d={0.6}>U</Key>
            <Key d={0.9}>D</Key>
            <span className="mx-1 h-6 w-px bg-border" />
            <Key d={1.2}>S</Key>
            <Key d={1.5}>A</Key>
          </div>
        </Tile>
        <Tile i={1} icon={Target} title="Tracker" body="A Huntr-style board from saved to offer, with drag and drop and funnel rates.">
          <MiniKanban />
        </Tile>
        <Tile i={2} icon={Search} title="Hybrid search" body="Full-text and vector search fused with RRF, so exact terms and meaning both count.">
          <MiniSearch />
        </Tile>
        <Tile i={3} icon={FileDiff} title="Change tracking" body="Postings are versioned. See exactly what changed, and get a badge when pay moves.">
          <MiniDiff />
        </Tile>
        <Tile i={4} icon={Wallet} title="Salary estimates" body="Listed pay when it exists; otherwise a range from comparables, with its confidence shown.">
          <MiniSalary />
        </Tile>
        <Tile i={5} icon={Building2} title="Company intel" body="Open roles, hiring velocity, top skills and remote share for every company you track.">
          <MiniVelocity />
        </Tile>
        <Tile i={6} icon={Sigma} title="Skills to learn" body="Which missing skill would unlock the most new matches for you, recomputed after every run.">
          <MiniGaps gaps={gaps} />
        </Tile>
        <Tile i={7} icon={FileText} title="Tailored resume + prep packs" body="A resume per job that reorders what you have done, plus questions to prepare for. Follow-up reminders keep threads warm.">
          <MiniDocs />
        </Tile>
      </ul>
    </section>
  );
}

function Calibration({ points }: { points: { predicted: number; observed: number }[] | null }) {
  const pts = points ?? [0.1, 0.3, 0.5, 0.7, 0.9].map((p) => ({ predicted: p, observed: p }));
  const x = (v: number) => 8 + v * 104;
  const y = (v: number) => 112 - v * 104;
  return (
    <figure className="w-full max-w-[210px]" data-inview>
      <svg viewBox="0 0 120 120" className="w-full" role="img" aria-label={points ? "Reliability diagram from the latest eval" : "Reliability diagram layout; fills in after the first eval"}>
        <rect x="8" y="8" width="104" height="104" rx="6" fill="none" stroke="var(--border)" />
        <line x1={x(0)} y1={y(0)} x2={x(1)} y2={y(1)} stroke="var(--border-strong)" strokeDasharray="3 3" />
        {points && <polyline points={pts.map((p) => `${x(p.predicted)},${y(p.observed)}`).join(" ")} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" />}
        {pts.map((p, i) => (
          <circle
            key={i}
            cx={x(p.predicted)}
            cy={y(p.observed)}
            r="3"
            className={points ? "lx-cal-dot" : undefined}
            style={points ? ({ "--oy": `${(i % 2 ? -1 : 1) * 14}px`, "--d": `${i * 90}ms` } as React.CSSProperties) : undefined}
            fill={points ? "var(--accent)" : "var(--surface)"}
            stroke={points ? "var(--surface)" : "var(--border-strong)"}
            strokeWidth="1.5"
          />
        ))}
      </svg>
      <figcaption className="mt-1 text-center font-mono text-[10px] text-fg-subtle">{points ? "latest eval · predicted vs observed" : "predicted vs observed"}</figcaption>
    </figure>
  );
}

export function Honest({ calibration }: { calibration: { predicted: number; observed: number }[] | null }) {
  const items = [
    { icon: Sigma, title: "Evals gate every change", body: "Precision@10, recall@50, expected calibration error and cost per 1k jobs run on a held-out label set. CI blocks a PR that drops precision@10." },
    { icon: Target, title: "Calibrated, not vibes", body: "Isotonic calibration means an 82% fit is right about 82% of the time. The reliability chart is on the Health page." },
    { icon: ShieldCheck, title: "Never invents experience", body: "Tailored resumes reorder and rephrase what is already on your resume. Nothing is added that you did not do." },
    { icon: KeyRound, title: "Your key stays in your browser", body: "Bring your own Gemini key for generation. It is kept in browser storage and sent per request, never saved on the server." },
  ];
  return (
    <section aria-labelledby="honest" className={SECTION}>
      <div className="mx-auto grid max-w-[1200px] items-center gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-20">
        <div>
          <SectionHeading
            align="left"
            id="honest"
            eyebrow="Honest by design"
            title={
              <>
                A score is a claim. Scout makes it <Accent>earn its place.</Accent>
              </>
            }
            body="Ranking is measured against jobs you labelled yourself, the probabilities are calibrated, and anything written for you sticks to the truth."
          />
          <div className="lx-spot mt-10 flex flex-col items-center gap-6 rounded-[20px] border border-border bg-surface/70 p-6 backdrop-blur-sm sm:flex-row" data-reveal>
            <Calibration points={calibration} />
            <dl className="grid w-full flex-1 grid-cols-2 gap-x-4 gap-y-4 text-xs">
              {["P@10", "Recall@50", "ECE", "$ / 1k jobs"].map((m) => (
                <div key={m}>
                  <dt className="font-mono text-[12px] font-medium text-fg">{m}</dt>
                  <dd className="mt-0.5 text-fg-subtle">tracked per scorer</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 lg:gap-4">
          {items.map((it, i) => (
            <li key={it.title} data-reveal style={{ "--d": `${i * 80}ms` } as React.CSSProperties} className="lx-spot lx-lift rounded-[20px] border border-border bg-surface/70 p-6 backdrop-blur-sm hover:border-border-strong">
              <span className="flex size-10 items-center justify-center rounded-xl bg-[linear-gradient(135deg,rgb(99_102_241/0.16),rgb(168_85_247/0.12))] text-accent ring-1 ring-accent/15">
                <it.icon className="size-4" aria-hidden />
              </span>
              <h3 className="mt-5 text-[14.5px] font-semibold tracking-tight text-fg">{it.title}</h3>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-fg-muted">{it.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function BuiltWith() {
  const items = [
    { icon: Code2, name: "Python", note: "async fetchers + pipeline" },
    { icon: Database, name: "Postgres + pgvector", note: "HNSW, full-text search" },
    { icon: Layers, name: "Next.js 15", note: "server components" },
    { icon: Sparkles, name: "Jev · Gemini · Groq", note: "typed scoring chain" },
    { icon: GitBranch, name: "GitHub Actions", note: "daily cron + eval gate" },
    { icon: BellRing, name: "Telegram", note: "digest + feedback" },
  ];
  return (
    <section aria-labelledby="built-with" className="relative scroll-mt-20 px-4 py-20 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-[1200px]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between" data-reveal>
          <div>
            <p className="lx-eyebrow">Built with</p>
            <h2 id="built-with" className="mt-3 text-[1.75rem] leading-tight font-semibold tracking-[-0.035em] text-fg sm:text-[2rem]">
              Boring tools, <Accent>free tiers.</Accent>
            </h2>
          </div>
          <p className="max-w-sm text-[14px] leading-relaxed text-fg-muted">One cron, one database, one serverless app. Public ATS APIs only, no scraping of sites that forbid it.</p>
        </div>
        <ul className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-[20px] border border-border bg-border sm:grid-cols-3 lg:grid-cols-6" data-reveal>
          {items.map((it) => (
            <li key={it.name} className="flex flex-col gap-2 bg-surface p-5 transition-colors hover:bg-surface-2">
              <it.icon className="size-4 text-accent" aria-hidden />
              <span className="mt-1 text-[13.5px] font-medium text-fg">{it.name}</span>
              <span className="text-[12px] leading-snug text-fg-subtle">{it.note}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const FAQS = [
  {
    q: "Is it free?",
    a: "Scout is a personal project, not a paid service. It runs on free tiers: a GitHub Actions cron, one Postgres database and one serverless app. LLM scoring runs under a daily cost cap.",
  },
  {
    q: "Where does the job data come from?",
    a: "Public ATS APIs only: company boards on Greenhouse, Lever and Ashby, plus HN Who's Hiring, Remotive, RemoteOK and Arbeitnow. Nothing is scraped from sites that forbid it.",
  },
  {
    q: "Does it invent resume content?",
    a: "No. Tailored resumes reorder and rephrase what is already on your resume. Nothing is added that you did not do.",
  },
  {
    q: "Where is my API key stored?",
    a: "In your browser. Your Gemini key is kept in browser storage and sent per request, never saved on the server.",
  },
  {
    q: "Can I self-host it?",
    a: "Yes. Self-host it on free tiers with one cron, one database and one serverless app, then sign in. Access is limited to the owner, plus a GitHub allowlist if you configure one.",
  },
];

export function Faq() {
  return (
    <section aria-labelledby="faq" className={SECTION}>
      <div className="mx-auto grid max-w-[1200px] gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-20">
        <SectionHeading align="left" id="faq" eyebrow="FAQ" title={<>Questions, <Accent>answered.</Accent></>} body="The short version of how Scout handles your data, your key and your resume." />
        <div className="divide-y divide-border border-y border-border" data-reveal>
          {FAQS.map((f) => (
            <details key={f.q} className="group/faq">
              <summary className="flex min-h-14 cursor-pointer items-center justify-between gap-6 rounded-md py-5 text-[16px] font-medium tracking-tight text-fg transition-colors hover:text-accent">
                {f.q}
                <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-border text-fg-muted">
                  <Plus className="lx-plus size-4 transition-transform duration-300" aria-hidden />
                </span>
              </summary>
              <p className="max-w-xl pb-6 text-[15px] leading-relaxed text-fg-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
