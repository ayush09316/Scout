import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2 } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty";
import { CompanyLogo } from "@/components/company-logo";
import { Stat } from "@/components/company-card";
import { JobListRow } from "@/components/job-list-row";
import { getCompanyIntel, getCompanyJobs } from "@/lib/intel";
import { lpa } from "@/lib/format";
import { formatDateTime, istDate } from "@/lib/utils";
import { getFirstRunAt } from "@/lib/queries";
import { VelocityChart } from "./velocity-chart";

export async function generateMetadata({ params }: { params: Promise<{ key: string }> }): Promise<Metadata> {
  const intel = await getCompanyIntel((await params).key).catch(() => null);
  return { title: intel?.name ?? "Company" };
}

function trackingDays(since: number) {
  return (Date.now() - since) / 86400000;
}

const SEN_ORDER = ["intern", "junior", "mid", "senior", "staff", "principal", "lead", "manager", "unknown"];

export default async function CompanyPage({ params }: { params: Promise<{ key: string }> }) {
  const key = decodeURIComponent((await params).key);
  const intel = await getCompanyIntel(key);
  if (!intel) notFound();
  const [jobs, firstRun] = await Promise.all([getCompanyJobs(key), getFirstRunAt().catch(() => null)]);
  const sinceMs = firstRun ? new Date(firstRun).getTime() : null;
  const young = sinceMs != null && trackingDays(sinceMs) < 30;
  const velocity = sinceMs == null ? intel.velocity : intel.velocity.filter((v) => new Date(`${v.week}T00:00:00Z`).getTime() + 7 * 86400000 > sinceMs);
  const mixTotal = Object.values(intel.seniorityMix).reduce((a, b) => a + b, 0);
  const ix = (k: string) => (SEN_ORDER.indexOf(k) < 0 ? 98 : SEN_ORDER.indexOf(k));
  const mix = Object.entries(intel.seniorityMix).sort((a, b) => ix(a[0]) - ix(b[0]));
  const locMax = Math.max(1, ...intel.locations.map((l) => l.count));
  const mixTone = ["bg-accent", "bg-accent/70", "bg-accent/45", "bg-good/70", "bg-warn/70", "bg-fg-subtle/60", "bg-bad/60", "bg-fg-subtle/40", "bg-muted"];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
      <Link href="/today" className="inline-flex items-center gap-1.5 rounded-md text-sm text-fg-muted hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden />
        Back to Today
      </Link>
      <header className="mt-4 flex items-center gap-4">
        <CompanyLogo name={intel.name} domain={intel.domain} size={52} />
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">{intel.name}</h1>
          <p className="mt-1 text-sm text-fg-muted">
            {intel.source === "stats" && intel.updatedAt ? `Company stats updated ${formatDateTime(intel.updatedAt)}` : "Computed live from tracked postings"}
          </p>
        </div>
      </header>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" data-testid="company-stats">
        <Card className="px-4 py-3">
          <Stat label="Open roles" value={intel.openJobs} sub={`${intel.matches} good matches`} />
        </Card>
        <Card className="px-4 py-3">
          <Stat label={young ? `Opened · since ${istDate(firstRun!)}` : "Opened · 30d"} value={<span className="text-good">+{intel.opened30d}</span>} />
        </Card>
        <Card className="px-4 py-3">
          <Stat label={young ? `Closed · since ${istDate(firstRun!)}` : "Closed · 30d"} value={intel.closed30d} />
        </Card>
        <Card className="px-4 py-3">
          <Stat label="Remote share" value={`${Math.round(intel.remoteShare * 100)}%`} />
        </Card>
        <Card className="col-span-2 px-4 py-3 sm:col-span-1">
          <Stat label="Median salary" value={intel.medianSalary ? lpa(intel.medianSalary) : "—"} sub={intel.medianSalary ? "actual + estimated" : "not enough data"} />
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] [&>*]:min-w-0">
        <Card>
          <CardHeader
            title="Hiring velocity"
            description={firstRun ? `Postings opened vs closed per week · tracking since ${istDate(firstRun, true)}` : "Postings opened vs closed per week · last 12 weeks"}
          />
          <div className="h-56 p-3">
            <VelocityChart data={velocity} since={firstRun ? istDate(firstRun) : null} />
          </div>
          {firstRun && (
            <p className="border-t border-border px-4 py-2 text-[11px] text-fg-subtle" data-testid="tracking-since">
              Scout started tracking on {istDate(firstRun, true)}. Roles already open that day are the baseline, so they aren’t counted as opened.
            </p>
          )}
        </Card>
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader title="Top skills" description="Across their open roles" />
            <div className="flex flex-wrap gap-1.5 p-4">
              {intel.topSkills.length ? (
                intel.topSkills.slice(0, 12).map((s) => (
                  <span key={s.skill} className="inline-flex h-6 items-center gap-1.5 rounded-md border border-border bg-surface-2 px-2 text-xs text-fg-muted">
                    {s.skill}
                    {s.count > 0 && <span className="font-mono text-[11px] tabular-nums text-fg-subtle">{s.count}</span>}
                  </span>
                ))
              ) : (
                <p className="text-xs text-fg-subtle">No skills extracted yet.</p>
              )}
            </div>
          </Card>
          <Card>
            <CardHeader title="Seniority mix" />
            <div className="p-4">
              {mixTotal ? (
                <>
                  <div className="flex h-2 overflow-hidden rounded-full bg-muted" aria-hidden>
                    {mix.map(([k, v], i) => (
                      <div key={k} className={mixTone[i % mixTone.length]} style={{ width: `${(v / mixTotal) * 100}%` }} />
                    ))}
                  </div>
                  <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs">
                    {mix.map(([k, v], i) => (
                      <li key={k} className="flex items-center gap-2 text-fg-muted">
                        <span className={`size-2 rounded-full ${mixTone[i % mixTone.length]}`} aria-hidden />
                        <span className="flex-1 capitalize">{k}</span>
                        <span className="font-mono tabular-nums text-fg-subtle">{Math.round((v / mixTotal) * 100)}%</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="text-xs text-fg-subtle">No open roles.</p>
              )}
            </div>
          </Card>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] [&>*]:min-w-0">
        <section aria-label="Open roles">
          <h2 className="mb-3 text-sm font-semibold">
            Open roles <span className="font-mono text-xs font-normal text-fg-subtle tabular-nums">{jobs.length}</span>
          </h2>
          {jobs.length ? (
            <ul className="space-y-2">
              {jobs.map((j) => (
                <JobListRow key={j.id} job={j} hideCompany />
              ))}
            </ul>
          ) : (
            <EmptyState icon={Building2} title="No open roles" description={`${intel.name} has nothing open right now. Closed roles still count towards velocity.`} />
          )}
        </section>
        <Card className="self-start">
          <CardHeader title="Locations" />
          <ul className="space-y-2.5 p-4">
            {intel.locations.length ? (
              intel.locations.slice(0, 8).map((l) => (
                <li key={l.location} className="text-[13px]">
                  <div className="flex items-center justify-between gap-3">
                    <span className="truncate text-fg-muted">{l.location}</span>
                    <span className="font-mono text-xs tabular-nums text-fg-subtle">{l.count || ""}</span>
                  </div>
                  {l.count > 0 && (
                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted" aria-hidden>
                      <div className="h-full rounded-full bg-accent/70" style={{ width: `${(l.count / locMax) * 100}%` }} />
                    </div>
                  )}
                </li>
              ))
            ) : (
              <li className="text-xs text-fg-subtle">No locations listed.</li>
            )}
          </ul>
        </Card>
      </div>
    </div>
  );
}
