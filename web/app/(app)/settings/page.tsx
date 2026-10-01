import type { Metadata } from "next";
import { PageHeader } from "@/components/app-shell";
import { getCompanies, getProfile } from "@/lib/queries";
import { ProfileForm } from "./profile-form";
import { CompaniesTable } from "./companies-table";
import { ApiKeys } from "./api-keys";
import { hasServerKey } from "@/lib/llm";
import { getSkillGaps } from "@/lib/intel";
import { SkillsToLearn } from "@/components/skills-to-learn";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const [prof, companies, gaps] = await Promise.all([getProfile(), getCompanies(), getSkillGaps(8).then((g) => g.gaps).catch(() => [])]);
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-8">
      <PageHeader title="Settings" description="Your profile drives scoring. Saving creates a new profile version and triggers re-scoring on the next run." />
      <div className="ap-stagger mt-6 space-y-6">
        <ProfileForm profile={prof} />
        <SkillsToLearn gaps={gaps} />
        <ApiKeys serverKey={hasServerKey()} />
        <CompaniesTable companies={companies} />
      </div>
    </div>
  );
}
