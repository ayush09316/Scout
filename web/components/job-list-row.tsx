import Link from "next/link";
import { CompanyLogo } from "./company-logo";
import { ScoreRing } from "./score-ring";
import { LocationChips } from "./job-chips";
import { SalaryBadge } from "./salary";
import { ChangeBadges } from "./change-badges";
import type { JobListItem } from "@/lib/queries";
import { cn } from "@/lib/utils";

export function JobListRow({ job, extra, hideCompany, className }: { job: JobListItem; extra?: React.ReactNode; hideCompany?: boolean; className?: string }) {
  return (
    <li className={cn("group relative rounded-xl border border-border bg-surface shadow-card transition-colors hover:border-border-strong", className)} data-testid="job-row">
      <div className="flex gap-3 p-3.5 sm:gap-4 sm:p-4">
        <CompanyLogo name={job.companyName} domain={job.companyDomain} size={36} />
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
          </div>
          {extra}
        </div>
      </div>
    </li>
  );
}
