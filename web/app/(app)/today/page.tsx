import type { Metadata } from "next";
import { TodayInbox } from "./today-inbox";
import { getBriefing, getInbox } from "@/lib/queries";

export const metadata: Metadata = { title: "Today" };

export default async function TodayPage() {
  const [jobs, briefing] = await Promise.all([getInbox(), getBriefing()]);
  return <TodayInbox jobs={jobs} briefing={briefing} />;
}
