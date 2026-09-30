export type Reason = { text: string; detail: string | null; key: string };

const SIM = /^embedding similarity\s+(-?\d+(?:\.\d+)?)$/i;

export function simLabel(v: number) {
  return v >= 0.75 ? "Strong profile match" : v >= 0.65 ? "Good profile match" : v >= 0.55 ? "Partial profile match" : "Weak profile match";
}

export function humanizeReason(r: string): Reason {
  const m = SIM.exec(r.trim());
  if (m) {
    const v = Number(m[1]);
    return { text: simLabel(v), detail: `Resume ↔ job embedding similarity ${v.toFixed(2)} (≥ 0.75 strong · ≥ 0.65 good)`, key: r };
  }
  const k = /^matches\s+(.+)$/i.exec(r.trim());
  if (k) return { text: `Matches ${k[1]}`, detail: null, key: r };
  return { text: r, detail: null, key: r };
}

export function humanizeReasons(rs: string[]): Reason[] {
  return rs.map(humanizeReason);
}
