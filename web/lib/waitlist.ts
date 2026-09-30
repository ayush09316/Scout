import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { rawSql as sql } from "./db";
import { PAYING } from "./waitlist-options";

const secret = () => process.env.AUTH_SECRET ?? "";

export const hashIp = (ip: string) => createHash("sha256").update(ip + secret()).digest("hex");

export const leaveToken = (code: string) => createHmac("sha256", secret()).update(`waitlist-leave:${code}`).digest("base64url").slice(0, 32);

export function validLeaveToken(code: string, t: string) {
  const a = Buffer.from(leaveToken(code));
  const b = Buffer.from(t);
  return a.length === b.length && timingSafeEqual(a, b);
}

const ALPHA = "abcdefghjkmnpqrstuvwxyz23456789";
export function newRefCode(len = 8) {
  const bytes = randomBytes(len);
  let s = "";
  for (const b of bytes) s += ALPHA[b % ALPHA.length];
  return s;
}

export async function waitlistCount() {
  try {
    const [r] = await sql<{ n: number }[]>`select count(*)::int as n from waitlist where unsubscribed_at is null`;
    return r?.n ?? 0;
  } catch {
    return 0;
  }
}

export type Standing = { position: number; total: number; referrals: number; refCode: string; email: string };

export async function standing(refCode: string): Promise<Standing | null> {
  const [r] = await sql<Standing[]>`
    with refs as (
      select referred_by as code, count(*)::int as n from waitlist where referred_by is not null and unsubscribed_at is null group by referred_by
    ), ranked as (
      select w.ref_code, w.email, coalesce(r.n, 0) as referrals,
             row_number() over (order by w.created_at - make_interval(days => coalesce(r.n, 0)), w.id)::int as position,
             count(*) over ()::int as total
      from waitlist w left join refs r on r.code = w.ref_code
      where w.unsubscribed_at is null
    )
    select position, total, referrals, ref_code as "refCode", email from ranked where ref_code = ${refCode}`;
  return r ?? null;
}

export type NewEntry = {
  email: string;
  name: string | null;
  role: string | null;
  experience: string | null;
  city: string | null;
  wouldPay: string | null;
  source: string | null;
  referredBy: string | null;
  ipHash: string;
  userAgent: string | null;
};

export async function insertEntry(e: NewEntry): Promise<{ refCode: string; created: boolean }> {
  const [existing] = await sql<{ ref_code: string }[]>`select ref_code from waitlist where email_lower = lower(${e.email})`;
  if (existing) return { refCode: existing.ref_code, created: false };
  let referredBy: string | null = null;
  if (e.referredBy) {
    const [ref] = await sql<{ ref_code: string }[]>`select ref_code from waitlist where ref_code = ${e.referredBy} and unsubscribed_at is null`;
    referredBy = ref?.ref_code ?? null;
  }
  for (let i = 0; i < 5; i++) {
    const code = newRefCode();
    const rows = await sql<{ ref_code: string }[]>`
      insert into waitlist (email, name, role, experience, city, would_pay, source, ref_code, referred_by, consent, ip_hash, user_agent)
      values (${e.email}, ${e.name}, ${e.role}, ${e.experience}, ${e.city}, ${e.wouldPay}, ${e.source}, ${code}, ${referredBy}, true, ${e.ipHash}, ${e.userAgent})
      on conflict do nothing
      returning ref_code`;
    if (rows[0]) return { refCode: rows[0].ref_code, created: true };
    const [dupe] = await sql<{ ref_code: string }[]>`select ref_code from waitlist where email_lower = lower(${e.email})`;
    if (dupe) return { refCode: dupe.ref_code, created: false };
  }
  throw new Error("could not allocate a referral code");
}

export async function deleteByCode(code: string) {
  const rows = await sql`delete from waitlist where ref_code = ${code} returning id`;
  return rows.length > 0;
}

export async function deleteById(id: number) {
  await sql`delete from waitlist where id = ${id}`;
}

export type WaitlistRow = {
  id: number;
  email: string;
  name: string | null;
  role: string | null;
  experience: string | null;
  city: string | null;
  wouldPay: string | null;
  source: string | null;
  referredBy: string | null;
  referrals: number;
  createdAt: string;
};

export async function allEntries(): Promise<WaitlistRow[]> {
  const rows = await sql<(Omit<WaitlistRow, "createdAt"> & { createdAt: Date })[]>`
    select w.id::int as id, w.email, w.name, w.role, w.experience, w.city, w.would_pay as "wouldPay", w.source, w.referred_by as "referredBy",
           (select count(*)::int from waitlist r where r.referred_by = w.ref_code) as referrals, w.created_at as "createdAt"
    from waitlist w where w.unsubscribed_at is null order by w.created_at desc`;
  return rows.map((r) => ({ ...r, createdAt: new Date(r.createdAt).toISOString() }));
}

export type WaitlistStats = {
  total: number;
  last7: number;
  payingShare: number | null;
  answeredPay: number;
  roles: { label: string; n: number }[];
  cities: { label: string; n: number }[];
  pay: { label: string; n: number }[];
  daily: { day: string; n: number }[];
};

export async function waitlistStats(): Promise<WaitlistStats> {
  const [t] = await sql<{ total: number; last7: number; answered: number; paying: number }[]>`
    select count(*)::int as total,
           count(*) filter (where created_at >= now() - interval '7 days')::int as last7,
           count(would_pay)::int as answered,
           count(*) filter (where would_pay = any(${[...PAYING]}))::int as paying
    from waitlist where unsubscribed_at is null`;
  const roles = await sql<{ label: string; n: number }[]>`select role as label, count(*)::int as n from waitlist where unsubscribed_at is null and role is not null group by role order by n desc, role limit 5`;
  const cities = await sql<{ label: string; n: number }[]>`select min(trim(city)) as label, count(*)::int as n from waitlist where unsubscribed_at is null and nullif(trim(city), '') is not null group by lower(trim(city)) order by n desc, label limit 5`;
  const pay = await sql<{ label: string; n: number }[]>`select would_pay as label, count(*)::int as n from waitlist where unsubscribed_at is null and would_pay is not null group by would_pay`;
  const daily = await sql<{ day: string; n: number }[]>`
    select to_char(d, 'YYYY-MM-DD') as day, coalesce(c.n, 0)::int as n
    from generate_series((now() at time zone 'Asia/Kolkata')::date - 29, (now() at time zone 'Asia/Kolkata')::date, interval '1 day') d
    left join (select (created_at at time zone 'Asia/Kolkata')::date as day, count(*) as n from waitlist where unsubscribed_at is null group by 1) c on c.day = d::date
    order by d`;
  return {
    total: t.total,
    last7: t.last7,
    answeredPay: t.answered,
    payingShare: t.answered ? t.paying / t.answered : null,
    roles,
    cities,
    pay,
    daily,
  };
}
