import Link from "next/link";
import { CompanyLogo } from "./company-logo";
import { ScoreRing } from "./score-ring";
import { LocationChips, SkillChips } from "./job-chips";
import { SalaryBadge } from "./salary";
import { ChangeBadges } from "./change-badges";
import { JobContextMenu } from "./job-context-menu";
import { SelectBox } from "./selection";
import type { JobListItem } from "@/lib/queries";
import { cn } from "@/lib/utils";

export function JobListRow({
  job,
  extra,
  hideCompany,
  className,
  picked = false,
  picking = false,
  onPick,
}: {
  job: JobListItem;
  extra?: React.ReactNode;
  hideCompany?: boolean;
  className?: string;
  picked?: boolean;
  picking?: boolean;
  onPick?: (range: boolean) => void;
}) {
  return (
    <JobContextMenu job={job} picked={picked} onPick={onPick && (() => onPick(false))}>
      <li
        className={cn("group relative rounded-xl border border-border bg-surface shadow-card transition-colors hover:border-border-strong", picked && "border-accent/50 bg-accent-soft/40", className)}
        data-testid="job-row"
        data-picked={picked || undefined}
      >
        <div className="flex gap-3 p-3.5 sm:gap-4 sm:p-4">
          <div className="relative shrink-0 self-start">
            <CompanyLogo name={job.companyName} domain={job.companyDomain} size={36} />
            {onPick && <SelectBox checked={picked} active={picking} label={`Select ${job.title} at ${job.companyName}`} onToggle={onPick} />}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link href={`/job/${job.id}`} className="block truncate text-sm font-semibold text-fg after:absolute after:inset-0 hover:text-accent focus-visible:outline-none">
                  {job.title}
                </Link>
                {!hideCompany && (
                  <Link href={`/company/${job.companyKey}`} className="relative z-10 mt-0.5 inline-block text-[13px] font-medium text-fg-muted hover:text-accent hover:underline">
                    {job.companyName}
                  </Link>
                )}
              </div>
              <ScoreRing value={job.fitProb} size={38} />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <LocationChips location={job.location} remote={job.remote} />
              <SalaryBadge salary={job.salary} />
              <ChangeBadges badges={job.badges} />
              {job.reasons.length > 0 && <SkillChips reasons={job.reasons} missing={[]} maxReasons={1} inline />}
            </div>
            {extra}
          </div>
        </div>
      </li>
    </JobContextMenu>
  );
}
