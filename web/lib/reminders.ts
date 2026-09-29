import "server-only";
import { sql } from "drizzle-orm";
import { db } from "./db";

export async function snoozeReminderRow(id: number, days = 3) {
  await db.execute(sql`UPDATE reminders SET due_at = now() + make_interval(days => ${days}::int), sent_at = NULL WHERE id = ${id} AND dismissed_at IS NULL`);
}

export async function dismissReminderRow(id: number) {
  await db.execute(sql`UPDATE reminders SET dismissed_at = now() WHERE id = ${id} AND dismissed_at IS NULL`);
}
