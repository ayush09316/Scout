"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { credentialsSignIn, githubSignIn, type SignInState } from "@/lib/auth-actions";
import { cn } from "@/lib/utils";

const MESSAGES: Record<string, string> = {
  CredentialsSignin: "That email and password don't match.",
  RateLimited: "Too many attempts. Wait a minute and try again.",
  MissingFields: "Enter your email and password.",
  AccessDenied: "This GitHub account isn't on the allowlist.",
  OAuthAccountNotLinked: "That account is linked to a different sign-in method.",
  OAuthCallbackError: "GitHub sign-in was cancelled or failed. Try again.",
  OAuthSignInError: "Couldn't start GitHub sign-in. Try again.",
  CallbackRouteError: "Sign-in failed. Try again.",
  Configuration: "Sign-in isn't configured correctly on this server.",
  Verification: "That sign-in link has expired.",
};

export const errorMessage = (code?: string) => (code ? (MESSAGES[code] ?? "Sign-in failed. Please try again.") : null);

function GitHubMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className="size-4 fill-current">
      <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.43-2.7 5.4-5.26 5.69.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
    </svg>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="lx-btn flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-medium disabled:opacity-70"
    >
      <span className="shine" aria-hidden />
      {pending && <Loader2 className="size-4 animate-spin" aria-hidden />}
      <span>{pending ? "Signing in…" : "Sign in"}</span>
    </button>
  );
}

function GitHubButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-surface text-sm font-medium text-fg shadow-card transition-colors hover:border-border-strong hover:bg-surface-2 disabled:opacity-70"
    >
      {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <GitHubMark />}
      Continue with GitHub
    </button>
  );
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function SignInForm({ callbackUrl, initialError, credentials, github }: { callbackUrl: string; initialError?: string; credentials: boolean; github: boolean }) {
  const [state, action] = useActionState<SignInState, FormData>(credentialsSignIn, undefined);
  const [touched, setTouched] = useState({ email: false, password: false });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const code = state?.error ?? initialError;
  const err = errorMessage(code);
  const emailErr = touched.email && !EMAIL_RE.test(email) ? (email ? "Enter a valid email address." : "Email is required.") : null;
  const pwErr = touched.password && !password ? "Password is required." : null;

  return (
    <div className="flex flex-col gap-5">
      {err && (
        <p role="alert" data-testid="signin-error" className="flex items-start gap-2 rounded-lg border border-bad/20 bg-bad-soft px-3 py-2.5 text-[13px] text-bad">
          <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {err}
        </p>
      )}
      {credentials && (
        <form
          action={action}
          noValidate
          onSubmit={(e) => {
            setTouched({ email: true, password: true });
            if (!EMAIL_RE.test(email) || !password) e.preventDefault();
          }}
          className="flex flex-col gap-4"
        >
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-[13px] font-medium text-fg">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              inputMode="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              aria-invalid={Boolean(emailErr)}
              aria-describedby={emailErr ? "email-err" : undefined}
              placeholder="you@example.com"
              className={cn(
                "h-11 rounded-xl border bg-surface/80 px-3.5 text-sm text-fg shadow-card outline-none placeholder:text-fg-subtle focus-visible:border-accent focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none",
                emailErr ? "border-bad" : "border-border",
              )}
            />
            {emailErr && (
              <p id="email-err" className="text-xs text-bad">
                {emailErr}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="text-[13px] font-medium text-fg">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={show ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setTouched((t) => ({ ...t, password: true }))}
                aria-invalid={Boolean(pwErr)}
                aria-describedby={pwErr ? "password-err" : undefined}
                className={cn(
                  "h-11 w-full rounded-xl border bg-surface/80 pr-11 pl-3.5 text-sm text-fg shadow-card outline-none focus-visible:border-accent focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none",
                  pwErr ? "border-bad" : "border-border",
                )}
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                aria-label={show ? "Hide password" : "Show password"}
                className="absolute top-1/2 right-1 flex size-9 -translate-y-1/2 items-center justify-center rounded-md text-fg-subtle hover:text-fg"
              >
                {show ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
              </button>
            </div>
            {pwErr && (
              <p id="password-err" className="text-xs text-bad">
                {pwErr}
              </p>
            )}
          </div>
          <SubmitButton />
        </form>
      )}
      {credentials && github && (
        <div className="flex items-center gap-3 text-xs text-fg-subtle" role="separator" aria-label="or">
          <span className="h-px flex-1 bg-border" />
          or
          <span className="h-px flex-1 bg-border" />
        </div>
      )}
      {github && (
        <form action={githubSignIn}>
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
          <GitHubButton />
        </form>
      )}
      {!credentials && !github && (
        <p className="rounded-lg border border-dashed border-border px-3 py-3 text-[13px] text-fg-muted">
          No sign-in method is configured. Set <code className="font-mono text-xs">SCOUT_OWNER_EMAIL</code> and <code className="font-mono text-xs">SCOUT_OWNER_PASSWORD_HASH</code>, or the GitHub OAuth variables.
        </p>
      )}
    </div>
  );
}
