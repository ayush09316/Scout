"use client";

import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useTheme } from "next-themes";
import { Keyboard, LoaderCircle, Moon, Search, Sun } from "lucide-react";
import * as D from "@radix-ui/react-dialog";
import { NAV } from "./nav-items";
import { useUI } from "./ui-context";
import { Kbd } from "./ui/kbd";
import { CompanyLogo } from "./company-logo";
import { searchAction } from "@/lib/actions";
import type { JobListItem } from "@/lib/queries";
import { pct } from "@/lib/utils";

const itemCls =
  "flex h-10 cursor-pointer items-center gap-3 rounded-lg px-3 text-sm text-fg-muted data-[selected=true]:bg-muted data-[selected=true]:text-fg [&_svg]:size-4 [&_svg]:text-fg-subtle";

export function CommandPalette() {
  const { paletteOpen: open, setPaletteOpen: setOpen, setHelpOpen } = useUI();
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<JobListItem[]>([]);
  const [pending, start] = useTransition();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => start(async () => setResults(await searchAction(q))), 160);
    return () => clearTimeout(t);
  }, [q]);

  const run = (fn: () => void) => {
    setOpen(false);
    setQ("");
    fn();
  };

  return (
    <D.Root open={open} onOpenChange={setOpen}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />
        <D.Content className="fixed top-[12vh] left-1/2 z-50 w-[calc(100vw-32px)] max-w-xl -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-surface shadow-pop outline-none">
          <D.Title className="sr-only">Command palette</D.Title>
          <D.Description className="sr-only">Search jobs or jump to a page</D.Description>
          <Command shouldFilter={false} loop label="Command palette">
            <div className="flex items-center gap-2 border-b border-border px-4">
              {pending ? <LoaderCircle className="size-4 animate-spin text-fg-subtle" /> : <Search className="size-4 text-fg-subtle" />}
              <Command.Input
                value={q}
                onValueChange={setQ}
                placeholder="Search jobs, companies, or type a command…"
                className="h-12 flex-1 bg-transparent text-sm text-fg outline-none focus-visible:outline-none placeholder:text-fg-subtle"
              />
              <Kbd>esc</Kbd>
            </div>
            <Command.List className="max-h-[min(60vh,420px)] overflow-y-auto p-2">
              <Command.Empty className="px-3 py-8 text-center text-sm text-fg-subtle">No jobs match “{q}”.</Command.Empty>
              {results.length > 0 && (
                <Command.Group heading="Jobs" className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-fg-subtle">
                  {results.map((j) => (
                    <Command.Item key={j.id} value={`job-${j.id}`} onSelect={() => run(() => router.push(`/job/${j.id}`))} className={itemCls + " h-12"}>
                      <CompanyLogo name={j.companyName} domain={j.companyDomain} size={28} />
                      <div className="min-w-0 flex-1">
                        <div className="truncate font-medium text-fg">{j.title}</div>
                        <div className="truncate text-xs text-fg-subtle">
                          {j.companyName} · {j.location ?? "—"}
                        </div>
                      </div>
                      <span className="font-mono text-xs tabular-nums text-fg-subtle">{pct(j.fitProb)}</span>
                    </Command.Item>
                  ))}
                </Command.Group>
              )}
              {q.trim().length < 2 && (
                <>
                  <Command.Group heading="Go to" className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-fg-subtle">
                    {NAV.map((n) => (
                      <Command.Item key={n.href} value={n.href} onSelect={() => run(() => router.push(n.href))} className={itemCls}>
                        <n.icon />
                        <span className="flex-1">{n.label}</span>
                        <span className="flex gap-1">
                          <Kbd>G</Kbd>
                          <Kbd>{n.key.toUpperCase()}</Kbd>
                        </span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                  <Command.Group heading="Actions" className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-fg-subtle">
                    <Command.Item value="theme" onSelect={() => run(() => setTheme(resolvedTheme === "dark" ? "light" : "dark"))} className={itemCls}>
                      {resolvedTheme === "dark" ? <Sun /> : <Moon />}
                      <span className="flex-1">Toggle theme</span>
                    </Command.Item>
                    <Command.Item value="help" onSelect={() => run(() => setHelpOpen(true))} className={itemCls}>
                      <Keyboard />
                      <span className="flex-1">Keyboard shortcuts</span>
                      <Kbd>?</Kbd>
                    </Command.Item>
                  </Command.Group>
                </>
              )}
            </Command.List>
          </Command>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
