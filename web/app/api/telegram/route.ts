import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { feedback, FEEDBACK_ACTIONS, jobs, reminders, type FeedbackAction } from "@/lib/db/schema";
import { dismissReminderRow, snoozeReminderRow } from "@/lib/reminders";
import { eq } from "drizzle-orm";

type InlineButton = { text: string; callback_data?: string; url?: string };
type Update = {
  callback_query?: {
    id: string;
    data?: string;
    message?: { message_id: number; chat: { id: number }; reply_markup?: { inline_keyboard: InlineButton[][] } };
  };
};

const LABEL: Record<string, string> = { up: "👍", down: "👎", saved: "🔖", applied: "✅" };

function safeEqual(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

async function tg(method: string, body: unknown) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  }).catch(() => undefined);
}

export async function POST(req: NextRequest) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  const got = req.headers.get("x-telegram-bot-api-secret-token") ?? "";
  if (!secret || !safeEqual(got, secret)) return NextResponse.json({ ok: false }, { status: 401 });

  const update = (await req.json().catch(() => null)) as Update | null;
  const cq = update?.callback_query;
  if (!cq?.data) return NextResponse.json({ ok: true });

  const rm = /^rm:(\d+):(done|snooze)$/.exec(cq.data);
  if (rm) {
    const id = Number(rm[1]);
    const [row] = await db.select({ id: reminders.id }).from(reminders).where(eq(reminders.id, id)).limit(1);
    if (!row) {
      await tg("answerCallbackQuery", { callback_query_id: cq.id, text: "Reminder not found" });
      return NextResponse.json({ ok: true });
    }
    if (rm[2] === "done") await dismissReminderRow(id);
    else await snoozeReminderRow(id, 3);
    await tg("answerCallbackQuery", { callback_query_id: cq.id, text: rm[2] === "done" ? "Marked done ✓" : "Snoozed for 3 days" });
    if (cq.message) {
      const rows = cq.message.reply_markup?.inline_keyboard ?? [];
      const next = rows
        .map((r) => r.filter((b) => !(b.callback_data && b.callback_data.startsWith(`rm:${id}:`))))
        .filter((r) => r.length);
      await tg("editMessageReplyMarkup", { chat_id: cq.message.chat.id, message_id: cq.message.message_id, reply_markup: { inline_keyboard: next } });
    }
    return NextResponse.json({ ok: true });
  }

  const m = /^fb:(\d+):([a-z]+)$/.exec(cq.data);
  if (!m || !FEEDBACK_ACTIONS.includes(m[2] as FeedbackAction)) {
    await tg("answerCallbackQuery", { callback_query_id: cq.id, text: "Unknown action" });
    return NextResponse.json({ ok: true });
  }
  const jobId = Number(m[1]);
  const action = m[2] as FeedbackAction;
  const [job] = await db.select({ id: jobs.id }).from(jobs).where(eq(jobs.id, jobId)).limit(1);
  if (!job) {
    await tg("answerCallbackQuery", { callback_query_id: cq.id, text: "Job not found" });
    return NextResponse.json({ ok: true });
  }
  await db.insert(feedback).values({ jobId, action, note: "telegram" });
  await tg("answerCallbackQuery", { callback_query_id: cq.id, text: `Recorded ${LABEL[action] ?? action}` });

  if (cq.message) {
    const rows = cq.message.reply_markup?.inline_keyboard ?? [];
    const next = rows.map((row) =>
      row.map((b) => {
        const bm = b.callback_data && /^fb:(\d+):([a-z]+)$/.exec(b.callback_data);
        if (!bm || Number(bm[1]) !== jobId) return b;
        const base = b.text.replace(/^✓\s*/, "");
        return { ...b, text: bm[2] === action ? `✓ ${base}` : base };
      }),
    );
    await tg("editMessageReplyMarkup", { chat_id: cq.message.chat.id, message_id: cq.message.message_id, reply_markup: { inline_keyboard: next } });
  }
  return NextResponse.json({ ok: true });
}
