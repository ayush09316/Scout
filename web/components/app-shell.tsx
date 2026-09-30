"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Ellipsis, Keyboard, LogOut, Radar, Search } from "lucide-react";
import { signOutAction } from "@/lib/auth-actions";
import { MOBILE_PRIMARY, NAV, NAV_GROUPS } from "./nav-items";
import { RemindersBell } from "./reminders-bell";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import type { ReminderItem } from "@/lib/intel";
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

export function AppShell({ children, counts, user, reminders }: { children: React.ReactNode; counts: { inbox: number; labeled: number }; user: string | null; reminders: ReminderItem[] }) {
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
        <div className="flex items-center justify-between gap-1 pl-2">
          <Logo />
          <div className="flex items-center gap-1">
            {demo && (
              <span className="rounded-md bg-warn-soft px-1.5 py-0.5 text-[11px] font-medium text-warn" title="Read-only public demo">
                Demo
              </span>
            )}
            <RemindersBell items={reminders} className="size-8" />
          </div>
        </div>
        <button
          onClick={() => setPaletteOpen(true)}
          className="mt-5 flex h-9 items-center gap-2 rounded-lg border border-border bg-surface px-2.5 text-sm text-fg-subtle shadow-card transition-colors hover:border-border-strong hover:text-fg-muted"
        >
          <Search className="size-4" aria-hidden />
          <span className="flex-1 text-left">Search jobs…</span>
          <Kbd>⌘K</Kbd>
        </button>
        <nav aria-label="Main" className="mt-4 flex flex-col gap-4 overflow-y-auto">
          {NAV_GROUPS.map((g) => (
            <div key={g} className="flex flex-col gap-0.5">
              <p className="px-2.5 pb-1 text-[11px] font-medium text-fg-subtle">{g}</p>
              {NAV.filter((n) => n.group === g).map((n) => {
                const active = pathname.startsWith(n.href);
                const b = badge(n.href);
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-sm font-medium transition-colors",
                      active ? "bg-surface text-fg shadow-card ring-1 ring-border" : "text-fg-muted hover:bg-muted hover:text-fg",
                    )}
                  >
                    <n.icon className={cn("size-4", active ? "text-accent" : "text-fg-subtle group-hover:text-fg-muted")} aria-hidden />
                    <span className="flex-1">{n.label}</span>
                    {b != null && b !== 0 && <span className="font-mono text-[11px] tabular-nums text-fg-subtle">{b}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-3 px-1">
          <button onClick={() => setHelpOpen(true)} className="flex h-8 items-center gap-2 rounded-md px-1.5 text-xs text-fg-subtle hover:text-fg-muted">
            <Keyboard className="size-3.5" aria-hidden />
            <span className="flex-1 text-left">Keyboard shortcuts</span>
            <Kbd>?</Kbd>
          </button>
          <ThemeToggle />
          {user && !demo && (
            <div className="flex items-center gap-1 border-t border-border pt-3">
              <p className="min-w-0 flex-1 truncate px-1.5 text-xs text-fg-subtle" title={user}>
                {user}
              </p>
              <form action={signOutAction}>
                <button type="submit" className="flex h-7 items-center gap-1.5 rounded-md px-2 text-xs text-fg-muted hover:bg-muted hover:text-fg">
                  <LogOut className="size-3.5" aria-hidden />
                  Sign out
                </button>
              </form>
            </div>
          )}
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-bg/85 px-4 backdrop-blur md:hidden">
        <Logo />
        <div className="flex items-center gap-1">
          {demo && <span className="mr-1 rounded-md bg-warn-soft px-1.5 py-0.5 text-[11px] font-medium text-warn">Demo</span>}
          <RemindersBell items={reminders} />
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
        {NAV.filter((n) => (MOBILE_PRIMARY as readonly string[]).includes(n.href)).map((n) => {
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
        <Popover>
          <PopoverTrigger
            className={cn(
              "flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium outline-none",
              NAV.some((n) => !(MOBILE_PRIMARY as readonly string[]).includes(n.href) && pathname.startsWith(n.href)) ? "text-accent" : "text-fg-subtle",
            )}
          >
            <Ellipsis className="size-5" aria-hidden />
            More
          </PopoverTrigger>
          <PopoverContent side="top" className="w-52 p-1">
            {NAV.filter((n) => !(MOBILE_PRIMARY as readonly string[]).includes(n.href)).map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={cn("flex h-10 items-center gap-2.5 rounded-lg px-3 text-sm", pathname.startsWith(n.href) ? "bg-muted text-fg" : "text-fg-muted hover:bg-muted hover:text-fg")}
              >
                <n.icon className="size-4" aria-hidden />
                {n.label}
              </Link>
            ))}
            {user && !demo && (
              <form action={signOutAction} className="mt-1 border-t border-border pt-1">
                <p className="truncate px-3 pt-1.5 text-[11px] text-fg-subtle">{user}</p>
                <button type="submit" className="flex h-10 w-full items-center gap-2.5 rounded-lg px-3 text-sm text-fg-muted hover:bg-muted hover:text-fg">
                  <LogOut className="size-4" aria-hidden />
                  Sign out
                </button>
              </form>
            )}
          </PopoverContent>
        </Popover>
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
