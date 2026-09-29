import { cn } from "@/lib/utils";

export function scoreTone(p: number | null) {
  if (p == null) return "text-fg-subtle";
  if (p >= 0.7) return "text-good";
  if (p >= 0.4) return "text-warn";
  return "text-fg-subtle";
}

export function ScoreRing({ value, size = 48, stroke = 4, label = true, className }: { value: number | null; size?: number; stroke?: number; label?: boolean; className?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value ?? 0));
  const shown = value == null ? "—" : Math.round(v * 100);
  return (
    <div
      className={cn("relative inline-flex shrink-0 items-center justify-center", scoreTone(value), className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={value == null ? "Not scored" : `${shown}% fit`}
    >
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--muted)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
        />
      </svg>
      {label && (
        <span className="absolute inset-0 flex items-center justify-center font-mono text-[13px] font-semibold tabular-nums text-fg" style={{ fontSize: size * 0.28 }}>
          {shown}
        </span>
      )}
    </div>
  );
}
