import { Globe, MapPin } from "lucide-react";
import { Badge } from "./ui/badge";

export function LocationChips({ location, remote }: { location: string | null; remote: boolean }) {
  const loc = location?.replace(/^Remote\s*/i, "").replace(/[()]/g, "").trim();
  return (
    <>
      {remote && (
        <Badge tone="accent">
          <Globe aria-hidden />
          Remote{loc ? ` · ${loc}` : ""}
        </Badge>
      )}
      {!remote && location && (
        <Badge tone="neutral">
          <MapPin aria-hidden />
          {location}
        </Badge>
      )}
    </>
  );
}

export function SkillChips({ reasons, missing, maxReasons = 3, maxMissing = 3 }: { reasons: string[]; missing: string[]; maxReasons?: number; maxMissing?: number }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {reasons.slice(0, maxReasons).map((r) => (
        <span key={r} className="inline-flex max-w-full items-center gap-1.5 truncate rounded-md border border-border bg-surface-2 px-2 py-0.5 text-xs text-fg-muted">
          <span className="size-1.5 shrink-0 rounded-full bg-good" aria-hidden />
          <span className="truncate">{r}</span>
        </span>
      ))}
      {missing.slice(0, maxMissing).map((m) => (
        <span key={m} className="inline-flex items-center gap-1 rounded-md border border-dashed border-border-strong px-2 py-0.5 text-xs text-fg-subtle" title="Missing skill">
          <span className="sr-only">Missing: </span>
          {m}
        </span>
      ))}
    </div>
  );
}
