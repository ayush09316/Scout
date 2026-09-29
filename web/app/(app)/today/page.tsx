import type { Metadata } from "next";
import { TodayInbox } from "./today-inbox";
import { getInbox } from "@/lib/queries";

export const metadata: Metadata = { title: "Today" };

export default async function TodayPage() {
  const jobs = await getInbox();
  return <TodayInbox jobs={jobs} />;
}
