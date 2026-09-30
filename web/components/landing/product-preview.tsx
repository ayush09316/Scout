import type { Salary } from "@/lib/format";
import type { JobListItem } from "@/lib/queries";

export type PreviewJob = {
  id: string;
  title: string;
  company: string;
  location: string | null;
  remote: boolean;
  seniority: string | null;
  fit: number;
  salary: Salary | null;
  reasons: string[];
  missing: string[];
};

export const SAMPLE_JOBS: PreviewJob[] = [
  {
    id: "s1",
    title: "Senior Backend Engineer, Payments",
    company: "Sample Fintech Co.",
    location: "Bengaluru",
    remote: false,
    seniority: "senior",
    fit: 0.86,
    salary: { kind: "estimate", low: 3800000, high: 5200000, currency: "INR", confidence: 0.62 },
    reasons: ["Python + Postgres at scale", "Event-driven services", "Payments domain"],
    missing: ["Kafka"],
  },
  {
    id: "s2",
    title: "Software Engineer, Platform",
    company: "Sample Dev Tools",
    location: "India",
    remote: true,
    seniority: "mid",
    fit: 0.74,
    salary: { kind: "actual", low: 3000000, high: 4200000, currency: "INR" },
    reasons: ["Kubernetes", "Django / DRF", "Observability"],
    missing: ["Go"],
  },
  {
    id: "s3",
    title: "Full-stack Engineer",
    company: "Sample Commerce",
    location: "Remote",
    remote: true,
    seniority: "mid",
    fit: 0.58,
    salary: null,
    reasons: ["Next.js + TypeScript", "Integrations"],
    missing: ["GraphQL", "Rust"],
  },
];

export function toPreview(jobs: JobListItem[]): PreviewJob[] {
  return jobs.map((j) => ({
    id: String(j.id),
    title: j.title,
    company: j.companyName,
    location: j.location,
    remote: j.remote,
    seniority: j.seniority,
    fit: j.fitProb ?? 0,
    salary: j.salary,
    reasons: j.reasons,
    missing: j.missingSkills,
  }));
}

