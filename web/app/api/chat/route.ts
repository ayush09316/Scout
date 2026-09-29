import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { chatMessages } from "@/lib/db/schema";
import { isDemo } from "@/lib/env";
import { GEMINI_MODEL, activeKey, hasGemini, withUserKey } from "@/lib/llm";
import { runAgent } from "@/lib/chat/agent";
import { runRules } from "@/lib/chat/rules";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WINDOW = 3600_000;
const LIMIT = 30;
const g = globalThis as unknown as { __scoutChatRate?: Map<string, number[]> };
const hits: Map<string, number[]> = (g.__scoutChatRate ??= new Map<string, number[]>());

function rateLimit(key: string) {
  const now = Date.now();
  const list = (hits.get(key) ?? []).filter((t) => now - t < WINDOW);
  if (list.length >= LIMIT) {
    hits.set(key, list);
    return { ok: false, retryAfter: Math.ceil((WINDOW - (now - list[0])) / 1000) };
  }
  list.push(now);
  hits.set(key, list);
  return { ok: true, remaining: LIMIT - list.length };
}

type Body = { sessionId?: string; message?: string; history?: { role: "user" | "assistant"; content: string }[] };

export function POST(req: NextRequest) {
  return withUserKey(req.headers.get("x-gemini-key"), () => handle(req));
}

async function handle(req: NextRequest) {
  const demo = isDemo();
  const session = demo ? null : await auth();
  if (!demo && !session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = (await req.json().catch(() => null)) as Body | null;
  const message = body?.message?.trim().slice(0, 2000);
  const sessionId = body?.sessionId && /^[A-Za-z0-9-]{8,64}$/.test(body.sessionId) ? body.sessionId : null;
  if (!message || !sessionId) return NextResponse.json({ error: "message and sessionId required" }, { status: 400 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
  const rl = rateLimit(`${session?.user?.email ?? ip}`);
  if (!rl.ok) return NextResponse.json({ error: `Rate limit: 30 messages per hour. Try again in ${Math.ceil((rl.retryAfter ?? 60) / 60)} min.` }, { status: 429, headers: { "retry-after": String(rl.retryAfter) } });

  const history = Array.isArray(body?.history) ? body!.history.filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string").map((m) => ({ role: m.role, content: m.content.slice(0, 4000) })) : [];
  const useLLM = hasGemini();
  const model = useLLM ? GEMINI_MODEL : "rules";
  const persist = !demo;

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const toolLog: Record<string, unknown>[] = [];
      const secret = activeKey();
      const emit = (e: Record<string, unknown>) => {
        if (e.t === "tool") toolLog.push(e);
        const line = JSON.stringify(e);
        controller.enqueue(enc.encode((secret ? line.split(secret).join("***") : line) + "\n"));
      };
      emit({ t: "meta", model, remaining: rl.remaining });
      try {
        if (persist) await db.insert(chatMessages).values({ sessionId, role: "user", content: message });
        let out: { text: string };
        try {
          out = useLLM ? await runAgent(history, message, emit) : await runRules(message, emit);
        } catch (e) {
          if (!useLLM) throw e;
          emit({ t: "notice", message: `Gemini failed (${e instanceof Error ? e.message.slice(0, 120) : "error"}) — answered with the rules router.` });
          emit({ t: "meta", model: "rules" });
          out = await runRules(message, emit);
        }
        if (persist) {
          if (toolLog.length) await db.insert(chatMessages).values(toolLog.map((t) => ({ sessionId, role: "tool" as const, content: JSON.stringify({ name: t.name, error: t.error ?? null }).slice(0, 4000), toolCalls: [t] })));
          await db.insert(chatMessages).values({ sessionId, role: "assistant", content: out.text || "(no answer)", toolCalls: toolLog.map((t) => ({ id: t.id, name: t.name, args: t.args, error: t.error ?? null, result: t.result })) });
        }
      } catch (e) {
        emit({ t: "error", message: e instanceof Error ? e.message : String(e) });
      }
      emit({ t: "done" });
      controller.close();
    },
  });
  return new Response(stream, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store", "x-accel-buffering": "no" } });
}
