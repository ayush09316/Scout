import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { rawSql as sql } from "./db";
import { HOT_STAGE } from "./waitlist-options";

const secret = () => process.env.AUTH_SECRET ?? "";

export const hashIp = (ip: string) => createHash("sha256").update(ip + secret()).digest("hex");

const sign = (purpose: string, code: string) => createHmac("sha256", secret()).update(`waitlist-${purpose}:${code}`).digest("base64url").slice(0, 32);

const check = (purpose: string, code: string, t: string) => {
  const a = Buffer.from(sign(purpose, code));
  const b = Buffer.from(t);
  return a.length === b.length && timingSafeEqual(a, b);
};

export const leaveToken = (code: string) => sign("leave", code);
export const validLeaveToken = (code: string, t: string) => check("leave", code, t);
export const surveyToken = (code: string) => sign("survey", code);
export const validSurveyToken = (code: string, t: string) => check("survey", code, t);

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

export type Standing = { position: number; total: number; referrals: number; refCode: string; email: string; surveyStep: number; surveyDone: boolean };

export async function standing(refCode: string): Promise<Standing | null> {
  const [r] = await sql<Standing[]>`
    with refs as (
      select referred_by as code, count(*)::int as n from waitlist where referred_by is not null and unsubscribed_at is null group by referred_by
    ), ranked as (
      select w.ref_code, w.email, coalesce(r.n, 0) as referrals, w.survey_step, w.survey_completed_at,
             row_number() over (order by w.created_at - make_interval(days => coalesce(r.n, 0) + case when w.survey_completed_at is not null then 1 else 0 end), w.id)::int as position,
             count(*) over ()::int as total
      from waitlist w left join refs r on r.code = w.ref_code
      where w.unsubscribed_at is null
    )
    select position, total, referrals, ref_code as "refCode", email, survey_step::int as "surveyStep", (survey_completed_at is not null) as "surveyDone"
    from ranked where ref_code = ${refCode}`;
  return r ?? null;
}

export type NewEntry = { email: string; referredBy: string | null; ipHash: string; userAgent: string | null };

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
      insert into waitlist (email, ref_code, referred_by, consent, ip_hash, user_agent)
      values (${e.email}, ${code}, ${referredBy}, true, ${e.ipHash}, ${e.userAgent})
      on conflict do nothing
      returning ref_code`;
    if (rows[0]) return { refCode: rows[0].ref_code, created: true };
    const [dupe] = await sql<{ ref_code: string }[]>`select ref_code from waitlist where email_lower = lower(${e.email})`;
    if (dupe) return { refCode: dupe.ref_code, created: false };
  }
  throw new Error("could not allocate a referral code");
}

export type StepAnswers =
  | { step: 1; stage: string | null }
  | { step: 2; roles: string[]; experience: string | null; locations: string[] }
  | { step: 3; pains: string[] }
  | { step: 4; tools: string[] }
  | { step: 5; likelihood: number | null; reason: string | null };

export async function saveStep(code: string, step: number, a: StepAnswers | null): Promise<boolean> {
  const where = sql`ref_code = ${code} and unsubscribed_at is null`;
  let rows;
  if (!a) rows = await sql`update waitlist set survey_step = greatest(survey_step, ${step}) where ${where} returning id`;
  else if (a.step === 1) rows = await sql`update waitlist set search_stage = ${a.stage}, survey_step = greatest(survey_step, 1) where ${where} returning id`;
  else if (a.step === 2)
    rows = await sql`update waitlist set roles = ${JSON.stringify(a.roles)}::jsonb, experience = ${a.experience}, locations = ${JSON.stringify(a.locations)}::jsonb, survey_step = greatest(survey_step, 2) where ${where} returning id`;
  else if (a.step === 3) rows = await sql`update waitlist set pains = ${JSON.stringify(a.pains)}::jsonb, survey_step = greatest(survey_step, 3) where ${where} returning id`;
  else if (a.step === 4) rows = await sql`update waitlist set tools = ${JSON.stringify(a.tools)}::jsonb, survey_step = greatest(survey_step, 4) where ${where} returning id`;
  else
    rows = await sql`update waitlist set pay_likelihood = ${a.likelihood}, pay_reason = ${a.reason}, survey_step = 5,
      survey_completed_at = case when ${a.likelihood}::smallint is not null then coalesce(survey_completed_at, now()) else survey_completed_at end
      where ${where} returning id`;
  return rows.length > 0;
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
  city: string | null;
  wouldPay: string | null;
  source: string | null;
  searchStage: string | null;
  roles: string[];
  experience: string | null;
  locations: string[];
  pains: string[];
  tools: string[];
  likelihood: number | null;
  payReason: string | null;
  surveyStep: number;
  completedAt: string | null;
  hot: boolean;
  referredBy: string | null;
  referrals: number;
  createdAt: string;
};

export async function allEntries(): Promise<WaitlistRow[]> {
  const rows = await sql<(Omit<WaitlistRow, "createdAt" | "completedAt" | "hot"> & { createdAt: Date; completedAt: Date | null })[]>`
    select w.id::int as id, w.email, w.name, w.role, w.city, w.would_pay as "wouldPay", w.source,
           w.search_stage as "searchStage", w.roles, w.experience, w.locations, w.pains, w.tools,
           w.pay_likelihood::int as likelihood, w.pay_reason as "payReason", w.survey_step::int as "surveyStep", w.survey_completed_at as "completedAt",
           w.referred_by as "referredBy",
           (select count(*)::int from waitlist r where r.referred_by = w.ref_code) as referrals, w.created_at as "createdAt"
    from waitlist w where w.unsubscribed_at is null order by w.created_at desc`;
  return rows.map((r) => ({
    ...r,
    roles: r.roles ?? [],
    locations: r.locations ?? [],
    pains: r.pains ?? [],
    tools: r.tools ?? [],
    hot: r.searchStage === HOT_STAGE && (r.likelihood ?? 0) >= 4,
    createdAt: new Date(r.createdAt).toISOString(),
    completedAt: r.completedAt ? new Date(r.completedAt).toISOString() : null,
  }));
}

type Count = { label: string; n: number };

export type WaitlistStats = {
  total: number;
  last7: number;
  completed: number;
  started: number;
  hot: number;
  stages: Count[];
  pains: Count[];
  tools: Count[];
  roles: Count[];
  locations: Count[];
  likelihood: Count[];
  likelihoodMean: number | null;
  likelihoodN: number;
  daily: { day: string; n: number }[];
};

const arrayCounts = (col: "roles" | "locations" | "pains" | "tools") => sql<Count[]>`
  select v as label, count(*)::int as n from waitlist w, jsonb_array_elements_text(w.${sql(col)}) v
  where w.unsubscribed_at is null group by v order by n desc, v`;

export async function waitlistStats(): Promise<WaitlistStats> {
  const [t] = await sql<{ total: number; last7: number; completed: number; started: number; hot: number; mean: number | null; ln: number }[]>`
    select count(*)::int as total,
           count(*) filter (where created_at >= now() - interval '7 days')::int as last7,
           count(survey_completed_at)::int as completed,
           count(*) filter (where survey_step > 0)::int as started,
           count(*) filter (where search_stage = ${HOT_STAGE} and pay_likelihood >= 4)::int as hot,
           avg(pay_likelihood)::float8 as mean,
           count(pay_likelihood)::int as ln
    from waitlist where unsubscribed_at is null`;
  const [stages, pains, tools, roles, locations, likelihood, daily] = await Promise.all([
    sql<Count[]>`select search_stage as label, count(*)::int as n from waitlist where unsubscribed_at is null and search_stage is not null group by search_stage`,
    arrayCounts("pains"),
    arrayCounts("tools"),
    arrayCounts("roles"),
    arrayCounts("locations"),
    sql<Count[]>`select pay_likelihood::text as label, count(*)::int as n from waitlist where unsubscribed_at is null and pay_likelihood is not null group by pay_likelihood`,
    sql<{ day: string; n: number }[]>`
      select to_char(d, 'YYYY-MM-DD') as day, coalesce(c.n, 0)::int as n
      from generate_series((now() at time zone 'Asia/Kolkata')::date - 29, (now() at time zone 'Asia/Kolkata')::date, interval '1 day') d
      left join (select (created_at at time zone 'Asia/Kolkata')::date as day, count(*) as n from waitlist where unsubscribed_at is null group by 1) c on c.day = d::date
      order by d`,
  ]);
  return { total: t.total, last7: t.last7, completed: t.completed, started: t.started, hot: t.hot, stages, pains, tools, roles, locations, likelihood, likelihoodMean: t.mean, likelihoodN: t.ln, daily };
}
