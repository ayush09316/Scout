import type { Metadata } from "next";
import { PageHeader } from "@/components/app-shell";
import { getCompanies, getProfile } from "@/lib/queries";
import { ProfileForm } from "./profile-form";
import { CompaniesTable } from "./companies-table";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const [prof, companies] = await Promise.all([getProfile(), getCompanies()]);
  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-8 md:py-8">
      <PageHeader title="Settings" description="Your profile drives scoring. Saving creates a new profile version and triggers re-scoring on the next run." />
      <div className="mt-6 space-y-6">
        <ProfileForm profile={prof} />
        <CompaniesTable companies={companies} />
      </div>
    </div>
  );
}
