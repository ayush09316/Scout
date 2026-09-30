import { ArrowRight, BellRing, Braces, Building2, CloudDownload, Code2, Database, FileDiff, FileText, Filter, GitBranch, KeyRound, Layers, MessagesSquare, Search, Send, ShieldCheck, Sigma, Sparkles, Target, Wallet, Workflow } from "lucide-react";
import type { LandingStats } from "@/lib/landing";
import { cn } from "@/lib/utils";

const fmt = (n: number) => new Intl.NumberFormat("en-IN").format(n);

export function SectionHeading({ id, eyebrow, title, body }: { id: string; eyebrow: string; title: React.ReactNode; body?: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="font-mono text-[11px] font-medium tracking-[0.14em] text-accent uppercase">{eyebrow}</p>
      <h2 id={id} className="mt-3 text-[1.75rem] leading-[1.15] font-semibold tracking-[-0.025em] text-balance text-fg sm:text-4xl">
        {title}
      </h2>
      {body && <p className="mt-4 text-[15px] leading-relaxed text-pretty text-fg-muted sm:text-base">{body}</p>}
    </div>
  );
}

function Key({ children, lit }: { children: React.ReactNode; lit?: boolean }) {
  return (
    <kbd
      className={cn(
        "inline-flex size-10 items-center justify-center rounded-lg border font-mono text-sm font-semibold shadow-[0_2px_0_var(--border-strong)] sm:size-11",
        lit ? "border-accent/40 bg-accent-soft text-accent-soft-fg shadow-[0_2px_0_var(--accent)]" : "border-border bg-surface text-fg-muted",
      )}
    >
      {children}
    </kbd>
  );
}

export function Pipeline({ stats }: { stats: LandingStats }) {
  const f = stats.funnel;
  const steps = [
    { icon: CloudDownload, name: "Fetch", value: f ? fmt(f.fetched) : "~15k", unit: "postings", body: `${stats.companies ? fmt(stats.companies) : "~144"} company boards on Greenhouse, Lever and Ashby, plus HN Who's Hiring, Remotive, RemoteOK and Arbeitnow.` },
    { icon: Layers, name: "Dedupe", value: f ? fmt(f.duplicates) : "~2.9k", unit: "duplicates collapsed", body: "Fuzzy title + company + vector match folds reposts and cross-posted roles into one card." },
    { icon: Filter, name: "Filter", value: f ? fmt(f.india) : "—", unit: "workable from India", body: "Location and remote-region rules, title keywords, seniority, experience ceiling, posting age." },
    { icon: Target, name: "Rank", value: f ? fmt(f.ranked) : "—", unit: "scored by the LLM", body: "Hard filters, then pgvector bge-small similarity, then typed LLM scoring, calibrated." },
    { icon: Send, name: "Deliver", value: "10", unit: "in the Telegram digest", body: "A top-10 digest at 08:00 IST with one-tap feedback, and the full ranked inbox on the web." },
  ];
  return (
    <section aria-labelledby="how-it-works" className="scroll-mt-20 px-4 py-20 sm:px-6 sm:py-28">
      <SectionHeading
        id="how-it-works"
        eyebrow="How it works"
        title="Fifteen thousand postings in. Ten worth your morning out."
        body={f ? "These are the counts from the most recent run, read straight from the database." : "One batch every morning on a GitHub Actions cron. No servers to babysit."}
      />
      <ol className="relative mx-auto mt-14 grid max-w-6xl gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:gap-0">
        <span aria-hidden className="pointer-events-none absolute top-[38px] right-[10%] left-[10%] hidden h-px bg-gradient-to-r from-transparent via-border-strong to-transparent lg:block" />
        {steps.map((s, i) => (
          <li key={s.name} className="relative lg:px-2">
            <div className="flex h-full flex-col rounded-2xl border border-border bg-surface p-5 shadow-card">
              <div className="flex items-center justify-between">
                <span className="relative flex size-9 items-center justify-center rounded-xl border border-border bg-surface-2 text-accent">
                  <s.icon className="size-4" aria-hidden />
                </span>
                <span className="font-mono text-[11px] text-fg-subtle tabular-nums">0{i + 1}</span>
              </div>
              <h3 className="mt-4 text-sm font-semibold text-fg">{s.name}</h3>
              <p className="mt-2 font-mono text-2xl font-semibold tracking-tight text-fg tabular-nums">{s.value}</p>
              <p className="text-xs text-fg-subtle">{s.unit}</p>
              <p className="mt-3 text-[13px] leading-relaxed text-fg-muted">{s.body}</p>
            </div>
            {i < steps.length - 1 && (
              <span aria-hidden className="absolute top-[30px] -right-[9px] z-10 hidden size-[18px] items-center justify-center rounded-full border border-border bg-bg text-fg-subtle lg:flex">
                <ArrowRight className="size-2.5" />
              </span>
            )}
          </li>
        ))}
      </ol>
      <p className="mx-auto mt-6 max-w-2xl text-center text-xs text-fg-subtle">
        Scoring falls back Jev → Gemini → Groq → local model → keyword heuristic on errors, rate limits or invalid output, under a daily cost cap.
      </p>
    </section>
  );
}

function Tile({ className, icon: Icon, title, body, children }: { className?: string; icon: React.ComponentType<{ className?: string }>; title: string; body: string; children?: React.ReactNode }) {
  return (
    <li className={cn("group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-card transition-colors hover:border-border-strong", className)}>
      <div className="relative flex min-h-[148px] flex-1 items-center justify-center overflow-hidden border-b border-border bg-surface-2/60 px-5 py-6 [background-image:radial-gradient(var(--border)_1px,transparent_1px)] [background-size:14px_14px]">
        {children}
      </div>
      <div className="p-5">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-fg">
          <Icon className="size-4 text-accent" aria-hidden />
          {title}
        </h3>
        <p className="mt-1.5 text-[13px] leading-relaxed text-fg-muted">{body}</p>
      </div>
    </li>
  );
}

function MiniKanban() {
  const cols = [
    { name: "Saved", n: 3, lit: 0 },
    { name: "Applied", n: 2, lit: 1 },
    { name: "Interview", n: 1, lit: -1 },
  ];
  return (
    <div className="grid w-full max-w-[300px] grid-cols-3 gap-2" aria-hidden>
      {cols.map((c) => (
        <div key={c.name} className="rounded-lg border border-border bg-surface p-1.5">
          <p className="px-0.5 pb-1.5 text-[10px] font-medium text-fg-subtle">{c.name}</p>
          <div className="flex flex-col gap-1">
            {Array.from({ length: c.n }).map((_, i) => (
              <div key={i} className={cn("rounded-md border px-1.5 py-1.5", i === c.lit ? "border-accent/40 bg-accent-soft" : "border-border bg-surface-2")}>
                <div className={cn("h-1.5 w-4/5 rounded-full", i === c.lit ? "bg-accent/60" : "bg-border-strong")} />
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
    <div className="w-full max-w-[300px] overflow-hidden rounded-lg border border-border bg-surface font-mono text-[11px] leading-5" aria-hidden>
      <div className="flex items-center justify-between border-b border-border px-2.5 py-1 text-[10px] text-fg-subtle">
        <span>posting changed</span>
        <span className="rounded bg-good-soft px-1 text-good">salary ↑</span>
      </div>
      <p className="px-2.5 text-fg-subtle">  Location: Bengaluru</p>
      <p className="bg-bad-soft px-2.5 text-bad">- Compensation: ₹30–38 LPA</p>
      <p className="bg-good-soft px-2.5 text-good">+ Compensation: ₹34–44 LPA</p>
      <p className="bg-good-soft px-2.5 text-good">+ Remote within India</p>
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
        <div className="absolute inset-y-0 left-[22%] right-[30%] rounded-full bg-gradient-to-r from-accent/40 via-accent to-accent/40" />
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

function MiniChat() {
  return (
    <div className="flex w-full max-w-[300px] flex-col gap-2 text-[12px]" aria-hidden>
      <p className="self-end rounded-2xl rounded-br-md bg-accent px-3 py-1.5 text-accent-fg">Which companies grew backend hiring this month?</p>
      <div className="self-start rounded-2xl rounded-bl-md border border-border bg-surface px-3 py-2 text-fg-muted">
        <span className="mb-1.5 inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] text-fg-muted">
          <Braces className="size-3" />
          Ran SQL · read-only
        </span>
        <p>Three boards doubled their open backend roles…</p>
      </div>
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
      <div className="mt-2 flex flex-col gap-1">
        {[
          ["Keyword", "bg-warn"],
          ["Semantic", "bg-accent"],
        ].map(([k, c]) => (
          <div key={k} className="flex items-center gap-2 text-[10px] text-fg-subtle">
            <span className={cn("size-1.5 rounded-full", c)} />
            <span className="w-14">{k}</span>
            <span className="h-1 flex-1 rounded-full bg-muted">
              <span className={cn("block h-1 rounded-full", c, k === "Keyword" ? "w-3/5" : "w-4/5")} />
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
          <span key={i} className={cn("flex-1 rounded-t-sm", i >= bars.length - 3 ? "bg-accent" : "bg-accent/30")} style={{ height: `${(b / 14) * 100}%` }} />
        ))}
      </div>
    </div>
  );
}

function MiniDocs() {
  return (
    <div className="relative h-[108px] w-full max-w-[260px]" aria-hidden>
      <div className="absolute top-3 left-6 h-24 w-40 rotate-[-4deg] rounded-lg border border-border bg-surface p-2.5 shadow-card">
        <p className="text-[10px] font-semibold text-fg">Interview prep</p>
        <div className="mt-2 space-y-1">
          <div className="h-1 w-full rounded bg-border" />
          <div className="h-1 w-4/5 rounded bg-border" />
          <div className="h-1 w-3/5 rounded bg-border" />
        </div>
      </div>
      <div className="absolute top-0 right-4 h-24 w-40 rotate-[3deg] rounded-lg border border-border bg-surface p-2.5 shadow-pop">
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

export function Bento() {
  return (
    <section aria-labelledby="features" className="scroll-mt-20 border-y border-border bg-surface-2/40 px-4 py-20 sm:px-6 sm:py-28">
      <SectionHeading
        id="features"
        eyebrow="Features"
        title="A dashboard built for the ten minutes you actually have."
        body="Triage, track and prepare without leaving the keyboard. Every number on a card can be traced back to how it was made."
      />
      <ul className="mx-auto mt-14 grid max-w-6xl gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Tile className="lg:col-span-2" icon={Workflow} title="Keyboard-first triage" body="J and K to move, U and D to rate, S to save, A to apply. Undo is always one toast away.">
          <div className="flex flex-wrap items-center justify-center gap-2" aria-hidden>
            <Key lit>J</Key>
            <Key>K</Key>
            <span className="mx-1 h-6 w-px bg-border" />
            <Key>U</Key>
            <Key>D</Key>
            <span className="mx-1 h-6 w-px bg-border" />
            <Key lit>S</Key>
            <Key>A</Key>
          </div>
        </Tile>
        <Tile icon={Target} title="Tracker" body="A Huntr-style board from saved to offer, with drag and drop and funnel rates.">
          <MiniKanban />
        </Tile>
        <Tile icon={Search} title="Hybrid search" body="Full-text and vector search fused with RRF, so exact terms and meaning both count.">
          <MiniSearch />
        </Tile>
        <Tile icon={FileDiff} title="Change tracking" body="Postings are versioned. See exactly what changed, and get a badge when pay moves.">
          <MiniDiff />
        </Tile>
        <Tile icon={Wallet} title="Salary estimates" body="Listed pay when it exists; otherwise a range from comparables, with its confidence shown.">
          <MiniSalary />
        </Tile>
        <Tile icon={Building2} title="Company intel" body="Open roles, hiring velocity, top skills and remote share for every company you track.">
          <MiniVelocity />
        </Tile>
        <Tile icon={MessagesSquare} title="Chat with your job market" body="An agent that answers with read-only SQL behind guardrails, and shows the query it ran.">
          <MiniChat />
        </Tile>
        <Tile icon={FileText} title="Tailored resume + prep packs" body="A resume per job that reorders what you have done, plus questions to prepare for. Follow-up reminders keep threads warm.">
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
    <figure className="w-full max-w-[200px]">
      <svg viewBox="0 0 120 120" className="w-full" role="img" aria-label={points ? "Reliability diagram from the latest eval" : "Reliability diagram layout; fills in after the first eval"}>
        <rect x="8" y="8" width="104" height="104" rx="6" fill="none" stroke="var(--border)" />
        <line x1={x(0)} y1={y(0)} x2={x(1)} y2={y(1)} stroke="var(--border-strong)" strokeDasharray="3 3" />
        {points && <polyline points={pts.map((p) => `${x(p.predicted)},${y(p.observed)}`).join(" ")} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinejoin="round" />}
        {pts.map((p, i) => (
          <circle key={i} cx={x(p.predicted)} cy={y(p.observed)} r="3" fill={points ? "var(--accent)" : "var(--surface)"} stroke={points ? "var(--surface)" : "var(--border-strong)"} strokeWidth="1.5" />
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
    <section aria-labelledby="honest" className="px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1fr_1.15fr] lg:gap-16">
        <div>
          <p className="font-mono text-[11px] font-medium tracking-[0.14em] text-accent uppercase">Honest by design</p>
          <h2 id="honest" className="mt-3 text-[1.75rem] leading-[1.15] font-semibold tracking-[-0.025em] text-balance text-fg sm:text-4xl">
            A score is a claim. Scout makes it earn its place.
          </h2>
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-fg-muted">
            Ranking is measured against jobs you labelled yourself, the probabilities are calibrated, and anything written for you sticks to the truth.
          </p>
          <div className="mt-8 flex flex-col items-center gap-6 rounded-2xl sm:flex-row border border-border bg-surface p-5 shadow-card">
            <Calibration points={calibration} />
            <dl className="grid w-full flex-1 grid-cols-2 gap-x-4 gap-y-3 text-xs">
              {["P@10", "Recall@50", "ECE", "$ / 1k jobs"].map((m) => (
                <div key={m}>
                  <dt className="font-mono text-[11px] text-fg-subtle">{m}</dt>
                  <dd className="mt-0.5 text-fg-muted">tracked per scorer</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2">
          {items.map((it) => (
            <li key={it.title} className="rounded-2xl border border-border bg-surface p-5 shadow-card">
              <span className="flex size-9 items-center justify-center rounded-xl bg-accent-soft text-accent-soft-fg">
                <it.icon className="size-4" aria-hidden />
              </span>
              <h3 className="mt-4 text-sm font-semibold text-fg">{it.title}</h3>
              <p className="mt-1.5 text-[13px] leading-relaxed text-fg-muted">{it.body}</p>
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
    <section aria-labelledby="built-with" className="scroll-mt-20 border-t border-border px-4 py-16 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-[11px] font-medium tracking-[0.14em] text-accent uppercase">Built with</p>
            <h2 id="built-with" className="mt-2 text-xl font-semibold tracking-tight text-fg">Boring tools, free tiers.</h2>
          </div>
          <p className="max-w-sm text-[13px] text-fg-muted">One cron, one database, one serverless app. Public ATS APIs only, no scraping of sites that forbid it.</p>
        </div>
        <ul className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-3 lg:grid-cols-6">
          {items.map((it) => (
            <li key={it.name} className="flex flex-col gap-2 bg-surface p-4">
              <it.icon className="size-4 text-fg-subtle" aria-hidden />
              <span className="text-[13px] font-medium text-fg">{it.name}</span>
              <span className="text-[11px] leading-snug text-fg-subtle">{it.note}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
