import "server-only";

export const GEMINI_MODEL = "gemini-2.5-flash";

export const hasGemini = () => !!process.env.GEMINI_API_KEY;

export function geminiUrl(method: "generateContent" | "streamGenerateContent") {
  const key = process.env.GEMINI_API_KEY ?? "";
  const q = method === "streamGenerateContent" ? `alt=sse&key=${encodeURIComponent(key)}` : `key=${encodeURIComponent(key)}`;
  return `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:${method}?${q}`;
}

export async function geminiText(prompt: string, opts: { json?: boolean; temperature?: number; maxTokens?: number } = {}): Promise<string | null> {
  if (!hasGemini()) return null;
  try {
    const res = await fetch(geminiUrl("generateContent"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: opts.temperature ?? 0.3,
          maxOutputTokens: opts.maxTokens ?? 4096,
          ...(opts.json ? { responseMimeType: "application/json" } : {}),
        },
      }),
      signal: AbortSignal.timeout(45000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim();
    return text || null;
  } catch {
    return null;
  }
}
