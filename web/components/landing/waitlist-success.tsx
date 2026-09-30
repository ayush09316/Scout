"use client";

import { useState } from "react";
import { ArrowRight, Check, Copy } from "lucide-react";
import type { JoinResult } from "@/lib/waitlist-actions";

const fmt = (n: number) => new Intl.NumberFormat("en-IN").format(n);

export function AnimatedCheck() {
  return (
    <span className="wl-check relative flex size-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,#6366f1,#a855f7_60%,#fb7185)] text-white shadow-[0_12px_32px_-10px_rgb(168_85_247/0.8)]">
      <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
    </span>
  );
}

export type Joined = Extract<JoinResult, { ok: true; spam?: false }>;

export function Success({ r, onResume }: { r: Joined; onResume?: () => void }) {
  const [copied, setCopied] = useState(false);
  const text = "I just joined the Scout waitlist — a job-hunt copilot that ranks fresh postings against your resume every morning.";
  const share = [
    { label: "WhatsApp", href: `https://wa.me/?text=${encodeURIComponent(`${text} ${r.shareUrl}`)}` },
    { label: "X", href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(r.shareUrl)}` },
    { label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(r.shareUrl)}` },
  ];
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(r.shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };
  return (
    <div role="status" data-testid="wl-success" className="wl-in flex flex-col items-center text-center">
      <AnimatedCheck />
      <p className="mt-5 text-[13px] text-fg-muted">
        {r.surveyDone ? "Thanks — your answers shape what we build first." : r.existing ? "You're already on the list — welcome back." : "You're in. We'll email you when a spot opens."}
      </p>
      <h3 className="mt-2 text-[2rem] leading-[1.05] font-semibold tracking-[-0.04em] text-fg sm:text-[2.4rem]" data-testid="wl-position">
        You&apos;re <span className="font-display lx-ink italic">#{fmt(r.position)}</span> on the list
      </h3>
      <p className="mt-2 text-[13px] text-fg-subtle">
        {fmt(r.total)} {r.total === 1 ? "person" : "people"} waiting · {r.referrals === 0 ? "no referrals yet" : `${fmt(r.referrals)} ${r.referrals === 1 ? "friend" : "friends"} joined via you`}
      </p>
      <div className="mt-7 w-full max-w-md text-left">
        <p className="text-[13px] font-medium text-fg">Move up: each friend who joins bumps you up</p>
        <p className="mt-1 text-[12.5px] text-fg-subtle">
          Every referral counts as joining a day earlier.{r.surveyDone ? " Your finished survey already counts as one." : ""}
        </p>
        <div className="mt-3 flex items-center gap-1.5 rounded-xl border border-border bg-surface/80 p-1.5 pl-3.5 shadow-card">
          <code data-testid="wl-ref-link" className="min-w-0 flex-1 truncate font-mono text-[12.5px] text-fg-muted">
            {r.shareUrl}
          </code>
          <button type="button" onClick={copy} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg bg-fg px-3 text-[12.5px] font-medium text-bg transition-opacity hover:opacity-90">
            {copied ? <Check className="size-3.5" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {share.map((s) => (
            <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" className="lx-btn-2 inline-flex h-10 items-center justify-center rounded-xl text-[13px] font-medium">
              {s.label}
            </a>
          ))}
        </div>
      </div>
      {!r.surveyDone && onResume && (
        <button type="button" onClick={onResume} data-testid="wl-resume" className="lx-btn-2 mt-5 inline-flex min-h-11 w-full max-w-md items-center justify-center gap-2 rounded-xl px-4 text-[13.5px] font-medium">
          Answer 5 quick questions to move up a day
          <ArrowRight className="size-4" aria-hidden />
        </button>
      )}
      <a href={r.leaveUrl} className="mt-5 inline-flex min-h-11 items-center text-[12px] text-fg-subtle underline-offset-4 hover:text-fg-muted hover:underline">
        Changed your mind? Delete my details
      </a>
    </div>
  );
}
