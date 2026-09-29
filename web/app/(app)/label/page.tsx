import type { Metadata } from "next";
import { getLabelQueue } from "@/lib/queries";
import { splitFor } from "@/lib/split";
import { LabelMode } from "./label-mode";

export const metadata: Metadata = { title: "Label" };

export default async function LabelPage() {
  const { queue, labeled, fit } = await getLabelQueue();
  return <LabelMode queue={queue.map((q) => ({ ...q, split: splitFor(q.id) }))} labeled={labeled} fit={fit} target={200} />;
}
