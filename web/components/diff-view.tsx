"use client";

import { diffWords } from "diff";
import { useMemo } from "react";
import { cn } from "@/lib/utils";

export function useWordDiff(a: string, b: string) {
  return useMemo(() => diffWords(a, b), [a, b]);
}

export function DiffPane({ a, b, side, className }: { a: string; b: string; side: "left" | "right" | "inline"; className?: string }) {
  const parts = useWordDiff(a, b);
  return (
    <pre className={cn("font-sans text-[13px] leading-relaxed whitespace-pre-wrap break-words text-fg-muted", className)}>
      {parts.map((p, i) => {
        if (p.added) return side === "left" ? null : <ins key={i} className="rounded-sm bg-good-soft text-good no-underline decoration-transparent">{p.value}</ins>;
        if (p.removed) return side === "right" ? null : <del key={i} className="rounded-sm bg-bad-soft text-bad decoration-bad/50">{p.value}</del>;
        return <span key={i}>{p.value}</span>;
      })}
    </pre>
  );
}

export function diffStats(a: string, b: string) {
  const parts = diffWords(a, b);
  const count = (s: string) => s.split(/\s+/).filter(Boolean).length;
  return { added: parts.filter((p) => p.added).reduce((x, p) => x + count(p.value), 0), removed: parts.filter((p) => p.removed).reduce((x, p) => x + count(p.value), 0) };
}
