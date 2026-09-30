import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Base = { page: number; pageSize: number; total: number; label?: string; className?: string; noun?: string };
type LinkProps = Base & { basePath: string; searchParams?: Record<string, string | string[] | undefined>; onChange?: never };
type ClientProps = Base & { onChange: (page: number) => void; basePath?: never; searchParams?: never };

export function pageCount(total: number, pageSize: number) {
  return Math.max(1, Math.ceil(total / Math.max(1, pageSize)));
}

export function clampPage(raw: unknown, total: number, pageSize: number) {
  const n = Math.floor(Number(Array.isArray(raw) ? raw[0] : raw));
  const p = Number.isFinite(n) && n >= 1 ? n : 1;
  return Math.min(p, pageCount(total, pageSize));
}

export function pageItems(page: number, pages: number): (number | "gap")[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const set = new Set([1, pages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= pages));
  if (page <= 3) [2, 3, 4].forEach((p) => set.add(p));
  if (page >= pages - 2) [pages - 3, pages - 2, pages - 1].forEach((p) => set.add(p));
  const sorted = [...set].sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  sorted.forEach((p, i) => {
    if (i && p - sorted[i - 1] > 1) out.push("gap");
    out.push(p);
  });
  return out;
}

const fmt = (n: number) => n.toLocaleString("en-IN");

const itemCls = (current: boolean, disabled?: boolean) =>
  cn(
    "inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 font-mono text-[13px] tabular-nums transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/40 pointer-coarse:h-11 pointer-coarse:min-w-11 [&_svg]:size-4",
    current ? "bg-accent-soft font-semibold text-accent-soft-fg" : "text-fg-muted hover:bg-muted hover:text-fg",
    disabled && "pointer-events-none opacity-40",
  );

function hrefFor(basePath: string, sp: LinkProps["searchParams"], page: number) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(sp ?? {})) {
    if (k === "page" || v == null) continue;
    (Array.isArray(v) ? v : [v]).forEach((x) => p.append(k, x));
  }
  if (page > 1) p.set("page", String(page));
  const qs = p.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

export function Pagination(props: LinkProps | ClientProps) {
  const { page, pageSize, total, label = "Pagination", className, noun } = props;
  const pages = pageCount(total, pageSize);
  const cur = Math.min(Math.max(1, page), pages);
  const from = total === 0 ? 0 : (cur - 1) * pageSize + 1;
  const to = Math.min(total, cur * pageSize);

  const item = (target: number, content: React.ReactNode, opts: { current?: boolean; disabled?: boolean; aria?: string; rel?: string } = {}) => {
    const cls = itemCls(!!opts.current, opts.disabled);
    if (opts.disabled) return <span className={cls} aria-hidden>{content}</span>;
    if (props.onChange)
      return (
        <button type="button" className={cls} onClick={() => props.onChange!(target)} aria-current={opts.current ? "page" : undefined} aria-label={opts.aria}>
          {content}
        </button>
      );
    return (
      <Link href={hrefFor(props.basePath!, props.searchParams, target)} rel={opts.rel} className={cls} aria-current={opts.current ? "page" : undefined} aria-label={opts.aria}>
        {content}
      </Link>
    );
  };

  return (
    <nav aria-label={label} data-testid="pagination" className={cn("flex flex-col items-center gap-2 text-xs text-fg-muted sm:flex-row sm:justify-between", className)}>
      <p data-testid="pagination-status" aria-live="polite">
        Showing <span className="font-mono tabular-nums text-fg">{fmt(from)}–{fmt(to)}</span> of <span className="font-mono tabular-nums text-fg">{fmt(total)}</span>
        {noun ? ` ${noun}` : ""}
      </p>
      {pages > 1 && (
        <ul className="flex items-center gap-0.5">
          <li>{item(cur - 1, <><ChevronLeft aria-hidden /><span className="sr-only sm:not-sr-only sm:ml-0.5 sm:font-sans">Prev</span></>, { disabled: cur === 1, aria: "Previous page", rel: "prev" })}</li>
          {pageItems(cur, pages).map((p, i) =>
            p === "gap" ? (
              <li key={`g${i}`} aria-hidden className="inline-flex h-8 min-w-6 items-center justify-center text-fg-subtle pointer-coarse:h-11">
                …
              </li>
            ) : (
              <li key={p} className={cn(Math.abs(p - cur) > 1 && p !== 1 && p !== pages && "hidden sm:block")}>
                {item(p, p, { current: p === cur, aria: `Page ${p}` })}
              </li>
            ),
          )}
          <li>{item(cur + 1, <><span className="sr-only sm:not-sr-only sm:mr-0.5 sm:font-sans">Next</span><ChevronRight aria-hidden /></>, { disabled: cur === pages, aria: "Next page", rel: "next" })}</li>
        </ul>
      )}
    </nav>
  );
}
