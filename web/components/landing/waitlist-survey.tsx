"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { AlertCircle, ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { saveWaitlistAnswers } from "@/lib/waitlist-actions";
import { EXPERIENCE, LIKELIHOOD, LIKELIHOOD_LABELS, LOCATIONS, MAX_PAINS, MAX_REASON, MAX_ROLES, PAINS, ROLES, STAGES, SURVEY_STEPS, TOOLS } from "@/lib/waitlist-options";
import { cn } from "@/lib/utils";
import { Success, type Joined } from "./waitlist-success";

const fmt = (n: number) => new Intl.NumberFormat("en-IN").format(n);

type Answers = { stage: string | null; roles: string[]; experience: string | null; locations: string[]; pains: string[]; tools: string[]; likelihood: number | null; reason: string };

const EMPTY: Answers = { stage: null, roles: [], experience: null, locations: [], pains: [], tools: [], likelihood: null, reason: "" };

const TITLES = ["Where are you in your job search?", "What do you do?", "What's the most painful part of job hunting right now?", "What do you use today?", "If Scout Pro cost ₹299/month, how likely are you to pay for it?"];

const HINTS = ["Pick one.", "Up to two roles, your experience, and where you'd work.", `Pick up to ${MAX_PAINS}.`, "Pick all that apply.", "Be honest — a 2 is more useful to us than a polite 5."];

const RING = "focus-within:ring-3 focus-within:ring-ring/40 has-[:focus-visible]:ring-3";

const payload = (step: number, a: Answers) =>
  step === 1
    ? { stage: a.stage }
    : step === 2
      ? { roles: a.roles, experience: a.experience, locations: a.locations }
      : step === 3
        ? { pains: a.pains }
        : step === 4
          ? { tools: a.tools }
          : { likelihood: a.likelihood, reason: a.reason.trim() || null };

const answered = (step: number, a: Answers) =>
  step === 1 ? a.stage != null : step === 2 ? a.roles.length > 0 || a.experience != null || a.locations.length > 0 : step === 3 ? a.pains.length > 0 : step === 4 ? a.tools.length > 0 : a.likelihood != null;

function Mark({ on, round }: { on: boolean; round?: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-[18px] shrink-0 items-center justify-center border transition-colors",
        round ? "rounded-full" : "rounded-[6px]",
        on ? "border-transparent bg-[linear-gradient(135deg,#6366f1,#a855f7)] text-white" : "border-border-strong bg-surface",
      )}
    >
      {on && (round ? <span className="size-1.5 rounded-full bg-white" /> : <Check className="size-3" strokeWidth={3} />)}
    </span>
  );
}

function Option({
  type,
  name,
  label,
  checked,
  disabled,
  onChange,
  variant,
  testId,
}: {
  type: "radio" | "checkbox";
  name: string;
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
  variant: "card" | "chip";
  testId?: string;
}) {
  return (
    <label
      data-testid={testId}
      className={cn(
        "relative flex cursor-pointer items-center gap-2.5 border text-left transition-[border-color,background-color,box-shadow,transform] duration-200 select-none",
        variant === "card" ? "min-h-12 rounded-xl px-3.5 py-2.5 text-[14px]" : "min-h-11 rounded-full px-3.5 text-[13.5px]",
        checked
          ? "border-accent/60 bg-[color-mix(in_oklab,var(--accent)_10%,var(--surface))] text-fg shadow-[0_0_0_1px_color-mix(in_oklab,var(--accent)_35%,transparent)]"
          : "border-border bg-surface/70 text-fg-muted hover:border-border-strong hover:text-fg",
        disabled && !checked && "cursor-not-allowed opacity-45 hover:border-border hover:text-fg-muted",
        RING,
      )}
    >
      <input type={type} name={name} value={label} checked={checked} disabled={disabled && !checked} onChange={onChange} className="sr-only" />
      <Mark on={checked} round={type === "radio"} />
      <span className="min-w-0">{label}</span>
    </label>
  );
}

function Group({ legend, hint, children, className }: { legend: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-2.5 flex w-full items-baseline justify-between gap-3 text-[13px] font-medium text-fg">
        {legend}
        {hint && <span className="text-[12px] font-normal text-fg-subtle">{hint}</span>}
      </legend>
      <div className={cn("flex flex-wrap gap-2", className)}>{children}</div>
    </fieldset>
  );
}

const toggle = (list: string[], v: string, max: number) => (list.includes(v) ? list.filter((x) => x !== v) : list.length >= max ? list : [...list, v]);

function Step({ step, a, set }: { step: number; a: Answers; set: (p: Partial<Answers>) => void }) {
  if (step === 1)
    return (
      <div role="radiogroup" aria-labelledby="wl-q" className="grid gap-2 sm:grid-cols-2">
        {STAGES.map((o) => (
          <Option key={o} type="radio" name="stage" label={o} checked={a.stage === o} onChange={() => set({ stage: o })} variant="card" />
        ))}
      </div>
    );
  if (step === 2)
    return (
      <div className="flex flex-col gap-6">
        <Group legend="Role" hint={`Up to ${MAX_ROLES} · ${a.roles.length}/${MAX_ROLES}`}>
          {ROLES.map((o) => (
            <Option key={o} type="checkbox" name="roles" label={o} checked={a.roles.includes(o)} disabled={a.roles.length >= MAX_ROLES} onChange={() => set({ roles: toggle(a.roles, o, MAX_ROLES) })} variant="chip" />
          ))}
        </Group>
        <Group legend="Experience">
          <div role="radiogroup" aria-label="Experience" className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4">
            {EXPERIENCE.map((o) => (
              <Option key={o} type="radio" name="experience" label={o} checked={a.experience === o} onChange={() => set({ experience: o })} variant="chip" />
            ))}
          </div>
        </Group>
        <Group legend="Where do you want to work?" hint="Pick any">
          {LOCATIONS.map((o) => (
            <Option key={o} type="checkbox" name="locations" label={o} checked={a.locations.includes(o)} onChange={() => set({ locations: toggle(a.locations, o, LOCATIONS.length) })} variant="chip" />
          ))}
        </Group>
      </div>
    );
  if (step === 3)
    return (
      <Group legend="Pains" hint={`${a.pains.length}/${MAX_PAINS} picked`} className="flex-col flex-nowrap">
        {PAINS.map((o) => (
          <Option key={o} type="checkbox" name="pains" label={o} checked={a.pains.includes(o)} disabled={a.pains.length >= MAX_PAINS} onChange={() => set({ pains: toggle(a.pains, o, MAX_PAINS) })} variant="card" />
        ))}
      </Group>
    );
  if (step === 4)
    return (
      <Group legend="Tools" hint="Pick any">
        {TOOLS.map((o) => (
          <Option key={o} type="checkbox" name="tools" label={o} checked={a.tools.includes(o)} onChange={() => set({ tools: toggle(a.tools, o, TOOLS.length) })} variant="chip" />
        ))}
      </Group>
    );
  return (
    <div className="flex flex-col gap-6">
      <fieldset className="min-w-0">
        <legend className="sr-only">Likelihood from 1, not at all, to 5, definitely</legend>
        <div role="radiogroup" aria-labelledby="wl-q" className="grid grid-cols-5 gap-1 rounded-2xl border border-border bg-surface/70 p-1">
          {LIKELIHOOD.map((n) => {
            const on = a.likelihood === n;
            return (
              <label
                key={n}
                data-testid={`wl-like-${n}`}
                className={cn(
                  "relative flex h-12 cursor-pointer items-center justify-center rounded-xl font-mono text-[16px] font-semibold tabular-nums transition-colors select-none",
                  on ? "bg-fg text-bg shadow-card" : "text-fg-muted hover:bg-muted hover:text-fg",
                  "has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50",
                )}
              >
                <input type="radio" name="likelihood" value={n} checked={on} onChange={() => set({ likelihood: n })} className="sr-only" aria-label={LIKELIHOOD_LABELS[n] ? `${n} — ${LIKELIHOOD_LABELS[n]}` : String(n)} />
                {n}
              </label>
            );
          })}
        </div>
        <div aria-hidden className="mt-2 grid grid-cols-5 text-[11.5px] text-fg-subtle">
          <span className="text-left">Not at all</span>
          <span />
          <span className="text-center">Maybe</span>
          <span />
          <span className="text-right">Definitely</span>
        </div>
      </fieldset>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="wl-reason" className="flex items-baseline justify-between gap-3 text-[13px] font-medium text-fg">
          What would make it worth paying for?
          <span className="text-[12px] font-normal text-fg-subtle">Optional</span>
        </label>
        <textarea
          id="wl-reason"
          rows={3}
          maxLength={MAX_REASON}
          value={a.reason}
          onChange={(e) => set({ reason: e.target.value })}
          placeholder="Salary data, interview prep, a job I'd never have found…"
          aria-describedby="wl-reason-count"
          className="w-full resize-none rounded-xl border border-border bg-surface/80 px-3.5 py-3 text-[14px] text-fg shadow-card outline-none transition-colors placeholder:text-fg-subtle hover:border-border-strong focus-visible:border-accent focus-visible:ring-3 focus-visible:ring-ring/30"
        />
        <p id="wl-reason-count" className="text-right font-mono text-[11px] text-fg-subtle tabular-nums">
          {a.reason.length}/{MAX_REASON}
        </p>
      </div>
    </div>
  );
}

export function Survey({ joined }: { joined: Joined }) {
  const [r, setR] = useState(joined);
  const [step, setStep] = useState(() => (joined.surveyDone ? 0 : Math.min(joined.surveyStep + 1, SURVEY_STEPS)));
  const [dir, setDir] = useState<1 | -1>(1);
  const [a, setA] = useState<Answers>(EMPTY);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<"next" | "skip" | null>(null);
  const head = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);

  useEffect(() => {
    if (moved.current) head.current?.focus({ preventScroll: true });
  }, [step]);

  if (step === 0) return <Success r={r} onResume={r.surveyDone ? undefined : () => go(Math.min(r.surveyStep + 1, SURVEY_STEPS), 1)} />;

  function go(next: number, d: 1 | -1) {
    moved.current = true;
    setDir(d);
    setErr(null);
    setStep(next);
  }

  const submit = (skip: boolean) => {
    setBusy(skip ? "skip" : "next");
    start(async () => {
      const res = await saveWaitlistAnswers(r.refCode, r.token, step, skip ? null : payload(step, a));
      setBusy(null);
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      setR((p) => ({ ...p, position: res.position, total: res.total, referrals: res.referrals, surveyStep: res.surveyStep, surveyDone: res.surveyDone }));
      go(step >= SURVEY_STEPS ? 0 : step + 1, 1);
    });
  };

  const set = (p: Partial<Answers>) => setA((x) => ({ ...x, ...p }));
  const ok = answered(step, a);

  return (
    <div data-testid="wl-survey" data-step={step} className="flex flex-col">
      <div className="flex items-center justify-between gap-3 text-[12px]">
        <span className="font-medium text-fg-muted" data-testid="wl-step-label">
          Step {step} of {SURVEY_STEPS}
        </span>
        <span className="truncate text-fg-subtle">
          You&apos;re <span className="font-mono text-fg tabular-nums">#{fmt(r.position)}</span>
          {r.existing ? " · welcome back" : ""}
        </span>
      </div>
      <div role="progressbar" aria-label="Survey progress" aria-valuemin={0} aria-valuemax={SURVEY_STEPS} aria-valuenow={step - 1} className="mt-2.5 h-1 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-[linear-gradient(90deg,#6366f1,#a855f7_60%,#fb7185)] transition-[width] duration-500 ease-out" style={{ width: `${(step / SURVEY_STEPS) * 100}%` }} />
      </div>

      {step === 1 && !r.existing && (
        <p className="mt-5 rounded-xl border border-border bg-surface/60 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-fg-muted" data-testid="wl-intro">
          <span className="font-medium text-fg">You&apos;re on the list.</span> Five optional questions help us decide what to build first. Answering moves you up the list — finishing counts like one referral.
        </p>
      )}

      <form
        key={step}
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (ok && !pending) submit(false);
        }}
        className={cn("mt-5 flex flex-col", dir === 1 ? "wl-step-f" : "wl-step-b")}
      >
        <h3 id="wl-q" ref={head} tabIndex={-1} className="text-[1.35rem] leading-[1.15] font-semibold tracking-[-0.03em] text-balance text-fg outline-none sm:text-[1.55rem]">
          {step === 5 ? (
            <>
              If Scout Pro cost <span className="font-display lx-ink font-normal italic">₹299/month</span>, how likely are you to pay for it?
            </>
          ) : (
            TITLES[step - 1]
          )}
        </h3>
        <p className="mt-1.5 text-[12.5px] text-fg-subtle">{HINTS[step - 1]}</p>
        <div className="mt-5">
          <Step step={step} a={a} set={set} />
        </div>

        {err && (
          <p role="alert" className="mt-4 flex items-start gap-2 rounded-xl border border-bad/20 bg-bad-soft px-3 py-2.5 text-[13px] text-bad">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            {err}
          </p>
        )}

        <div className="mt-6 grid grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-2">
          <button
            type="button"
            onClick={() => go(step - 1, -1)}
            disabled={step === 1 || pending}
            aria-label="Back"
            className="inline-flex size-11 items-center justify-center rounded-xl border border-border text-fg-muted transition-colors hover:border-border-strong hover:text-fg focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none disabled:invisible"
          >
            <ArrowLeft className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => submit(true)}
            disabled={pending}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl px-3.5 text-[13.5px] font-medium text-fg-muted transition-colors hover:bg-muted hover:text-fg focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none disabled:opacity-60"
          >
            {busy === "skip" && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
            Skip
          </button>
          <button
            type="submit"
            disabled={!ok || pending}
            className="lx-btn inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-[14px] font-medium focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          >
            <span className="shine" aria-hidden />
            {busy === "next" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            <span>{step === SURVEY_STEPS ? "Finish" : "Continue"}</span>
            {busy !== "next" && <ArrowRight className="size-4" aria-hidden />}
          </button>
        </div>
      </form>

      <button type="button" onClick={() => go(0, 1)} disabled={pending} data-testid="wl-skip-survey" className="mx-auto mt-4 inline-flex min-h-11 items-center px-2 text-[12.5px] text-fg-subtle underline-offset-4 transition-colors hover:text-fg-muted hover:underline focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none rounded-md">
        Skip survey
      </button>
    </div>
  );
}
