import type { Metadata } from "next";
import { TodayInbox } from "./today-inbox";
import { getBriefing, getInbox } from "@/lib/queries";
import { getSkillGaps } from "@/lib/intel";

export const metadata: Metadata = { title: "Today" };

export default async function TodayPage() {
  const [jobs, briefing, gaps] = await Promise.all([getInbox(), getBriefing(), getSkillGaps(1).then((g) => g.gaps).catch(() => [])]);
  const top = gaps[0] && gaps[0].jobsUnlocked > 0 ? { skill: gaps[0].skill, unlocked: gaps[0].jobsUnlocked } : null;
  return <TodayInbox jobs={jobs} briefing={{ ...briefing, topGap: top }} />;
}
