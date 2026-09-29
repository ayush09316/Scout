import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, Briefcase, CircleCheck, CircleDashed, Clock, ExternalLink, Layers, Wallet } from "lucide-react";
import { CompanyLogo } from "@/components/company-logo";
import { ScoreRing } from "@/components/score-ring";
import { LocationChips } from "@/components/job-chips";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { buttonClass } from "@/components/ui/button";
import { getCoverNotes, getDuplicates, getFeedback, getJob, getProfile } from "@/lib/queries";
import { cn, pct, timeAgo } from "@/lib/utils";
import { JobActions } from "./job-actions";
import { CoverNote } from "./cover-note";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const job = await getJob(Number((await params).id));
  return { title: job ? `${job.title} · ${job.companyName}` : "Job" };
}

const actionLabel: Record<string, string> = { up: "Thumbs up", down: "Thumbs down", saved: "Saved", applied: "Applied", interview: "Interview", offer: "Offer", rejected: "Rejected" };
const actionTone: Record<string, string> = { up: "bg-good", down: "bg-bad", saved: "bg-accent", applied: "bg-accent", interview: "bg-warn", offer: "bg-good", rejected: "bg-fg-subtle" };

function money(n: number, cur: string | null) {
  if (cur === "INR") return n >= 100000 ? `₹${(n / 100000).toFixed(n % 100000 ? 1 : 0)}L` : `₹${n.toLocaleString("en-IN")}`;
  return `${cur ?? "$"}${Math.round(n / 1000)}k`;
}

export default async function JobPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isFinite(id)) notFound();
  const job = await getJob(id);
  if (!job) notFound();
  const [fb, dups, note, prof] = await Promise.all([getFeedback(id), getDuplicates(id, job.dedupGroupId), getCoverNotes(id), getProfile()]);

  const desc = job.descriptionMd.toLowerCase();
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const mySkills = prof?.preferences.skills ?? [];
  const matched = mySkills.filter((s) => new RegExp(`(^|[^a-z])${esc(s.toLowerCase())}([^a-z]|$)`).test(desc));
  const missing = job.missingSkills.filter((m) => !matched.includes(m));
  const coverage = matched.length + missing.length ? matched.length / (matched.length + missing.length) : null;

  const breakdown = [
    { label: "Calibrated fit", value: pct(job.fitProb), bar: job.fitProb, hint: "P(good fit) after isotonic calibration" },
    { label: "LLM fit score", value: job.fitScore == null ? "—" : `${job.fitScore.toFixed(1)}/10`, bar: job.fitScore == null ? null : job.fitScore / 10 },
    { label: "Embedding similarity", value: job.embedSim == null ? "—" : job.embedSim.toFixed(2), bar: job.embedSim, hint: "Cosine, resume ↔ job (bge-small)" },
    { label: "Apply probability", value: pct(job.applyProb), bar: job.applyProb },
    { label: "Final rank score", value: job.finalScore == null ? "—" : job.finalScore.toFixed(2), bar: job.finalScore },
  ];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
      <Link href="/today" className="inline-flex items-center gap-1.5 rounded-md text-sm text-fg-muted hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden />
        Back to Today
      </Link>

      <header className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
        <CompanyLogo name={job.companyName} domain={job.companyDomain} size={52} />
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold tracking-tight text-balance sm:text-2xl">{job.title}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-fg-muted">
            <span className="font-medium text-fg">{job.companyName}</span>
            <span aria-hidden className="text-fg-subtle">·</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" aria-hidden />
              Posted {timeAgo(job.postedAt ?? job.firstSeenAt)} ago
            </span>
            <span aria-hidden className="text-fg-subtle">·</span>
            <span>via {job.source}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <LocationChips location={job.location} remote={job.remote} />
            {job.seniority && (
              <Badge tone="neutral">
                <Briefcase aria-hidden />
                <span className="capitalize">{job.seniority}</span>
                {job.minExp != null && ` · ${job.minExp}–${job.maxExp ?? "+"} yrs`}
              </Badge>
            )}
            {job.salaryMin != null && (
              <Badge tone="good">
                <Wallet aria-hidden />
                {money(job.salaryMin, job.salaryCurrency)}
                {job.salaryMax ? `–${money(job.salaryMax, job.salaryCurrency)}` : "+"}
              </Badge>
            )}
            {job.closedAt && <Badge tone="bad">Closed</Badge>}
          </div>
        </div>
        <JobActions jobId={job.id} url={job.url} lastAction={fb[0]?.action ?? null} />
      </header>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="order-2 min-w-0 p-5 sm:p-7 lg:order-1">
          <article className="prose-job text-sm">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{job.descriptionMd || "_No description available._"}</ReactMarkdown>
          </article>
          <div className="mt-8 border-t border-border pt-4">
            <a href={job.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-accent hover:underline">
              View original posting
              <ExternalLink className="size-3.5" aria-hidden />
            </a>
          </div>
        </Card>

        <aside className="order-1 flex min-w-0 flex-col gap-4 lg:order-2" aria-label="Match insights">
          <Card>
            <div className="flex items-center gap-4 p-4">
              <ScoreRing value={job.fitProb} size={64} stroke={5} />
              <div className="min-w-0">
                <p className="text-lg font-semibold tracking-tight">{job.fitProb == null ? "Not scored yet" : `${Math.round(job.fitProb * 100)}% fit`}</p>
                <p className="text-xs text-fg-muted">
                  {job.model ? (
                    <>
                      Scored by <span className="font-mono text-fg">{job.model}</span>
                      {job.latencyMs != null && ` in ${job.latencyMs}ms`} · profile v{job.profileVersion}
                    </>
                  ) : (
                    "Runs after the next pipeline pass"
                  )}
                </p>
              </div>
            </div>
            <dl className="space-y-3 border-t border-border p-4">
              {breakdown.map((b) => (
                <div key={b.label} title={b.hint}>
                  <div className="flex items-center justify-between text-[13px]">
                    <dt className="text-fg-muted">{b.label}</dt>
                    <dd className="font-mono font-medium tabular-nums">{b.value}</dd>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                    <div className="h-full rounded-full bg-accent" style={{ width: `${Math.round(Math.max(0, Math.min(1, b.bar ?? 0)) * 100)}%` }} />
                  </div>
                </div>
              ))}
              <div className="flex items-center justify-between text-[13px]">
                <dt className="text-fg-muted">Seniority match</dt>
                <dd>
                  {job.seniorityMatch == null ? (
                    "—"
                  ) : job.seniorityMatch ? (
                    <Badge tone="good">Match{job.scoreSeniority ? ` · ${job.scoreSeniority}` : ""}</Badge>
                  ) : (
                    <Badge tone="warn">Mismatch{job.scoreSeniority ? ` · ${job.scoreSeniority}` : ""}</Badge>
                  )}
                </dd>
              </div>
            </dl>
            {job.reasons.length > 0 && (
              <div className="border-t border-border p-4">
                <h3 className="mb-2 text-xs font-medium text-fg-subtle">Why it ranked here</h3>
                <ul className="space-y-1.5">
                  {job.reasons.map((r) => (
                    <li key={r} className="flex gap-2 text-[13px] text-fg-muted">
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-good" aria-hidden />
                      {r}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>

          <Card>
            <CardHeader
              title="Skills match"
              description="Your profile skills vs. this posting"
              action={coverage != null && <span className="font-mono text-sm font-semibold tabular-nums text-fg">{Math.round(coverage * 100)}%</span>}
            />
            <div className="space-y-4 p-4">
              {coverage != null && (
                <div className="flex h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
                  <div className="h-full bg-good" style={{ width: `${coverage * 100}%` }} />
                  <div className="h-full bg-warn/60" style={{ width: `${(1 - coverage) * 100}%` }} />
                </div>
              )}
              <div>
                <h3 className="mb-2 flex items-center gap-1.5 text-xs font-medium text-fg-muted">
                  <CircleCheck className="size-3.5 text-good" aria-hidden />
                  Matched · {matched.length}
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {matched.length ? matched.map((s) => <Badge key={s} tone="good">{s}</Badge>) : <p className="text-xs text-fg-subtle">None of your listed skills appear.</p>}
                </div>
              </div>
              <div>
                <h3 className="mb-2 flex items-center gap-1.5 text-xs font-medium text-fg-muted">
                  <CircleDashed className="size-3.5 text-warn" aria-hidden />
                  Missing · {missing.length}
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {missing.length ? (
                    missing.map((s) => (
                      <span key={s} className="inline-flex h-6 items-center rounded-md border border-dashed border-warn/50 px-2 text-xs font-medium text-warn">
                        {s}
                      </span>
                    ))
                  ) : (
                    <p className="text-xs text-fg-subtle">No gaps flagged.</p>
                  )}
                </div>
              </div>
            </div>
          </Card>

          <CoverNote jobId={job.id} initial={note} />

          <Card>
            <CardHeader title="Activity" />
            {fb.length === 0 ? (
              <p className="p-4 text-[13px] text-fg-subtle">No activity yet. Save or apply to start tracking.</p>
            ) : (
              <ol className="relative space-y-4 p-4 before:absolute before:top-5 before:bottom-5 before:left-[21px] before:w-px before:bg-border">
                {fb.map((f) => (
                  <li key={f.id} className="relative flex gap-3 pl-0.5">
                    <span className={cn("relative mt-1 size-2.5 shrink-0 rounded-full ring-4 ring-surface", actionTone[f.action])} aria-hidden />
                    <div className="min-w-0 text-[13px]">
                      <p className="font-medium text-fg">{actionLabel[f.action]}</p>
                      {f.note && <p className="text-fg-muted">{f.note}</p>}
                      <p className="text-xs text-fg-subtle">{new Date(f.at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </Card>

          {dups.length > 0 && (
            <Card>
              <CardHeader title="Also posted as" description={`${dups.length} duplicate${dups.length > 1 ? "s" : ""} merged into this job`} />
              <ul className="divide-y divide-border">
                {dups.map((d) => (
                  <li key={d.id} className="flex items-center gap-3 px-4 py-3 text-[13px]">
                    <Layers className="size-4 shrink-0 text-fg-subtle" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{d.title}</p>
                      <p className="text-xs text-fg-subtle">via {d.source}</p>
                    </div>
                    <a href={d.url} target="_blank" rel="noreferrer" className={buttonClass("ghost", "icon-sm")} aria-label={`Open ${d.source} posting`}>
                      <ExternalLink />
                    </a>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}
