import { Fragment } from "react";
import { Globe, MapPin } from "lucide-react";
import { Badge } from "./ui/badge";
import { ReasonChip } from "./reason-chip";
import { humanizeReasons } from "@/lib/reasons";

export function LocationChips({ location, remote }: { location: string | null; remote: boolean }) {
  const loc = location?.replace(/^Remote\s*/i, "").replace(/[()]/g, "").replace(/^[\s,;·-]+|[\s,;·-]+$/g, "").trim();
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

export function SkillChips({ reasons, missing, maxReasons = 3, maxMissing = 3, cap, inline }: { reasons: string[]; missing: string[]; maxReasons?: number; maxMissing?: number; cap?: number; inline?: boolean }) {
  const rs = humanizeReasons(reasons).slice(0, maxReasons);
  const ms = missing.slice(0, maxMissing);
  const total = reasons.length + missing.length;
  const limit = cap ?? rs.length + ms.length;
  const shownR = rs.slice(0, limit);
  const shownM = ms.slice(0, Math.max(0, limit - shownR.length));
  const rest = total - shownR.length - shownM.length;
  const Wrap = inline ? Fragment : "div";
  return (
    <Wrap {...(inline ? {} : { className: "flex flex-wrap gap-1.5" })}>
      {shownR.map((r) => (
        <ReasonChip key={r.key} reason={r} />
      ))}
      {shownM.map((m) => (
        <span key={m} className="inline-flex items-center gap-1 rounded-md border border-dashed border-border-strong px-2 py-0.5 text-xs text-fg-subtle" title="Missing skill">
          <span className="sr-only">Missing: </span>
          {m}
        </span>
      ))}
      {cap != null && rest > 0 && <span className="inline-flex items-center rounded-md px-1 py-0.5 font-mono text-[11px] text-fg-subtle tabular-nums" title={[...reasons.map((r) => humanizeReasons([r])[0].text), ...missing.map((m) => `missing ${m}`)].join(" · ")}>+{rest}</span>}
    </Wrap>
  );
}
