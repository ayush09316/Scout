"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { NAV } from "./nav-items";
import { cn } from "@/lib/utils";

type Crumb = { label: string; href?: string };

const today = NAV.find((n) => n.href === "/today")!;
const DETAIL: Record<string, string> = { job: "Job", company: "Company" };

function trail(pathname: string, current?: string): Crumb[] {
  const root = pathname.split("/").filter(Boolean)[0] ?? "";
  if (DETAIL[root]) return [{ label: today.group }, { label: today.label, href: today.href }, { label: current || DETAIL[root] }];
  const n = NAV.find((x) => pathname === x.href || pathname.startsWith(`${x.href}/`));
  if (!n) return current ? [{ label: current }] : [];
  const extra = current && current !== n.label ? current : null;
  return [{ label: n.group }, { label: n.label, href: extra ? n.href : undefined }, ...(extra ? [{ label: extra }] : [])];
}

export function Breadcrumbs({ current, className }: { current?: string; className?: string }) {
  const crumbs = trail(usePathname() ?? "", current);
  if (!crumbs.length) return null;
  return (
    <nav aria-label="Breadcrumb" className={cn("min-w-0", className)}>
      <ol className="flex min-w-0 items-center gap-1 text-xs leading-5 text-fg-subtle">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li key={`${c.label}-${i}`} className={cn("flex items-center gap-1", last ? "min-w-0" : "shrink-0")}>
              {c.href && !last ? (
                <Link href={c.href} className="rounded-sm text-fg-muted transition-colors hover:text-fg">
                  {c.label}
                </Link>
              ) : (
                <span aria-current={last ? "page" : undefined} className={cn(last && "truncate font-medium text-fg-muted")} title={last ? c.label : undefined}>
                  {c.label}
                </span>
              )}
              {!last && <ChevronRight className="size-3 shrink-0 text-fg-subtle/70" aria-hidden />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
