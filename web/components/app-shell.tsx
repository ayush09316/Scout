"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Keyboard, Radar, Search } from "lucide-react";
import { NAV } from "./nav-items";
import { ThemeToggle } from "./theme-toggle";
import { useUI } from "./ui-context";
import { Kbd } from "./ui/kbd";
import { cn } from "@/lib/utils";
import { useHotkeys } from "@/lib/hotkeys";

export function Logo() {
  return (
    <Link href="/today" className="flex items-center gap-2 rounded-md font-semibold tracking-tight text-fg">
      <span className="flex size-7 items-center justify-center rounded-lg bg-accent text-accent-fg">
        <Radar className="size-4" aria-hidden />
      </span>
      Scout
    </Link>
  );
}

export function AppShell({ children, counts, user }: { children: React.ReactNode; counts: { inbox: number; labeled: number }; user: string | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const { setPaletteOpen, setHelpOpen, demo } = useUI();
  const goMap: Record<string, () => void> = {
    "?": () => setHelpOpen(true),
    "/": () => setPaletteOpen(true),
  };
  for (const n of NAV) goMap[`g ${n.key}`] = () => router.push(n.href);
  useHotkeys(goMap, { global: true });

  const badge = (href: string) => (href === "/today" ? counts.inbox : href === "/label" ? `${counts.labeled}/200` : null);

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[232px_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-border bg-surface-2/60 px-3 py-4 md:flex">
        <div className="flex items-center justify-between px-2">
          <Logo />
          {demo && (
            <span className="rounded-md bg-warn-soft px-1.5 py-0.5 text-[11px] font-medium text-warn" title="Read-only public demo">
              Demo
            </span>
          )}
        </div>
        <button
          onClick={() => setPaletteOpen(true)}
          className="mt-5 flex h-9 items-center gap-2 rounded-lg border border-border bg-surface px-2.5 text-sm text-fg-subtle shadow-card transition-colors hover:border-border-strong hover:text-fg-muted"
        >
          <Search className="size-4" aria-hidden />
          <span className="flex-1 text-left">Search jobs…</span>
          <Kbd>⌘K</Kbd>
        </button>
        <nav aria-label="Main" className="mt-4 flex flex-col gap-0.5">
          {NAV.map((n) => {
            const active = pathname.startsWith(n.href);
            const b = badge(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium transition-colors",
                  active ? "bg-surface text-fg shadow-card ring-1 ring-border" : "text-fg-muted hover:bg-muted hover:text-fg",
                )}
              >
                <n.icon className={cn("size-4", active ? "text-accent" : "text-fg-subtle group-hover:text-fg-muted")} aria-hidden />
                <span className="flex-1">{n.label}</span>
                {b != null && b !== 0 && <span className="font-mono text-[11px] tabular-nums text-fg-subtle">{b}</span>}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto flex flex-col gap-3 px-1">
          <button onClick={() => setHelpOpen(true)} className="flex h-8 items-center gap-2 rounded-md px-1.5 text-xs text-fg-subtle hover:text-fg-muted">
            <Keyboard className="size-3.5" aria-hidden />
            <span className="flex-1 text-left">Keyboard shortcuts</span>
            <Kbd>?</Kbd>
          </button>
          <ThemeToggle />
          {user && <p className="truncate px-1.5 text-xs text-fg-subtle">Signed in as {user}</p>}
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-bg/85 px-4 backdrop-blur md:hidden">
        <Logo />
        <div className="flex items-center gap-1">
          {demo && <span className="mr-1 rounded-md bg-warn-soft px-1.5 py-0.5 text-[11px] font-medium text-warn">Demo</span>}
          <button onClick={() => setPaletteOpen(true)} aria-label="Search" className="inline-flex size-9 items-center justify-center rounded-lg text-fg-muted hover:bg-muted">
            <Search className="size-4" />
          </button>
          <ThemeToggle compact />
        </div>
      </header>

      <main className="min-w-0 pb-24 md:pb-0">{children}</main>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        {NAV.map((n) => {
          const active = pathname.startsWith(n.href);
          return (
            <Link
              key={n.href}
              href={n.href}
              aria-current={active ? "page" : undefined}
              className={cn("flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium", active ? "text-accent" : "text-fg-subtle")}
            >
              <n.icon className="size-5" aria-hidden />
              {n.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function PageHeader({ title, description, actions }: { title: string; description?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-fg">{title}</h1>
        {description && <p className="mt-1 text-sm text-fg-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
