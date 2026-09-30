"use client";

import { useEffect, useState } from "react";
import { reducedMotion, useInView } from "./motion";

const fmt = (n: number) => new Intl.NumberFormat("en-IN").format(n);

export function RunTerminal({ runId, rows }: { runId: number | null; rows: [string, number][] }) {
  const lines = [`$ scout run`, `Run ${runId ?? "—"} — ok`, ...rows.map(([k, v]) => `${k.padEnd(22, " ")}${k === "duration_s" ? `${fmt(Math.round(v))}s` : fmt(v)}`)];
  const first = lines[0].length;
  const total = lines.reduce((a, l) => a + l.length, 0);
  const [ref, inView] = useInView<HTMLDivElement>();
  const [chars, setChars] = useState(total);
  useEffect(() => {
    if (!inView || reducedMotion()) return;
    setChars(0);
    let c = 0;
    const id = setInterval(() => {
      c += c < first ? 1 : 6;
      setChars(Math.min(c, total));
      if (c >= total) clearInterval(id);
    }, 28);
    return () => clearInterval(id);
  }, [inView, total, first]);

  let left = chars;
  const done = chars >= total;
  return (
    <div ref={ref} className="overflow-hidden rounded-2xl border border-white/10 bg-[#0b0b10] shadow-pop" role="img" aria-label={`Terminal output of the most recent scout run: ${rows.map(([k, v]) => `${k} ${v}`).join(", ")}`}>
      <div className="flex h-9 items-center gap-1.5 border-b border-white/10 px-3" aria-hidden>
        <span className="size-2.5 rounded-full bg-white/15" />
        <span className="size-2.5 rounded-full bg-white/15" />
        <span className="size-2.5 rounded-full bg-white/15" />
        <span className="ml-auto font-mono text-[10px] text-white/40">pipeline · GitHub Actions</span>
      </div>
      <pre aria-hidden style={{ minHeight: lines.length * 22 + 54 }} className="overflow-x-auto px-4 py-4 font-mono text-[12px] leading-[1.75] text-white/70 sm:text-[12.5px]">
        {lines.map((l, i) => {
          const take = Math.max(0, Math.min(l.length, left));
          left -= l.length;
          if (take === 0 && !(i === 0)) return null;
          const t = l.slice(0, take);
          const last = left <= 0 && !done;
          return (
            <div key={i} className={i === 0 ? "text-white" : i === 1 ? "text-[#a5b4fc]" : undefined}>
              {i === 0 ? (
                <>
                  <span className="text-[#34d399]">{t.slice(0, 1)}</span>
                  {t.slice(1)}
                </>
              ) : (
                <>
                  <span className="text-white/45">{t.slice(0, 22)}</span>
                  <span className="text-white">{t.slice(22)}</span>
                </>
              )}
              {last && <span className="lx-caret text-white/70" />}
            </div>
          );
        })}
        {done && <div className="lx-caret text-[#34d399]">$</div>}
      </pre>
    </div>
  );
}
