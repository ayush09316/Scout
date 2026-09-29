"use client";

import { useState } from "react";
import { cn, initials } from "@/lib/utils";

const palette = ["bg-accent-soft text-accent-soft-fg", "bg-good-soft text-good", "bg-warn-soft text-warn", "bg-bad-soft text-bad", "bg-muted text-fg-muted"];

export function CompanyLogo({ name, domain, size = 40, className }: { name: string; domain: string | null; size?: number; className?: string }) {
  const [failed, setFailed] = useState(false);
  const tone = palette[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % palette.length];
  const style = { width: size, height: size };
  if (!domain || failed) {
    return (
      <div aria-hidden style={style} className={cn("flex shrink-0 items-center justify-center rounded-lg text-xs font-semibold", tone, className)}>
        {initials(name)}
      </div>
    );
  }
  return (
    <div style={style} className={cn("flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-white", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`}
        alt=""
        width={size * 0.6}
        height={size * 0.6}
        loading="lazy"
        onError={() => setFailed(true)}
        onLoad={(e) => {
          if ((e.currentTarget.naturalWidth ?? 0) <= 16) setFailed(true);
        }}
      />
    </div>
  );
}
