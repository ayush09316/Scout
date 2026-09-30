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
  const head = ["email", "name", "role", "experience", "city", "would_pay", "source", "referred_by", "referrals", "joined_at"];
  const lines = [head.join(","), ...rows.map((r) => [r.email, r.name, r.role, r.experience, r.city, r.wouldPay, r.source, r.referredBy, r.referrals, r.createdAt].map(cell).join(","))];
  const stamp = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  return new NextResponse("﻿" + lines.join("\r\n") + "\r\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="scout-waitlist-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
