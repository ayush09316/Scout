"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import * as Collapsible from "@radix-ui/react-collapsible";
import { ArrowUp, ChevronRight, CircleAlert, Database, KeyRound, LoaderCircle, MessagesSquare, RotateCcw, Search, Sparkles, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModelChip } from "@/components/model-chip";
import { getChatHistory } from "@/lib/actions";
import { cn } from "@/lib/utils";

const STARTERS = ["Which companies hiring in Bengaluru use Django?", "Where did salary estimates go up this month?", "What skills am I missing most?"];

type ToolCall = { id: string; name: string; args: Record<string, unknown>; result?: unknown; error?: string | null; running?: boolean };
type Msg = { id: string; role: "user" | "assistant"; content: string; tools: ToolCall[]; model?: string; error?: string; notice?: string; streaming?: boolean };

const SESSION_KEY = "scout-chat-session";

function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `s-${Date.now().toString(36)}-${Math.floor(performance.now()).toString(36)}`;
}

function ResultTable({ result }: { result: unknown }) {
  const r = result as { columns?: string[]; rows?: Record<string, unknown>[]; rowCount?: number; truncated?: boolean; results?: Record<string, unknown>[]; gaps?: Record<string, unknown>[] } | null;
  const rows = r?.rows ?? r?.results ?? r?.gaps ?? null;
  if (!rows) return <pre className="max-h-64 overflow-auto p-3 font-mono text-[11px] leading-relaxed text-fg-muted">{JSON.stringify(result, null, 2).slice(0, 4000)}</pre>;
  if (!rows.length) return <p className="px-3 py-2 text-xs text-fg-subtle">No rows.</p>;
  const cols = r?.columns?.length ? r.columns : Object.keys(rows[0]);
  const fmt = (v: unknown) => (v == null ? "—" : typeof v === "object" ? JSON.stringify(v) : String(v));
  return (
    <div className="max-h-72 overflow-auto">
      <table className="w-full text-left text-[11px]">
        <thead className="sticky top-0 bg-surface-2">
          <tr>
            {cols.map((c) => (
              <th key={c} className="border-b border-border px-3 py-1.5 font-medium whitespace-nowrap text-fg-subtle">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 50).map((row, i) => (
            <tr key={i} className="border-b border-border last:border-0">
              {cols.map((c) => (
                <td key={c} className="max-w-[260px] truncate px-3 py-1.5 font-mono text-fg-muted" title={fmt(row[c])}>
                  {fmt(row[c])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {(r?.rowCount ?? rows.length) > 0 && (
        <p className="border-t border-border px-3 py-1.5 text-[11px] text-fg-subtle">
          {r?.rowCount ?? rows.length} row{(r?.rowCount ?? rows.length) === 1 ? "" : "s"}
          {r?.truncated ? " · showing first 50" : ""}
        </p>
      )}
    </div>
  );
}

const TOOL_META: Record<string, { label: string; icon: typeof Database }> = {
  run_sql: { label: "Ran SQL", icon: Database },
  search_jobs: { label: "Searched jobs", icon: Search },
  get_company_stats: { label: "Company stats", icon: Wrench },
  get_skill_gaps: { label: "Skill gaps", icon: Sparkles },
};

function ToolBlock({ call }: { call: ToolCall }) {
  const [open, setOpen] = useState(false);
  const meta = TOOL_META[call.name] ?? { label: call.name, icon: Wrench };
  const summary = call.name === "run_sql" ? String(call.args.query ?? "") : Object.entries(call.args).filter(([, v]) => v != null && v !== "").map(([k, v]) => `${k}: ${String(v)}`).join(" · ");
  return (
    <Collapsible.Root open={open} onOpenChange={setOpen} className="overflow-hidden rounded-lg border border-border bg-surface" data-testid="tool-block">
      <Collapsible.Trigger className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-surface-2">
        <ChevronRight className={cn("size-3.5 shrink-0 text-fg-subtle transition-transform", open && "rotate-90")} aria-hidden />
        {call.running ? <LoaderCircle className="size-3.5 shrink-0 animate-spin text-fg-subtle" /> : <meta.icon className={cn("size-3.5 shrink-0", call.error ? "text-bad" : "text-accent")} aria-hidden />}
        <span className="shrink-0 font-medium text-fg">{meta.label}</span>
        <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-fg-subtle">{summary}</span>
        {call.error && <span className="shrink-0 rounded bg-bad-soft px-1.5 text-[11px] text-bad">error</span>}
      </Collapsible.Trigger>
      <Collapsible.Content className="border-t border-border">
        {call.name === "run_sql" && <pre className="overflow-x-auto bg-surface-2 px-3 py-2 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-fg">{String(call.args.query ?? "")}</pre>}
        {call.error ? <p className="px-3 py-2 text-xs text-bad">{call.error}</p> : call.result !== undefined ? <ResultTable result={call.result} /> : <p className="px-3 py-2 text-xs text-fg-subtle">Running…</p>}
      </Collapsible.Content>
    </Collapsible.Root>
  );
}

function Markdown({ text }: { text: string }) {
  return (
    <div className="prose-job prose-chat text-sm">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ href, children }) =>
            href?.startsWith("/") ? (
              <Link href={href} className="text-accent underline underline-offset-2">
                {children}
              </Link>
            ) : (
              <a href={href} target="_blank" rel="noreferrer">
                {children}
              </a>
            ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}

export function ChatView({ llm }: { llm: boolean }) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let id: string | null = null;
    try {
      id = localStorage.getItem(SESSION_KEY);
      if (!id) {
        id = newId();
        localStorage.setItem(SESSION_KEY, id);
      }
    } catch {
      id = newId();
    }
    setSessionId(id);
    getChatHistory(id)
      .then((h) =>
        setMsgs((prev) =>
          prev.length ? prev : h.map((m) => ({
            id: `db-${m.id}`,
            role: m.role,
            content: m.content,
            tools: (m.toolCalls as ToolCall[]).map((t, i) => ({ ...t, id: t.id ?? `t${i}`, args: t.args ?? {} })),
          })),
        ),
      )
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [msgs]);

  const reset = () => {
    const id = newId();
    try {
      localStorage.setItem(SESSION_KEY, id);
    } catch {}
    setSessionId(id);
    setMsgs([]);
  };

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || busy || !sessionId) return;
    setInput("");
    setBusy(true);
    const aid = `a-${msgs.length}-${q.length}`;
    const history = msgs.filter((m) => m.content).map((m) => ({ role: m.role, content: m.content }));
    setMsgs((m) => [...m, { id: `u-${m.length}`, role: "user", content: q, tools: [] }, { id: aid, role: "assistant", content: "", tools: [], streaming: true }]);
    const patch = (fn: (m: Msg) => Msg) => setMsgs((ms) => ms.map((m) => (m.id === aid ? fn(m) : m)));
    try {
      const res = await fetch("/api/chat", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sessionId, message: q, history }) });
      if (!res.ok || !res.body) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        patch((m) => ({ ...m, streaming: false, error: err.error ?? `Request failed (${res.status})` }));
        return;
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let i;
        while ((i = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, i);
          buf = buf.slice(i + 1);
          if (!line.trim()) continue;
          const e = JSON.parse(line) as Record<string, unknown>;
          if (e.t === "meta") patch((m) => ({ ...m, model: String(e.model) }));
          else if (e.t === "text") patch((m) => ({ ...m, content: m.content + String(e.d) }));
          else if (e.t === "tool_start") patch((m) => ({ ...m, tools: [...m.tools, { id: String(e.id), name: String(e.name), args: (e.args as Record<string, unknown>) ?? {}, running: true }] }));
          else if (e.t === "tool")
            patch((m) => ({ ...m, tools: m.tools.map((t) => (t.id === e.id ? { ...t, running: false, result: e.result, error: (e.error as string) ?? null } : t)) }));
          else if (e.t === "notice") patch((m) => ({ ...m, notice: String(e.message) }));
          else if (e.t === "error") patch((m) => ({ ...m, error: String(e.message) }));
        }
      }
    } catch (e) {
      patch((m) => ({ ...m, error: e instanceof Error ? e.message : "Network error" }));
    } finally {
      patch((m) => ({ ...m, streaming: false }));
      setBusy(false);
      taRef.current?.focus();
    }
  };

  const empty = msgs.length === 0;

  return (
    <div className="mx-auto flex h-[calc(100dvh-3.5rem-4rem)] max-w-3xl flex-col px-4 md:h-dvh md:px-8">
      <div className="flex items-center justify-between gap-3 py-4 md:pt-8">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight">Chat</h1>
          <p className="mt-1 truncate text-sm text-fg-muted">Ask your job market anything. Answers come from your own database.</p>
        </div>
        {!empty && (
          <Button size="sm" variant="ghost" onClick={reset} disabled={busy}>
            <RotateCcw />
            New chat
          </Button>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pb-4" data-testid="chat-log">
        {empty ? (
          <div className="flex h-full flex-col items-center justify-center py-8 text-center">
            <div className="mb-4 flex size-11 items-center justify-center rounded-xl bg-accent-soft text-accent-soft-fg">
              <MessagesSquare className="size-5" aria-hidden />
            </div>
            <h2 className="text-sm font-semibold">Chat with your job market</h2>
            {llm ? (
              <p className="mt-1 max-w-sm text-sm text-fg-muted">Gemini plans SQL and search calls against your data, shows every query it ran, then answers.</p>
            ) : (
              <div className="mt-3 max-w-md rounded-xl border border-border bg-surface-2/60 px-4 py-3 text-left" data-testid="no-key">
                <p className="flex items-center gap-2 text-[13px] font-medium text-fg">
                  <KeyRound className="size-4 text-warn" aria-hidden />
                  Set <code className="rounded bg-muted px-1 font-mono text-xs">GEMINI_API_KEY</code> for open-ended questions
                </p>
                <p className="mt-1 text-xs leading-relaxed text-fg-muted">
                  Without a key, a small built-in rules router still answers the starter questions below (and similar ones) by running real SQL and search against your data.
                </p>
              </div>
            )}
            <div className="mt-6 flex w-full max-w-md flex-col gap-2">
              {STARTERS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  disabled={!sessionId || busy}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border bg-surface px-3.5 py-2.5 text-left text-[13px] text-fg-muted shadow-card transition-colors hover:border-border-strong hover:text-fg disabled:opacity-60"
                >
                  {s}
                  <ArrowUp className="size-3.5 shrink-0 rotate-45 text-fg-subtle" aria-hidden />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ol className="space-y-6">
            {msgs.map((m) =>
              m.role === "user" ? (
                <li key={m.id} className="flex justify-end">
                  <p className="max-w-[85%] rounded-2xl rounded-br-md bg-accent px-3.5 py-2 text-sm whitespace-pre-wrap text-accent-fg">{m.content}</p>
                </li>
              ) : (
                <li key={m.id} className="space-y-2" data-testid="assistant-msg">
                  {m.model && <ModelChip model={m.model} />}
                  {m.tools.length > 0 && (
                    <div className="space-y-1.5">
                      {m.tools.map((t) => (
                        <ToolBlock key={t.id} call={t} />
                      ))}
                    </div>
                  )}
                  {m.notice && <p className="text-xs text-warn">{m.notice}</p>}
                  {m.content ? <Markdown text={m.content} /> : m.streaming && !m.tools.some((t) => t.running) ? <LoaderCircle className="size-4 animate-spin text-fg-subtle" aria-label="Thinking" /> : null}
                  {m.error && (
                    <p className="flex items-center gap-2 rounded-lg bg-bad-soft px-3 py-2 text-xs text-bad">
                      <CircleAlert className="size-3.5 shrink-0" aria-hidden />
                      {m.error}
                    </p>
                  )}
                </li>
              ),
            )}
            <div ref={endRef} />
          </ol>
        )}
      </div>

      <form
        className="pb-4 md:pb-8"
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
      >
        <div className="flex items-end gap-2 rounded-xl border border-border bg-surface p-2 shadow-card focus-within:border-accent/60 focus-within:ring-2 focus-within:ring-accent/15">
          <textarea
            ref={taRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={1}
            placeholder={llm ? "Ask about companies, salaries, skills…" : "Try a starter question, or ask about companies, skills, salaries…"}
            aria-label="Message"
            className="max-h-40 min-h-9 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm text-fg outline-none placeholder:text-fg-subtle focus-visible:outline-none"
          />
          <Button type="submit" size="icon-sm" variant="primary" disabled={busy || !input.trim()} aria-label="Send">
            {busy ? <LoaderCircle className="animate-spin" /> : <ArrowUp />}
          </Button>
        </div>
        <p className="mt-1.5 text-center text-[11px] text-fg-subtle">Read-only · queries time out after 3s · 30 messages per hour</p>
      </form>
    </div>
  );
}
