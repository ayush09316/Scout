import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonClass } from "@/components/ui/button";
import { BrandLink } from "./brand";

const LINKS = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#built-with", label: "Built with" },
];

export function LandingNav({ canOpen, signedIn }: { canOpen: boolean; signedIn: boolean }) {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-bg/75 backdrop-blur-xl supports-[backdrop-filter]:bg-bg/60">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <BrandLink />
        <nav aria-label="Sections" className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="rounded-md px-3 py-1.5 text-sm text-fg-muted transition-colors hover:text-fg">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-1.5">
          <ThemeToggle compact />
          {canOpen ? (
            <>
              {!signedIn && (
                <Link href="/signin" className="hidden rounded-md px-3 py-1.5 text-sm text-fg-muted hover:text-fg sm:inline-flex">
                  Sign in
                </Link>
              )}
              <Link href="/today" className={buttonClass("primary", "sm")}>
                Open dashboard
                <ArrowRight aria-hidden />
              </Link>
            </>
          ) : (
            <Link href="/signin" className={buttonClass("primary", "sm")}>
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
