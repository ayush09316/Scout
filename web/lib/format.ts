export type Salary = {
  kind: "actual" | "estimate";
  low: number;
  high: number | null;
  currency: string;
  confidence?: number;
  n?: number;
  basis?: Record<string, unknown>;
  model?: string;
};

export function companyKey(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const lakh = (n: number) => {
  const v = n / 100000;
  return v >= 10 ? String(Math.round(v)) : String(Math.round(v * 10) / 10);
};

export function lpa(n: number | null | undefined) {
  if (n == null) return "—";
  return `₹${lakh(n)} LPA`;
}

export const FX_TO_INR: Record<string, number> = { INR: 1, USD: 84, EUR: 91, GBP: 107, AUD: 55, CAD: 61, SGD: 63, JPY: 0.56, AED: 23 };

export const fxSqlCase = (col: string) =>
  `(CASE COALESCE(${col}, 'INR') ${Object.entries(FX_TO_INR)
    .map(([c, r]) => `WHEN '${c}' THEN ${r}`)
    .join(" ")} END)`;

export function toInr(n: number, currency: string) {
  const r = FX_TO_INR[currency || "INR"];
  return r == null ? null : n * r;
}

function fmtForeign(n: number, cur: string) {
  const sym: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", AUD: "A$", CAD: "C$", SGD: "S$", JPY: "¥" };
  if (cur === "JPY") return `¥${Math.round(n / 10000) / 100}M`;
  return `${sym[cur] ?? cur + " "}${Math.round(n / 1000)}k`;
}

export function salaryLabel(s: Salary) {
  const lowInr = toInr(s.low, s.currency);
  const highInr = s.high == null ? null : toInr(s.high, s.currency);
  if (lowInr == null) return `${fmtForeign(s.low, s.currency)}${s.high ? `–${fmtForeign(s.high, s.currency)}` : "+"}${s.kind === "estimate" ? " est." : ""}`;
  const approx = s.currency !== "INR" ? "≈" : "";
  const range = highInr && Math.round(highInr / 1e5) !== Math.round(lowInr / 1e5) ? `${approx}₹${lakh(lowInr)}–${lakh(highInr)} LPA` : `${approx}₹${lakh(lowInr)}${highInr ? "" : "+"} LPA`;
  return s.kind === "estimate" ? `${range} est.` : range;
}

export function salaryOriginal(s: Salary) {
  if (s.currency === "INR") return null;
  return `${fmtForeign(s.low, s.currency)}${s.high ? `–${fmtForeign(s.high, s.currency)}` : "+"} ${s.currency}${FX_TO_INR[s.currency] ? ` · converted at ₹${FX_TO_INR[s.currency]}/${s.currency}` : ""}`;
}

export function salaryBasisText(s: Salary) {
  if (s.kind === "actual") return "Listed on the posting";
  const b = (s.basis ?? {}) as Record<string, unknown>;
  const group = (b.group ?? {}) as Record<string, unknown>;
  const g = ["family", "seniority", "city", "market"].map((k) => group[k]).filter((v): v is string => typeof v === "string" && v !== "other");
  if (s.model?.startsWith("prior")) return `Market prior for ${g.join(" · ") || "similar roles"} — no direct comparables`;
  const p25 = typeof b.p25 === "number" ? b.p25 : null;
  const p75 = typeof b.p75 === "number" ? b.p75 : null;
  const iqr = p25 != null && p75 != null ? ` · IQR ${lakh(p25)}–${lakh(p75)} LPA` : "";
  return `Comparables grouped by ${g.join(" · ") || "market"}${iqr}`;
}

export function salaryTop(s: Salary | null | undefined) {
  if (!s) return null;
  return toInr(s.high ?? s.low, s.currency);
}
