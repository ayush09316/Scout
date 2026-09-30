"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import * as S from "@radix-ui/react-select";
import { AlertCircle, ArrowRight, Check, ChevronDown, Copy, Loader2, Plus } from "lucide-react";
import { joinWaitlist, type JoinResult } from "@/lib/waitlist-actions";
import { EMAIL_RE, EXPERIENCE, ROLES, WOULD_PAY } from "@/lib/waitlist-options";
import { cn } from "@/lib/utils";

const fmt = (n: number) => new Intl.NumberFormat("en-IN").format(n);

const FIELD =
  "h-11 w-full rounded-xl border border-border bg-surface/80 px-3.5 text-[14px] text-fg shadow-card outline-none transition-colors placeholder:text-fg-subtle hover:border-border-strong focus-visible:border-accent focus-visible:ring-3 focus-visible:ring-ring/30";

function Pick({ id, label, value, onChange, options, placeholder }: { id: string; label: string; value: string; onChange: (v: string) => void; options: readonly string[]; placeholder: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label id={`${id}-label`} className="text-[12.5px] font-medium text-fg-muted">
        {label}
      </label>
      <S.Root value={value || undefined} onValueChange={onChange}>
        <S.Trigger aria-labelledby={`${id}-label`} data-testid={`wl-${id}`} className={cn(FIELD, "flex items-center justify-between gap-2 text-left data-[placeholder]:text-fg-subtle data-[state=open]:border-accent")}>
          <span className="truncate">
            <S.Value placeholder={placeholder} />
          </span>
          <S.Icon>
            <ChevronDown className="size-4 text-fg-subtle transition-transform [[data-state=open]_&]:rotate-180" aria-hidden />
          </S.Icon>
        </S.Trigger>
        <S.Portal>
          <S.Content position="popper" sideOffset={6} className="z-[80] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-xl border border-border bg-surface p-1 shadow-lg">
            <S.Viewport>
              {options.map((o) => (
                <S.Item
                  key={o}
                  value={o}
                  className="relative flex h-9 cursor-pointer items-center rounded-lg pr-3 pl-8 text-[13.5px] text-fg-muted outline-none select-none data-[highlighted]:bg-muted data-[highlighted]:text-fg data-[state=checked]:text-fg"
                >
                  <S.ItemIndicator className="absolute left-2.5 inline-flex">
                    <Check className="size-3.5 text-accent" aria-hidden />
                  </S.ItemIndicator>
                  <S.ItemText>{o}</S.ItemText>
                </S.Item>
              ))}
            </S.Viewport>
          </S.Content>
        </S.Portal>
      </S.Root>
    </div>
  );
}

function AnimatedCheck() {
  return (
    <span className="wl-check relative flex size-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,#6366f1,#a855f7_60%,#fb7185)] text-white shadow-[0_12px_32px_-10px_rgb(168_85_247/0.8)]">
      <svg viewBox="0 0 24 24" className="size-7" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M5 12.5l4.5 4.5L19 7.5" />
      </svg>
    </span>
  );
}

type Joined = Extract<JoinResult, { ok: true; spam?: false }>;

function Success({ r }: { r: Joined }) {
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
      <p className="mt-5 text-[13px] text-fg-muted">{r.existing ? "You're already on the list — welcome back." : "You're in. We'll email you when a spot opens."}</p>
      <h3 className="mt-2 text-[2rem] leading-[1.05] font-semibold tracking-[-0.04em] text-fg sm:text-[2.4rem]" data-testid="wl-position">
        You&apos;re <span className="font-display lx-ink italic">#{fmt(r.position)}</span> on the list
      </h3>
      <p className="mt-2 text-[13px] text-fg-subtle">
        {fmt(r.total)} {r.total === 1 ? "person" : "people"} waiting · {r.referrals === 0 ? "no referrals yet" : `${fmt(r.referrals)} ${r.referrals === 1 ? "friend" : "friends"} joined via you`}
      </p>
      <div className="mt-7 w-full max-w-md text-left">
        <p className="text-[13px] font-medium text-fg">Move up: each friend who joins bumps you up</p>
        <p className="mt-1 text-[12.5px] text-fg-subtle">Every referral counts as joining a day earlier.</p>
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
      <a href={r.leaveUrl} className="mt-7 text-[12px] text-fg-subtle underline-offset-4 hover:text-fg-muted hover:underline">
        Changed your mind? Delete my details
      </a>
    </div>
  );
}

export function WaitlistForm({ referral }: { referral: string | null }) {
  const [pending, start] = useTransition();
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [more, setMore] = useState(false);
  const [role, setRole] = useState("");
  const [experience, setExperience] = useState("");
  const [pay, setPay] = useState("");
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

  if (result?.ok && !result.spam) return <Success r={result} />;
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
        fd.set("role", role);
        fd.set("experience", experience);
        fd.set("would_pay", pay);
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

      <button
        type="button"
        onClick={() => setMore((m) => !m)}
        aria-expanded={more}
        aria-controls="wl-more"
        className="inline-flex w-fit items-center gap-1.5 rounded-md text-[13px] text-fg-muted transition-colors hover:text-fg"
      >
        <Plus className={cn("size-3.5 transition-transform duration-300", more && "rotate-45")} aria-hidden />
        {more ? "Hide details" : "Add a few details"}
        <span className="text-fg-subtle">· optional, helps us prioritise</span>
      </button>

      <div id="wl-more" className={cn("grid transition-[grid-template-rows,opacity] duration-400 ease-out", more ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0")} inert={!more}>
        <div className="min-h-0 overflow-hidden">
          <div className="grid gap-3 p-px pb-1 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="wl-name" className="text-[12.5px] font-medium text-fg-muted">
                Name
              </label>
              <input id="wl-name" name="name" autoComplete="name" maxLength={80} placeholder="Asha Rao" className={FIELD} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="wl-city" className="text-[12.5px] font-medium text-fg-muted">
                City
              </label>
              <input id="wl-city" name="city" autoComplete="address-level2" maxLength={80} placeholder="Bengaluru" className={FIELD} />
            </div>
            <Pick id="role" label="Role" value={role} onChange={setRole} options={ROLES} placeholder="Pick a role" />
            <Pick id="experience" label="Experience" value={experience} onChange={setExperience} options={EXPERIENCE} placeholder="Years of experience" />
            <Pick id="pay" label="Would you pay for this?" value={pay} onChange={setPay} options={WOULD_PAY} placeholder="Be honest" />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="wl-source" className="text-[12.5px] font-medium text-fg-muted">
                How did you hear about Scout?
              </label>
              <input id="wl-source" name="source" maxLength={120} placeholder="A friend, LinkedIn, X…" className={FIELD} />
            </div>
          </div>
        </div>
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
            I agree that Scout may store these details only to contact me about Scout. I can delete them anytime via the unsubscribe/delete link.
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
      {referral && <p className="text-center text-[12px] text-fg-subtle">A friend invited you — joining gives them a bump.</p>}
    </form>
  );
}
