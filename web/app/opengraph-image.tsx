import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getLandingStats } from "@/lib/landing";

export const alt = "Scout — your job hunt, ranked before breakfast";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 3600;

async function serif(): Promise<ArrayBuffer | null> {
  try {
    const css = await fetch("https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@1&display=swap", { signal: AbortSignal.timeout(3000) }).then((r) => r.text());
    const url = /src:\s*url\(([^)]+)\)\s*format\('(?:truetype|opentype|woff)'\)/.exec(css)?.[1];
    if (!url) return null;
    return await fetch(url, { signal: AbortSignal.timeout(3000) }).then((r) => r.arrayBuffer());
  } catch {
    return null;
  }
}

async function sans(weight: "Regular" | "SemiBold"): Promise<ArrayBuffer | null> {
  try {
    const b = await readFile(join(process.cwd(), "node_modules/geist/dist/fonts/geist-sans", `Geist-${weight}.ttf`));
    return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
  } catch {
    return null;
  }
}

const ROWS = [
  { w: 300, tone: "#34d399" },
  { w: 250, tone: "#34d399" },
  { w: 210, tone: "#fbbf24" },
];

export default async function OpengraphImage() {
  const [font, regular, semibold, stats] = await Promise.all([serif(), sans("Regular"), sans("SemiBold"), getLandingStats().catch(() => null)]);
  const open = stats?.openJobs ?? null;
  const serifFamily = font ? "Instrument Serif" : "Georgia, serif";
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", background: "#07070a", color: "#f4f4f6", fontFamily: "Geist, sans-serif", overflow: "hidden" }}>
        <div style={{ position: "absolute", left: -120, top: -220, width: 760, height: 620, borderRadius: 9999, background: "radial-gradient(circle, rgba(99,102,241,0.55) 0%, rgba(99,102,241,0) 70%)", display: "flex" }} />
        <div style={{ position: "absolute", right: -140, top: -160, width: 700, height: 600, borderRadius: 9999, background: "radial-gradient(circle, rgba(168,85,247,0.42) 0%, rgba(168,85,247,0) 70%)", display: "flex" }} />
        <div style={{ position: "absolute", left: 420, top: 300, width: 520, height: 440, borderRadius: 9999, background: "radial-gradient(circle, rgba(245,158,11,0.18) 0%, rgba(245,158,11,0) 70%)", display: "flex" }} />
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", padding: "64px 72px", width: 700, position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "linear-gradient(135deg,#6366f1,#a855f7 60%,#fb7185)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 18, height: 18, borderRadius: 9999, border: "3px solid white", display: "flex" }} />
            </div>
            <span style={{ fontSize: 30, fontWeight: 600, letterSpacing: -0.5 }}>Scout</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 70, lineHeight: 1.04, fontWeight: 600, letterSpacing: -2, display: "flex", flexDirection: "column" }}>
              <span>Your job hunt,</span>
              <span style={{ fontFamily: serifFamily, fontStyle: "italic", fontWeight: 400, fontSize: 80, letterSpacing: -1, backgroundImage: "linear-gradient(100deg,#a5b4fc,#c084fc 50%,#fb7185 85%,#fbbf24)", backgroundClip: "text", color: "transparent" }}>
                ranked before breakfast.
              </span>
            </div>
            <p style={{ marginTop: 24, fontSize: 26, color: "#a6a6b0", lineHeight: 1.4 }}>Fresh postings from company job boards, ranked against your resume with calibrated fit scores.</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 22, color: "#80808b" }}>
            <div style={{ width: 10, height: 10, borderRadius: 9999, background: "#34d399", display: "flex" }} />
            {open ? `${open.toLocaleString("en-IN")} open jobs tracked` : "Refreshed every morning at 8:00 IST"}
          </div>
        </div>
        <div style={{ position: "absolute", right: 64, top: 150, width: 400, display: "flex", flexDirection: "column", gap: 14, transform: "rotate(-3deg)" }}>
          {ROWS.map((r, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 18, padding: "18px 20px", borderRadius: 18, background: "rgba(16,16,22,0.78)", border: i === 0 ? "1.5px solid rgba(129,140,248,0.6)" : "1.5px solid rgba(255,255,255,0.09)", boxShadow: i === 0 ? "0 20px 50px -20px rgba(99,102,241,0.8)" : "none" }}>
              <div style={{ width: 58, height: 58, borderRadius: 9999, border: `5px solid ${r.tone}`, display: "flex" }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ width: r.w - 60, height: 14, borderRadius: 7, background: "rgba(244,244,246,0.85)", display: "flex" }} />
                <div style={{ width: (r.w - 60) * 0.55, height: 10, borderRadius: 5, background: "rgba(166,166,176,0.5)", display: "flex" }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        ...(regular ? [{ name: "Geist", data: regular, style: "normal" as const, weight: 400 as const }] : []),
        ...(semibold ? [{ name: "Geist", data: semibold, style: "normal" as const, weight: 600 as const }] : []),
        ...(font ? [{ name: "Instrument Serif", data: font, style: "italic" as const, weight: 400 as const }] : []),
      ],
    },
  );
}
