import type { Metadata } from "next";
import Link from "next/link";
import { Globe, Lightbulb, MapPin } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty";
import { getMarketOverview, getSkillGaps } from "@/lib/intel";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Insights" };

export default async function InsightsPage() {
  const [{ version, gaps }, market] = await Promise.all([getSkillGaps(20), getMarketOverview()]);
  const maxUnlock = Math.max(1, ...gaps.map((g) => g.jobsUnlocked));
  const maxSkill = Math.max(1, ...market.topSkills.map((s) => s.count));
  const maxCity = Math.max(1, ...market.cities.map((c) => c.count));

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">
      <PageHeader
        title="Insights"
        description={
          gaps.length ? (
            <>
              Skills that would unlock the most new matches{version != null && <> · profile v{version}</>} · updated {formatDateTime(gaps[0].updatedAt)}
            </>
          ) : (
            "Skill gaps and a snapshot of the job market you're tracking."
          )
        }
      />

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] [&>*]:min-w-0">
        <Card data-testid="skill-gaps">
          <CardHeader title="Skill gaps" description="Learning X unlocks N more good matches (fit ≥ threshold after adding the skill)" />
          {gaps.length === 0 ? (
            <div className="p-4">
              <EmptyState icon={Lightbulb} title="No skill gaps computed yet" description="The pipeline computes these after scoring. Run `scout insights` or wait for the next daily run." />
            </div>
          ) : (
            <ol className="divide-y divide-border">
              {gaps.map((g, i) => (
                <li key={g.skill} className="px-4 py-3.5" data-testid="gap-row">
                  <div className="flex items-baseline gap-3">
                    <span className="w-5 shrink-0 font-mono text-xs tabular-nums text-fg-subtle">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-fg">
                        Learning <span className="font-semibold">{g.skill}</span> unlocks{" "}
                        <span className="font-mono font-semibold text-good tabular-nums">{g.jobsUnlocked}</span> more match{g.jobsUnlocked === 1 ? "" : "es"}
                      </p>
                      <div className="mt-2 flex items-center gap-3">
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden>
                          <div className="h-full rounded-full bg-accent" style={{ width: `${(g.jobsUnlocked / maxUnlock) * 100}%` }} />
                        </div>
                        <span className="w-40 shrink-0 text-right font-mono text-[11px] tabular-nums text-fg-subtle max-sm:w-auto">
                          {g.jobsMentioning} mention · +{Math.round(g.avgFitGain * 100)}pt fit
                        </span>
                      </div>
                      {g.examples.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {g.examples.map((e) => (
                            <Link
                              key={e.id}
                              href={`/job/${e.id}`}
                              className="inline-flex h-6 max-w-full items-center gap-1 truncate rounded-md border border-border bg-surface-2 px-2 text-xs text-fg-muted hover:border-border-strong hover:text-fg"
                            >
                              <span className="truncate">{e.title}</span>
                              <span className="shrink-0 text-fg-subtle">· {e.companyName}</span>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Card className="px-4 py-3">
              <p className="text-xs text-fg-muted">Open roles</p>
              <p className="mt-1 font-mono text-xl font-semibold tabular-nums">{market.openJobs.toLocaleString("en-IN")}</p>
            </Card>
            <Card className="px-4 py-3">
              <p className="flex items-center gap-1 text-xs text-fg-muted">
                <Globe className="size-3" aria-hidden />
                Remote share
              </p>
              <p className="mt-1 font-mono text-xl font-semibold tabular-nums">{Math.round(market.remoteShare * 100)}%</p>
            </Card>
          </div>
          <Card data-testid="market-skills">
            <CardHeader title="Most demanded skills" description="Mentions across open postings" />
            <ul className="space-y-2 p-4">
              {market.topSkills.length === 0 && <li className="text-xs text-fg-subtle">No open jobs yet.</li>}
              {market.topSkills.map((s) => (
                <li key={s.skill} className="grid grid-cols-[88px_1fr_auto] items-center gap-3 text-[13px]">
                  <span className="truncate text-fg-muted">{s.skill}</span>
                  <span className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                    <span className="block h-full rounded-full bg-accent/80" style={{ width: `${(s.count / maxSkill) * 100}%` }} />
                  </span>
                  <span className="font-mono text-[11px] tabular-nums text-fg-subtle">{s.count.toLocaleString("en-IN")}</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <CardHeader title="Jobs by city" />
            <ul className="space-y-2 p-4">
              {market.cities.length === 0 && <li className="text-xs text-fg-subtle">No city data.</li>}
              {market.cities.map((c) => (
                <li key={c.city} className="grid grid-cols-[88px_1fr_auto] items-center gap-3 text-[13px]">
                  <span className="flex items-center gap-1 truncate text-fg-muted">
                    <MapPin className="size-3 shrink-0 text-fg-subtle" aria-hidden />
                    {c.city}
                  </span>
                  <span className="h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                    <span className="block h-full rounded-full bg-good/70" style={{ width: `${(c.count / maxCity) * 100}%` }} />
                  </span>
                  <span className="font-mono text-[11px] tabular-nums text-fg-subtle">{c.count.toLocaleString("en-IN")}</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card>
            <CardHeader title="Most active companies" />
            <ul className="divide-y divide-border">
              {market.topCompanies.map((c) => (
                <li key={c.key}>
                  <Link href={`/company/${c.key}`} className="flex items-center justify-between gap-3 px-4 py-2 text-[13px] text-fg-muted hover:bg-surface-2 hover:text-fg">
                    <span className="truncate">{c.name}</span>
                    <span className="font-mono text-[11px] tabular-nums text-fg-subtle">{c.count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
