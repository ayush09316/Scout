"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { AlertCircle, ArrowRight, Check, Loader2 } from "lucide-react";
import { joinWaitlist, type JoinResult } from "@/lib/waitlist-actions";
import { EMAIL_RE } from "@/lib/waitlist-options";
import { Survey } from "./waitlist-survey";
import { AnimatedCheck } from "./waitlist-success";
import { cn } from "@/lib/utils";

const FIELD =
  "h-11 w-full rounded-xl border border-border bg-surface/80 px-3.5 text-[14px] text-fg shadow-card outline-none transition-colors placeholder:text-fg-subtle hover:border-border-strong focus-visible:border-accent focus-visible:ring-3 focus-visible:ring-ring/30";

export function WaitlistForm({ referral }: { referral: string | null }) {
  const [pending, start] = useTransition();
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [touched, setTouched] = useState(false);
  const [result, setResult] = useState<JoinResult | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const focus = () => {
      if (window.location.hash === "#waitlist") setTimeout(() => emailRef.current?.focus({ preventScroll: true }), 450);
    };
    focus();
    window.addEventListener("hashchange", focus);
    return () => window.removeEventListener("hashchange", focus);
  }, []);

  if (result?.ok && !result.spam) return <Survey key={result.refCode} joined={result} />;
  if (result?.ok && result.spam)
    return (
      <div role="status" data-testid="wl-spam" className="wl-in flex flex-col items-center py-10 text-center">
        <AnimatedCheck />
        <p className="mt-5 text-[15px] text-fg-muted">Thanks — we&apos;ll be in touch.</p>
      </div>
    );

  const emailErr = touched && !EMAIL_RE.test(email.trim()) ? (email ? "Enter a valid email address." : "Email is required.") : result && !result.ok && result.field === "email" ? result.error : null;
  const consentErr = touched && !consent ? "Please tick this so we can contact you." : null;
  const formErr = result && !result.ok && !result.field ? result.error : null;

  return (
    <form
      noValidate
      data-testid="wl-form"
      onSubmit={(e) => {
        e.preventDefault();
        setTouched(true);
        if (!EMAIL_RE.test(email.trim()) || !consent) return;
        const fd = new FormData(e.currentTarget);
        start(async () => setResult(await joinWaitlist(fd)));
      }}
      className="flex flex-col gap-4"
    >
      {referral && <input type="hidden" name="ref" value={referral} />}
      <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="wl-website">Website</label>
        <input id="wl-website" name="website" type="text" tabIndex={-1} autoComplete="off" data-testid="wl-honeypot" />
      </div>
      {formErr && (
        <p role="alert" className="flex items-start gap-2 rounded-xl border border-bad/20 bg-bad-soft px-3 py-2.5 text-[13px] text-bad">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {formErr}
        </p>
      )}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="wl-email" className="text-[13px] font-medium text-fg">
          Work or personal email
        </label>
        <input
          ref={emailRef}
          id="wl-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={Boolean(emailErr)}
          aria-describedby={emailErr ? "wl-email-err" : undefined}
          className={cn(FIELD, "h-12 text-[15px]", emailErr && "border-bad")}
        />
        {emailErr && (
          <p id="wl-email-err" className="text-xs text-bad">
            {emailErr}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="group flex cursor-pointer items-start gap-3 rounded-xl text-[12.5px] leading-relaxed text-fg-muted">
          <input type="checkbox" name="consent" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="peer sr-only" data-testid="wl-consent" aria-describedby={consentErr ? "wl-consent-err" : undefined} />
          <span
            aria-hidden
            className={cn(
              "mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-[6px] border bg-surface transition-colors peer-focus-visible:ring-3 peer-focus-visible:ring-ring/40",
              consent ? "border-transparent bg-[linear-gradient(135deg,#6366f1,#a855f7)] text-white" : consentErr ? "border-bad" : "border-border-strong group-hover:border-fg-subtle",
            )}
          >
            {consent && <Check className="size-3" strokeWidth={3} />}
          </span>
          <span>
            I agree that Scout may store my email, and any answers I give, only to contact me about Scout. I can delete them anytime via the unsubscribe/delete link.
          </span>
        </label>
        {consentErr && (
          <p id="wl-consent-err" className="pl-[30px] text-xs text-bad">
            {consentErr}
          </p>
        )}
      </div>

      <button type="submit" disabled={pending} className="lx-btn mt-1 inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl text-[15px] font-medium disabled:opacity-70">
        <span className="shine" aria-hidden />
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
        <span>{pending ? "Joining…" : "Join the waitlist"}</span>
        {!pending && <ArrowRight className="size-4" aria-hidden />}
      </button>
      <p className="text-center text-[12px] text-fg-subtle">{referral ? "A friend invited you — joining gives them a bump. " : ""}Next: five optional questions.</p>
    </form>
  );
}
