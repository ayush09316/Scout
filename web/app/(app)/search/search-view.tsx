"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { LoaderCircle, ScanSearch, Search, X } from "lucide-react";
import { PageHeader } from "@/components/app-shell";
import { JobListRow } from "@/components/job-list-row";
import { jobBulk, SelectionToolbar, useSelection } from "@/components/selection";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty";
import { Kbd } from "@/components/ui/kbd";
import { Pagination } from "@/components/ui/pagination";
import { useHotkeys } from "@/lib/hotkeys";
import type { SearchFilters, SearchResult } from "@/lib/search";
import { useJobActions } from "@/lib/use-job-actions";
import { CITIES, MIN_SALARY_OPTIONS } from "@/lib/places";
import { cn } from "@/lib/utils";

const EXAMPLES = ["backend python django payments", "LLM evals engineer remote india", "platform kubernetes terraform bengaluru", "early stage startup full stack typescript"];

function Headline({ text }: { text: string }) {
  const parts = text.split(/(<<[^>]*>>)/g);
  return (
    <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-fg-muted">
      {parts.map((p, i) =>
        p.startsWith("<<") ? (
          <mark key={i} className="rounded-sm bg-accent-soft px-0.5 text-accent-soft-fg">
            {p.slice(2, -2)}
          </mark>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </p>
  );
}

export function SearchView({ q, filters, result, facets, pageSize, params }: { q: string; filters: SearchFilters; result: SearchResult | null; facets: { seniority: string[]; sources: string[] }; pageSize: number; params: Record<string, string> }) {
  const router = useRouter();
  const pathname = usePathname();
  const [text, setText] = useState(q);
  const [pending, start] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setText(q), [q]);

  const push = (next: { q?: string } & Partial<SearchFilters>) => {
    const merged = { q: text, ...filters, ...next };
    const p = new URLSearchParams();
    if (merged.q?.trim()) p.set("q", merged.q.trim());
    if (merged.remote && merged.remote !== "any") p.set("remote", merged.remote);
    if (merged.location) p.set("location", merged.location);
    if (merged.seniority) p.set("seniority", merged.seniority);
    if (merged.source) p.set("source", merged.source);
    if (merged.minScore) p.set("fit", String(merged.minScore));
    if (merged.minSalaryLpa) p.set("salary", String(merged.minSalaryLpa));
    if (merged.anywhere) p.set("anywhere", "1");
    start(() => router.push(`${pathname}?${p.toString()}`, { scroll: false }));
  };

  const active = (filters.remote !== "any" ? 1 : 0) + [filters.location, filters.seniority, filters.source, filters.minScore, filters.minSalaryLpa].filter(Boolean).length;
  const hits = result?.hits ?? [];
  const total = result?.total ?? 0;
  const page = result ? Math.floor(result.offset / pageSize) + 1 : 1;
  const acts = useJobActions();
  const pick = useSelection(hits.map((h) => h.id));
  const pickedJobs = hits.filter((h) => pick.has(h.id));
  const bulk = jobBulk(acts, pickedJobs, pick.clear);

  useHotkeys(pick.active ? { Escape: pick.clear } : {});

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 md:px-8 md:py-8">
      <PageHeader title="Search" description="Hybrid search: keyword matching fused with semantic similarity over every open job." />

      <form
        className="mt-5"
        onSubmit={(e) => {
          e.preventDefault();
          push({ q: text });
        }}
      >
        <div className="flex h-14 items-center gap-3 rounded-xl border border-border bg-surface px-4 shadow-card transition-colors focus-within:border-accent/60 focus-within:ring-2 focus-within:ring-accent/15">
          {pending ? <LoaderCircle className="size-5 shrink-0 animate-spin text-fg-subtle" /> : <Search className="size-5 shrink-0 text-fg-subtle" />}
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Describe the role you want — “backend payments in Bengaluru, Django or Go”"
            aria-label="Search query"
            className="h-full min-w-0 flex-1 bg-transparent text-base text-fg outline-none placeholder:text-fg-subtle focus-visible:outline-none"
            autoFocus
          />
          {text && (
            <button type="button" onClick={() => (setText(""), inputRef.current?.focus())} aria-label="Clear" className="rounded-md p-1 text-fg-subtle hover:bg-muted hover:text-fg">
              <X className="size-4" />
            </button>
          )}
          <Kbd className="hidden sm:inline-flex">↵</Kbd>
        </div>
      </form>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div role="radiogroup" aria-label="Remote" className="flex h-8 items-center rounded-lg border border-border bg-surface p-0.5 shadow-card">
          {(["any", "remote", "onsite"] as const).map((v) => (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={filters.remote === v}
              onClick={() => push({ remote: v })}
              className={cn("h-full rounded-md px-2.5 text-[13px]", filters.remote === v ? "bg-muted font-medium text-fg" : "text-fg-muted hover:text-fg")}
            >
              {v === "any" ? "Any" : v === "remote" ? "Remote" : "On-site"}
            </button>
          ))}
        </div>
        <Select ariaLabel="Location" value={filters.location ?? ""} onChange={(v) => push({ location: v })} options={[{ value: "", label: "All locations" }, ...CITIES.map((c) => ({ value: c, label: c })), { value: "Remote · India", label: "Remote" }]} />
        <Select ariaLabel="Seniority" value={filters.seniority ?? ""} onChange={(v) => push({ seniority: v })} options={[{ value: "", label: "Any seniority" }, ...facets.seniority.map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }))]} />
        <Select ariaLabel="Minimum fit" value={String(filters.minScore ?? 0)} onChange={(v) => push({ minScore: Number(v) })} options={[0, 50, 60, 70, 80, 90].map((v) => ({ value: String(v), label: v === 0 ? "Any fit" : `≥ ${v}% fit` }))} />
        <Select ariaLabel="Min salary" value={String(filters.minSalaryLpa ?? 0)} onChange={(v) => push({ minSalaryLpa: Number(v) })} options={MIN_SALARY_OPTIONS} />
        <Select ariaLabel="Source" value={filters.source ?? ""} onChange={(v) => push({ source: v })} options={[{ value: "", label: "All sources" }, ...facets.sources.map((s) => ({ value: s, label: s[0].toUpperCase() + s.slice(1) }))]} />
        <button
          type="button"
          role="switch"
          aria-checked={!filters.anywhere}
          onClick={() => push({ anywhere: !filters.anywhere })}
          className={cn(
            "inline-flex h-8 items-center gap-2 rounded-lg border px-3 text-[13px] shadow-card transition-colors",
            filters.anywhere ? "border-border bg-surface text-fg-muted hover:text-fg" : "border-accent/40 bg-accent-soft text-accent-soft-fg",
          )}
        >
          <span className={cn("size-1.5 rounded-full", filters.anywhere ? "bg-fg-subtle" : "bg-accent")} />
          {filters.anywhere ? "Anywhere" : "Workable from India"}
        </button>
        {active > 0 && (
          <Button size="sm" variant="ghost" onClick={() => push({ remote: "any", location: "", seniority: "", source: "", minScore: 0, minSalaryLpa: 0 })}>
            <X />
            Clear
          </Button>
        )}
      </div>

      {!q ? (
        <div className="mt-8">
          <p className="mb-2 text-xs font-medium text-fg-subtle">Try</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLES.map((e) => (
              <button
                key={e}
                onClick={() => (setText(e), push({ q: e }))}
                className="rounded-lg border border-border bg-surface px-3 py-1.5 text-[13px] text-fg-muted shadow-card hover:border-border-strong hover:text-fg"
              >
                {e}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div className="mt-5 flex items-center justify-between gap-3 text-xs text-fg-subtle" data-testid="search-meta">
            <span>
              {total.toLocaleString("en-IN")} result{total === 1 ? "" : "s"}
              {total > pageSize ? ` · page ${page} of ${Math.ceil(total / pageSize)}` : ""}
              {result ? ` · ${result.ms}ms` : ""}
            </span>
            {result?.mode === "keyword" ? (
              <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-fg-muted" title="The embedding model couldn't load — showing full-text matches only" data-testid="keyword-only">
                keyword only
              </span>
            ) : (
              <span className="text-[11px]">keyword + semantic · RRF k=60</span>
            )}
          </div>
          {hits.length === 0 ? (
            <div className="mt-3">
              <EmptyState icon={ScanSearch} title="No matches" description="Try fewer words, a different phrasing, or loosen the filters." />
            </div>
          ) : (
            <ul
              className={cn("mt-3 space-y-2 transition-opacity", pending && "opacity-60")}
              aria-label="Search results"
              data-testid="search-results"
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === "a" && (e.target as HTMLElement).closest("[role=menu]") == null) {
                  e.preventDefault();
                  pick.selectAll();
                }
              }}
            >
              {hits.map((h) => (
                <JobListRow
                  key={h.id}
                  job={h}
                  picked={pick.has(h.id)}
                  picking={pick.active}
                  onPick={(range) => pick.toggle(h.id, range)}
                  extra={
                    <>
                      {h.headline && <Headline text={h.headline} />}
                      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]" data-testid="match-why">
                        {h.ftsRank != null && <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-fg-muted tabular-nums">keyword #{h.ftsRank}</span>}
                        {h.similarity != null && (
                          <span className={cn("rounded px-1.5 py-0.5 font-mono tabular-nums", h.vecRank != null ? "bg-accent-soft text-accent-soft-fg" : "bg-muted text-fg-muted")}>
                            {Math.round(h.similarity * 100)}% similar{h.vecRank != null ? ` · #${h.vecRank}` : ""}
                          </span>
                        )}
                      </div>
                    </>
                  }
                />
              ))}
            </ul>
          )}
          <SelectionToolbar
            count={pickedJobs.length}
            total={hits.length}
            onSelectAll={pick.selectAll}
            onClear={pick.clear}
            actions={bulk.actions}
          />
          {total > pageSize && <Pagination className="mt-5" page={page} pageSize={pageSize} total={total} basePath={pathname} searchParams={params} label="Search result pages" noun="results" />}
        </>
      )}
    </div>
  );
}
