"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ArrowLeft, Printer } from "lucide-react";
import { Button, buttonClass } from "@/components/ui/button";

export function PrintResume({ jobId, body, label, auto }: { jobId: number; body: string; label: string; auto: boolean }) {
  const [md, setMd] = useState(body);

  useEffect(() => {
    try {
      const s = sessionStorage.getItem(`scout-print-${jobId}`);
      if (s) setMd(s);
    } catch {}
    if (!auto) return;
    const t = setTimeout(() => window.print(), 600);
    return () => clearTimeout(t);
  }, [jobId, auto]);

  return (
    <div className="min-h-dvh bg-surface-2 print:bg-white">
      <div className="no-print sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-surface/90 px-4 py-2.5 backdrop-blur">
        <Link href={`/job/${jobId}`} className={buttonClass("ghost", "sm")}>
          <ArrowLeft />
          Back
        </Link>
        <p className="min-w-0 flex-1 truncate text-[13px] text-fg-muted">Tailored for {label}</p>
        <Button size="sm" variant="primary" onClick={() => window.print()}>
          <Printer />
          Print / Save as PDF
        </Button>
      </div>
      <main className="resume-sheet mx-auto my-6 w-full max-w-[210mm] bg-white px-[14mm] py-[12mm] text-black shadow-pop print:my-0 print:max-w-none print:px-0 print:py-0 print:shadow-none">
        <article className="resume-print">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{md}</ReactMarkdown>
        </article>
      </main>
    </div>
  );
}
