import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Check, Trash2 } from "lucide-react";
import { BrandLink } from "@/components/landing/brand";
import { Accent } from "@/components/landing/sections";
import { ThemeToggle } from "@/components/theme-toggle";
import { rawSql } from "@/lib/db";
import { leaveWaitlist } from "@/lib/waitlist-actions";
import { validLeaveToken } from "@/lib/waitlist";
import { REF_RE } from "@/lib/waitlist-options";

export const metadata: Metadata = { title: "Leave the waitlist", robots: { index: false } };
export const dynamic = "force-dynamic";

const mask = (email: string) => {
  const [u, d] = email.split("@");
  return `${u.slice(0, 2)}${"•".repeat(Math.max(1, Math.min(6, u.length - 2)))}@${d}`;
};

async function remove(form: FormData) {
  "use server";
  const r = await leaveWaitlist(form);
  redirect(r.ok ? "/waitlist/leave?done=1" : "/waitlist/leave");
}

export default async function Leave({ searchParams }: { searchParams: Promise<{ code?: string; t?: string; done?: string }> }) {
  const { code = "", t = "", done } = await searchParams;
  const valid = REF_RE.test(code) && validLeaveToken(code, t);
  const [row] = valid ? await rawSql<{ email: string }[]>`select email from waitlist where ref_code = ${code}` : [];

  let body: React.ReactNode;
  if (done) {
    body = (
      <>
        <span className="flex size-12 items-center justify-center rounded-full bg-good-soft text-good">
          <Check className="size-6" aria-hidden />
        </span>
        <h1 className="mt-5 text-[1.9rem] leading-[1.05] font-semibold tracking-[-0.04em] text-fg">
          Your details are <Accent>gone.</Accent>
        </h1>
        <p className="mt-2 text-[14px] text-fg-muted" data-testid="leave-done">
          We deleted your waitlist entry. You won&apos;t hear from us again.
        </p>
      </>
    );
  } else if (!row) {
    body = (
      <>
        <h1 className="text-[1.9rem] leading-[1.05] font-semibold tracking-[-0.04em] text-fg">Link not valid</h1>
        <p className="mt-2 text-[14px] text-fg-muted" data-testid="leave-invalid">
          This link is invalid or the entry was already deleted. Use the link from your confirmation email or success screen.
        </p>
      </>
    );
  } else {
    body = (
      <>
        <h1 className="text-[1.9rem] leading-[1.05] font-semibold tracking-[-0.04em] text-fg">
          Leave the <Accent>waitlist?</Accent>
        </h1>
        <p className="mt-2 text-[14px] text-fg-muted">
          This permanently deletes the entry for <span className="font-mono text-fg">{mask(row.email)}</span> and everything you told us.
        </p>
        <form action={remove} className="mt-7">
          <input type="hidden" name="code" value={code} />
          <input type="hidden" name="t" value={t} />
          <button type="submit" className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-bad text-sm font-medium text-white transition-opacity hover:opacity-90">
            <Trash2 className="size-4" aria-hidden />
            Delete my details
          </button>
        </form>
      </>
    );
  }

  return (
    <div className="lx relative min-h-dvh overflow-x-clip">
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="lx-aurora">
          <span className="a" />
          <span className="b" />
          <span className="c" />
        </div>
        <div className="lx-dots" />
      </div>
      <main className="relative flex min-h-dvh flex-col px-4 py-4 sm:px-10">
        <div className="flex items-center justify-between">
          <BrandLink />
          <ThemeToggle compact />
        </div>
        <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center py-10">
          <Link href="/" className="mb-6 inline-flex min-h-11 w-fit items-center gap-1.5 rounded-md text-[13px] text-fg-muted hover:text-fg">
            <ArrowLeft className="size-3.5" aria-hidden />
            Back to home
          </Link>
          <div className="lx-rise lx-glass rounded-[24px] p-6 shadow-[var(--lx-glow)] sm:p-8">{body}</div>
        </div>
      </main>
    </div>
  );
}
