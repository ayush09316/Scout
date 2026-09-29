import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";

export const GEMINI_MODEL = "gemini-2.5-flash";

const userKey = new AsyncLocalStorage<string>();

export function cleanKey(key: unknown): string | null {
  return typeof key === "string" && /^[A-Za-z0-9_-]{20,100}$/.test(key.trim()) ? key.trim() : null;
}

export function withUserKey<T>(key: unknown, fn: () => Promise<T>): Promise<T> {
  const k = cleanKey(key);
  return k ? userKey.run(k, fn) : fn();
}

export const activeKey = () => userKey.getStore() ?? process.env.GEMINI_API_KEY ?? "";

export const hasGemini = () => !!activeKey();

export const hasServerKey = () => !!process.env.GEMINI_API_KEY;

export function geminiUrl(method: "generateContent" | "streamGenerateContent") {
  const key = activeKey();
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
