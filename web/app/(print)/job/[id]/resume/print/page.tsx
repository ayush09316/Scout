import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getJob, getProfile } from "@/lib/queries";
import { getLatestVariant } from "@/lib/intel";
import { jobKeywords, tailorDeterministic } from "@/lib/tailor-core";
import { PrintResume } from "./print-resume";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const job = await getJob(Number((await params).id));
  return { title: job ? `Resume · ${job.companyName}` : "Resume" };
}

export default async function PrintPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ auto?: string }> }) {
  const id = Number((await params).id);
  if (!Number.isFinite(id)) notFound();
  const [job, prof, variant, sp] = await Promise.all([getJob(id), getProfile(), getLatestVariant(id), searchParams]);
  if (!job) notFound();
  const body = variant?.bodyMd ?? (prof ? tailorDeterministic(prof.resumeMd, jobKeywords(job.descriptionMd, job.title)) : "");
  return <PrintResume jobId={id} body={body} label={`${job.title} · ${job.companyName}`} auto={sp.auto !== "0"} />;
}
