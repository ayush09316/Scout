"use client";

import { useEffect, useState } from "react";
import { ScoreRing } from "@/components/score-ring";
import { cn } from "@/lib/utils";

export function StickyJobHeader({ targetId, title, company, fit, children }: { targetId: string; title: string; company: string; fit: number | null; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const el = document.getElementById(targetId);
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setShow(!e.isIntersecting && e.boundingClientRect.top < 0), { rootMargin: "-56px 0px 0px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [targetId]);
  return (
    <div
      data-testid="sticky-job-header"
      aria-hidden={!show}
      inert={!show}
      className={cn(
        "fixed inset-x-0 top-14 z-30 border-b border-border bg-bg/90 backdrop-blur transition-[transform,opacity] duration-200 md:top-0 md:left-[232px]",
        show ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-full opacity-0",
      )}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 md:px-8">
        <ScoreRing value={fit} size={32} stroke={3} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{title}</p>
          <p className="truncate text-xs text-fg-muted">{company}</p>
        </div>
        {children}
      </div>
    </div>
  );
}
