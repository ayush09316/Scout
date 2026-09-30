import { cn } from "@/lib/utils";

export function scorerName(model: string | null) {
  if (!model) return null;
  const m = model.toLowerCase();
  if (m.startsWith("heuristic")) return "heuristic";
  if (m.includes("jev")) return "jev";
  if (m.startsWith("gemini")) return "gemini";
  return m.split(/[-:/]/)[0];
}

export function ScorerChip({ model, className }: { model: string | null; className?: string }) {
  const name = scorerName(model);
  if (!name) return null;
  const llm = name === "gemini" || name === "jev";
  return (
    <span
      data-testid="scorer-chip"
      title={model ?? undefined}
      className={cn("inline-flex h-5 items-center rounded px-1.5 font-mono text-[10.5px] font-medium whitespace-nowrap", llm ? "bg-accent-soft text-accent-soft-fg" : "bg-muted text-fg-muted", className)}
    >
      {name}
    </span>
  );
}
