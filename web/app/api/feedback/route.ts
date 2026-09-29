import { NextResponse, type NextRequest } from "next/server";
import { addFeedback } from "@/lib/actions";
import type { FeedbackAction } from "@/lib/db/schema";

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { job_id?: number; action?: FeedbackAction; note?: string } | null;
  if (!body?.job_id || !body.action) return NextResponse.json({ ok: false, error: "job_id and action required" }, { status: 400 });
  const res = await addFeedback(Number(body.job_id), body.action, body.note);
  return NextResponse.json(res, { status: res.ok ? 200 : "demo" in res && res.demo ? 403 : 400 });
}
