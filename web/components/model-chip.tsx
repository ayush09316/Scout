import { Cpu, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export function ModelChip({ model, className }: { model: string; className?: string }) {
  const llm = model.startsWith("gemini");
  const label = llm ? model : model === "rules" ? "Rules router · no LLM" : model === "template" || model === "deterministic" ? "Deterministic fallback · no LLM" : model;
  return (
    <span
      data-testid="model-chip"
      className={cn(
        "inline-flex h-5 items-center gap-1 rounded px-1.5 font-mono text-[11px] font-medium whitespace-nowrap",
        llm ? "bg-accent-soft text-accent-soft-fg" : "bg-muted text-fg-muted",
        className,
      )}
    >
      {llm ? <Sparkles className="size-3" aria-hidden /> : <Cpu className="size-3" aria-hidden />}
      {label}
    </span>
  );
}
