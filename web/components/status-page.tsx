"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { BrandMark } from "./landing/brand";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";

export function StatusPage({ code, title, description, detail, actions, className }: { code: string; title: React.ReactNode; description: React.ReactNode; detail?: React.ReactNode; actions?: React.ReactNode; className?: string }) {
  return (
    <main className={cn("relative isolate flex min-h-dvh flex-col overflow-hidden bg-bg text-fg", className)}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 [background-image:linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_42%,#000_10%,transparent_70%)]"
      />
      <header className="flex h-16 items-center px-4 sm:px-10">
        <Link href="/" className="flex min-h-11 items-center gap-2 rounded-md text-[15px] font-semibold tracking-tight text-fg">
          <BrandMark />
          Scout
        </Link>
      </header>
      <section className="flex flex-1 items-center justify-center px-4 pb-24">
        <div className="w-full max-w-[440px]">
          <p className="font-mono text-[11px] font-medium tracking-[0.08em] text-fg-subtle uppercase">{code}</p>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-balance text-fg sm:text-3xl">{title}</h1>
          <p className="mt-3 text-sm text-fg-muted">{description}</p>
          {detail && <div className="mt-6">{detail}</div>}
          {actions && <div className="mt-8 flex flex-wrap items-center gap-2">{actions}</div>}
        </div>
      </section>
    </main>
  );
}

export function RequestedPath() {
  const pathname = usePathname();
  return (
    <div className="flex items-center gap-3 overflow-hidden rounded-lg border border-border bg-surface px-3 py-2.5 shadow-card">
      <span className="size-1.5 shrink-0 rounded-full bg-warn" aria-hidden />
      <code className="min-w-0 flex-1 truncate font-mono text-xs text-fg">{pathname || "/"}</code>
      <span className="shrink-0 font-mono text-[10px] tracking-[0.06em] text-warn uppercase">Not found</span>
    </div>
  );
}

export function ErrorReference({ digest }: { digest?: string }) {
  if (!digest) return null;
  return (
    <p className="flex min-w-0 items-center gap-2 font-mono text-[11px] text-fg-subtle">
      <span className="size-1.5 shrink-0 rounded-full bg-bad" aria-hidden />
      <span className="truncate">Reference {digest}</span>
    </p>
  );
}

export function BackButton({ fallback = "/today" }: { fallback?: string }) {
  const router = useRouter();
  return (
    <Button type="button" variant="ghost" onClick={() => (window.history.length > 1 ? router.back() : router.push(fallback))}>
      <ArrowLeft aria-hidden />
      Go back
    </Button>
  );
}
