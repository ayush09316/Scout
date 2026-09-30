import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandLink } from "./brand";

const LINKS = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#honest", label: "Evals" },
  { href: "#faq", label: "FAQ" },
];

export function LandingNav({ canOpen, signedIn }: { canOpen: boolean; signedIn: boolean }) {
  return (
    <header data-lx-nav data-scrolled="false" className="lx-nav sticky top-0 z-40">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-6">
        <BrandLink />
        <nav aria-label="Sections" className="hidden items-center gap-0.5 md:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="rounded-full px-3.5 py-2 text-[13.5px] text-fg-muted transition-colors hover:bg-muted hover:text-fg">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-1.5">
          <ThemeToggle compact />
          {canOpen && !signedIn && (
            <Link href="/signin" className="hidden min-h-11 items-center rounded-full px-3 text-[13.5px] text-fg-muted hover:text-fg sm:inline-flex">
              Sign in
            </Link>
          )}
          <Link href={canOpen ? "/today" : "/signin"} className="lx-btn inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-[13.5px] font-medium">
            <span className="shine" aria-hidden />
            <span>{canOpen ? "Open dashboard" : "Sign in"}</span>
            {canOpen && <ArrowRight className="size-3.5" aria-hidden />}
          </Link>
        </div>
      </div>
    </header>
  );
}
