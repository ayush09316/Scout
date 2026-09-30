import type { PreviewJob } from "./product-preview";

export function TelegramDigest({ jobs, live, count }: { jobs: PreviewJob[]; live: boolean; count: number }) {
  const top = [...jobs].sort((a, b) => b.fit - a.fit).slice(0, 2);
  return (
    <div className="lx-float mx-auto w-full max-w-[300px]" role="img" aria-label="Illustration of the Telegram digest: a header message followed by one message per job with thumbs up, thumbs down and Applied buttons">
      <div className="rounded-[42px] border border-border-strong bg-surface-2 p-2.5 shadow-[var(--lx-glow)]" aria-hidden>
        <div className="overflow-hidden rounded-[34px] border border-border bg-[linear-gradient(180deg,#dfe7f1,#cfdcea)] dark:bg-[linear-gradient(180deg,#0f1520,#0b1018)]">
          <div className="flex items-center justify-between px-6 pt-3 pb-1 font-mono text-[10px] font-semibold text-[#0b0b10] dark:text-white/80">
            <span>08:00</span>
            <span className="h-4 w-16 rounded-full bg-black/85 dark:bg-black" />
            <span>5G</span>
          </div>
          <div className="flex items-center gap-2.5 border-b border-black/5 bg-white/60 px-4 py-2.5 backdrop-blur dark:border-white/5 dark:bg-white/5">
            <span className="flex size-8 items-center justify-center rounded-full bg-[linear-gradient(135deg,#6366f1,#a855f7)] text-[12px] font-semibold text-white">S</span>
            <div className="leading-tight">
              <p className="text-[12.5px] font-semibold text-[#0b0b10] dark:text-white">Scout</p>
              <p className="text-[10px] text-[#5b6472] dark:text-white/50">bot</p>
            </div>
          </div>
          <div className="flex flex-col gap-2 px-3 py-3 text-[11.5px] leading-snug">
            <p className="max-w-[85%] self-start rounded-2xl rounded-bl-md bg-white px-3 py-2 text-[#0b0b10] shadow-sm dark:bg-[#1c2432] dark:text-white">
              Scout: {count} new matches today
            </p>
            {top.map((j, i) => (
              <div key={j.id} className="max-w-[94%] self-start">
                <div className="rounded-2xl rounded-bl-md bg-white px-3 py-2 text-[#0b0b10] shadow-sm dark:bg-[#1c2432] dark:text-white">
                  <p className="font-semibold">
                    {i + 1}. {j.title} <span className="font-normal text-[#5b6472] dark:text-white/60">— {j.company}</span>
                  </p>
                  <p className="mt-0.5 text-[10.5px] text-[#5b6472] dark:text-white/55">
                    {j.location ?? "n/a"} · fit {(j.fit * 10).toFixed(1)}/10
                  </p>
                  {j.reasons.slice(0, 2).map((r) => (
                    <p key={r} className="truncate text-[10.5px] text-[#3a4250] dark:text-white/70">
                      • {r}
                    </p>
                  ))}
                  <p className="mt-0.5 text-[10.5px] text-[#2b7de9]">Open posting</p>
                </div>
                <div className="mt-1 grid grid-cols-3 gap-1">
                  {["👍", "👎", "✅ Applied"].map((b) => (
                    <span key={b} className="flex h-7 items-center justify-center rounded-lg bg-black/25 text-[11px] font-medium text-white backdrop-blur dark:bg-white/10">
                      {b}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <p className="mt-4 text-center font-mono text-[10.5px] text-fg-subtle">{live ? "Format of the real digest, using this morning's top jobs" : "Format of the real digest, with sample jobs"}</p>
    </div>
  );
}
