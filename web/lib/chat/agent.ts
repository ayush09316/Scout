import "server-only";
import { geminiUrl } from "../llm";
import { SCHEMA_DOC } from "./sql-guard";
import { TOOL_DECLS, runTool } from "./tools";

type Part = { text?: string; thought?: boolean; functionCall?: { name: string; args?: Record<string, unknown> }; functionResponse?: { name: string; response: unknown }; thoughtSignature?: string };
type Content = { role: "user" | "model"; parts: Part[] };

const SYSTEM = `You are Scout, an analyst for the user's personal job-hunt database (India-focused, INR). Answer questions about the job market using tools.
- Prefer one or two precise tool calls. Use run_sql for counts/aggregations, search_jobs for "find roles like", get_company_stats for a single company, get_skill_gaps for what the user is missing.
- Only open jobs (closed_at IS NULL AND is_canonical) unless asked otherwise. Always add LIMIT.
- Answer concisely in Markdown. Link jobs as [title](/job/<id>) and companies as [name](/company/<company_key>) when you have ids/keys. Show salaries in LPA (divide INR by 100000).
- If data is missing or empty, say so plainly; never invent numbers.
${SCHEMA_DOC}`;

function compact(v: unknown) {
  const s = JSON.stringify(v);
  return s.length > 12000 ? JSON.parse(JSON.stringify(v, (_k, x) => (Array.isArray(x) && x.length > 25 ? x.slice(0, 25) : x))) : v;
}

async function* sse(res: Response) {
  const reader = res.body!.getReader();
  const dec = new TextDecoder();
  let buf = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (line.startsWith("data:")) {
        try {
          yield JSON.parse(line.slice(5).trim()) as { candidates?: { content?: { parts?: Part[] } }[] };
        } catch {}
      }
    }
  }
}

export async function runAgent(history: { role: "user" | "assistant"; content: string }[], question: string, emit: (e: Record<string, unknown>) => void) {
  const contents: Content[] = [
    ...history.slice(-10).map((m) => ({ role: (m.role === "assistant" ? "model" : "user") as Content["role"], parts: [{ text: m.content }] })),
    { role: "user", parts: [{ text: question }] },
  ];
  const tools: { name: string; args: Record<string, unknown>; error?: string }[] = [];
  let answer = "";
  for (let step = 0; step < 6; step++) {
    const res = await fetch(geminiUrl("streamGenerateContent"), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents,
        tools: [{ functionDeclarations: TOOL_DECLS }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 4096 },
      }),
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok || !res.body) throw new Error(`Gemini ${res.status}: ${(await res.text().catch(() => "")).slice(0, 200)}`);
    const parts: Part[] = [];
    for await (const chunk of sse(res)) {
      for (const p of chunk.candidates?.[0]?.content?.parts ?? []) {
        parts.push(p);
        if (p.text && !p.thought) {
          answer += p.text;
          emit({ t: "text", d: p.text });
        }
      }
    }
    const calls = parts.filter((p) => p.functionCall);
    if (!calls.length) break;
    contents.push({ role: "model", parts });
    const responses: Part[] = [];
    for (const [i, c] of calls.entries()) {
      const name = c.functionCall!.name;
      const args = c.functionCall!.args ?? {};
      const id = `s${step}-${i}`;
      emit({ t: "tool_start", id, name, args });
      try {
        const result = await runTool(name, args);
        emit({ t: "tool", id, name, args, result });
        tools.push({ name, args });
        responses.push({ functionResponse: { name, response: { result: compact(result) } } });
      } catch (e) {
        const error = e instanceof Error ? e.message : String(e);
        emit({ t: "tool", id, name, args, error });
        tools.push({ name, args, error });
        responses.push({ functionResponse: { name, response: { error } } });
      }
    }
    contents.push({ role: "user", parts: responses });
  }
  return { text: answer, tools };
}
