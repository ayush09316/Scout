import Link from "next/link";
import { Sigma } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import type { SkillGap } from "@/lib/intel";

export function SkillsToLearn({ gaps }: { gaps: SkillGap[] }) {
  const top = gaps.filter((g) => g.jobsUnlocked > 0).slice(0, 8);
  const max = Math.max(1, ...top.map((g) => g.jobsUnlocked));
  return (
    <Card id="skills-to-learn" data-testid="skills-to-learn" className="scroll-mt-6">
      <CardHeader title="Skills to learn" description="Missing skills ranked by how many more good matches they would unlock. Recomputed every run." />
      {top.length === 0 ? (
        <div className="flex items-center gap-2 p-4 text-sm text-fg-muted">
          <Sigma className="size-4 text-fg-subtle" aria-hidden />
          Nothing yet — skill gaps appear after the next pipeline run.
        </div>
      ) : (
        <ol className="divide-y divide-border">
          {top.map((g, i) => (
            <li key={g.skill} className="px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="w-5 font-mono text-xs text-fg-subtle tabular-nums">{i + 1}</span>
                <p className="min-w-0 flex-1 text-sm text-fg">
                  Learning <span className="font-semibold">{g.skill}</span> unlocks <span className="font-semibold text-good tabular-nums">{g.jobsUnlocked}</span> more matches
                </p>
                <span className="hidden font-mono text-[11px] text-fg-subtle tabular-nums sm:inline">{g.jobsMentioning} mention</span>
              </div>
              <div className="mt-2 ml-8 h-1.5 rounded-full bg-muted">
                <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(6, (g.jobsUnlocked / max) * 100)}%` }} />
              </div>
              {g.examples.length > 0 && (
                <div className="mt-2 ml-8 flex flex-wrap gap-1.5">
                  {g.examples.slice(0, 3).map((e) => (
                    <Link key={e.id} href={`/job/${e.id}`} className="rounded-md border border-border px-2 py-0.5 text-xs text-fg-muted hover:border-border-strong hover:text-fg">
                      {e.title} <span className="text-fg-subtle">· {e.companyName}</span>
                    </Link>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
