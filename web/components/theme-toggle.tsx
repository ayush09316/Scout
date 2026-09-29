"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const opts = [
  { v: "light", icon: Sun, label: "Light" },
  { v: "dark", icon: Moon, label: "Dark" },
  { v: "system", icon: Monitor, label: "System" },
] as const;

export function ThemeToggle({ compact }: { compact?: boolean }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (compact) {
    const next = mounted && resolvedTheme === "dark" ? "light" : "dark";
    return (
      <button
        onClick={() => setTheme(next)}
        aria-label="Toggle theme"
        className="inline-flex size-9 items-center justify-center rounded-lg text-fg-muted hover:bg-muted hover:text-fg"
      >
        {mounted && resolvedTheme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
      </button>
    );
  }
  return (
    <div role="radiogroup" aria-label="Theme" className="flex h-8 items-center rounded-lg border border-border bg-surface-2 p-0.5">
      {opts.map(({ v, icon: Icon, label }) => {
        const active = mounted && theme === v;
        return (
          <button
            key={v}
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={() => setTheme(v)}
            className={cn("flex h-full flex-1 items-center justify-center rounded-md px-2 text-fg-subtle transition-colors", active ? "bg-surface text-fg shadow-card" : "hover:text-fg")}
          >
            <Icon className="size-3.5" />
          </button>
        );
      })}
    </div>
  );
}
