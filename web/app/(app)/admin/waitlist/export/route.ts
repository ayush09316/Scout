import { NextResponse } from "next/server";
import { ownerSession } from "@/auth";
import { isDemo } from "@/lib/env";
import { allEntries } from "@/lib/waitlist";

export const dynamic = "force-dynamic";

const cell = (v: unknown) => {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function GET() {
  if (isDemo() || !(await ownerSession())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const rows = await allEntries();
  const list = (v: string[]) => v.join("; ");
  const head = ["email", "search_stage", "roles", "experience", "locations", "pains", "tools", "pay_likelihood", "pay_reason", "survey_step", "survey_completed_at", "hot_lead", "name", "role", "city", "would_pay", "source", "referred_by", "referrals", "joined_at"];
  const lines = [
    head.join(","),
    ...rows.map((r) =>
      [r.email, r.searchStage, list(r.roles), r.experience, list(r.locations), list(r.pains), list(r.tools), r.likelihood, r.payReason, r.surveyStep, r.completedAt, r.hot ? "yes" : "no", r.name, r.role, r.city, r.wouldPay, r.source, r.referredBy, r.referrals, r.createdAt]
        .map(cell)
        .join(","),
    ),
  ];
  const stamp = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  return new NextResponse("﻿" + lines.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="scout-waitlist-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
