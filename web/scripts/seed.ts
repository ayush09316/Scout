import postgres from "postgres";
import { createHash } from "node:crypto";

const sql = postgres(process.env.DATABASE_URL ?? "postgres://localhost:5432/scout_web_dev", { max: 1 });

let seed = 42;
const rand = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};
const pick = <T,>(a: readonly T[]) => a[Math.floor(rand() * a.length)];
const pickN = <T,>(a: readonly T[], n: number) => [...a].sort(() => rand() - 0.5).slice(0, n);
const hash = (s: string) => createHash("sha1").update(s).digest("hex").slice(0, 16);
const day = 86400000;
const now = Date.now();

const companies = [
  { name: "Razorpay", ats: "lever", slug: "razorpay", domain: "razorpay.com", tier: 1 },
  { name: "Zerodha", ats: "greenhouse", slug: "zerodha", domain: "zerodha.com", tier: 1 },
  { name: "Postman", ats: "greenhouse", slug: "postman", domain: "postman.com", tier: 1 },
  { name: "Atlassian", ats: "lever", slug: "atlassian", domain: "atlassian.com", tier: 1 },
  { name: "Swiggy", ats: "lever", slug: "swiggy", domain: "swiggy.com", tier: 2 },
  { name: "CRED", ats: "lever", slug: "cred", domain: "cred.club", tier: 1 },
  { name: "Groww", ats: "greenhouse", slug: "groww", domain: "groww.in", tier: 2 },
  { name: "Meesho", ats: "lever", slug: "meesho", domain: "meesho.com", tier: 2 },
  { name: "PhonePe", ats: "greenhouse", slug: "phonepe", domain: "phonepe.com", tier: 2 },
  { name: "Browserstack", ats: "greenhouse", slug: "browserstack", domain: "browserstack.com", tier: 2 },
  { name: "Hasura", ats: "ashby", slug: "hasura", domain: "hasura.io", tier: 2 },
  { name: "Supabase", ats: "ashby", slug: "supabase", domain: "supabase.com", tier: 1 },
  { name: "Vercel", ats: "greenhouse", slug: "vercel", domain: "vercel.com", tier: 1 },
  { name: "GitLab", ats: "greenhouse", slug: "gitlab", domain: "gitlab.com", tier: 2 },
  { name: "Setu", ats: "lever", slug: "setu", domain: "setu.co", tier: 3 },
] as const;

const roles = [
  { title: "Software Engineer II, Backend", sen: "mid", min: 2, max: 5, skills: ["Python", "Django", "PostgreSQL", "Redis", "Celery"] },
  { title: "Senior Backend Engineer", sen: "senior", min: 4, max: 8, skills: ["Go", "Kafka", "PostgreSQL", "Kubernetes"] },
  { title: "Full Stack Engineer", sen: "mid", min: 2, max: 5, skills: ["TypeScript", "React", "Node.js", "PostgreSQL"] },
  { title: "SDE-2, Payments Platform", sen: "mid", min: 3, max: 6, skills: ["Java", "Spring", "MySQL", "Kafka"] },
  { title: "Platform Engineer", sen: "mid", min: 3, max: 6, skills: ["Kubernetes", "Terraform", "AWS", "Go"] },
  { title: "Machine Learning Engineer", sen: "mid", min: 2, max: 5, skills: ["Python", "PyTorch", "LLMs", "Vector DBs"] },
  { title: "AI Engineer, LLM Applications", sen: "mid", min: 2, max: 5, skills: ["Python", "LLMs", "RAG", "Evals"] },
  { title: "Staff Software Engineer", sen: "staff", min: 8, max: 14, skills: ["Distributed Systems", "Go", "System Design"] },
  { title: "Frontend Engineer", sen: "mid", min: 2, max: 5, skills: ["React", "Next.js", "TypeScript", "CSS"] },
  { title: "Software Engineer, Integrations", sen: "mid", min: 2, max: 4, skills: ["Python", "REST APIs", "Webhooks", "PostgreSQL"] },
  { title: "Junior Software Engineer", sen: "junior", min: 0, max: 2, skills: ["JavaScript", "Python", "SQL"] },
  { title: "Engineering Manager", sen: "lead", min: 8, max: 15, skills: ["People Management", "Hiring", "Roadmaps"] },
  { title: "Data Engineer", sen: "mid", min: 2, max: 5, skills: ["Spark", "Airflow", "SQL", "dbt"] },
  { title: "Site Reliability Engineer", sen: "mid", min: 3, max: 6, skills: ["Linux", "Prometheus", "Kubernetes", "Go"] },
] as const;

const mySkills = ["Python", "Django", "PostgreSQL", "Redis", "Celery", "TypeScript", "React", "Next.js", "Node.js", "REST APIs", "Webhooks", "SQL", "Kubernetes", "LLMs", "RAG", "Evals", "JavaScript", "System Design"];
const locations = ["Bengaluru", "Bengaluru", "Bengaluru", "Mumbai", "Pune", "Gurugram", "Hyderabad", "Remote (India)", "Remote", "Chennai", "Remote (APAC)"];
const sources = ["greenhouse", "lever", "ashby", "remotive", "remoteok", "hn", "arbeitnow"];

const reasonBank = {
  pos: [
    "Backend Python/Django stack matches 3 yrs production experience",
    "Payments & order-lifecycle domain overlap with MaterialDepot work",
    "Integration-heavy role (webhooks, 3rd-party APIs) fits resume",
    "Experience band {min}–{max} yrs fits your profile",
    "Remote-friendly within IST hours",
    "Tier-1 company on your list",
    "Explicit LLM/evals work mirrors Scout & Keel projects",
    "Postgres + Celery + Redis listed as core stack",
  ],
  neg: [
    "Requires {min}+ yrs; you have ~3",
    "Stack is JVM-first; limited Java on resume",
    "Onsite only outside preferred cities",
    "Management track, not IC",
    "Heavy infra/SRE focus vs product backend",
  ],
};

function description(company: string, title: string, skills: readonly string[], min: number, max: number, loc: string) {
  return `## About ${company}

${company} builds products used by millions across India. We move fast, keep teams small, and give engineers real ownership.

## The role

As a **${title}**, you will design, build and operate services that sit on the critical path of our business.

- Own features end-to-end: design doc → code → rollout → on-call
- Work closely with product and design to ship weekly
- Improve reliability and latency of core APIs
- Mentor peers through code review and pairing

## What we're looking for

- ${min}–${max} years of professional software engineering experience
${skills.map((s) => `- Strong hands-on experience with ${s}`).join("\n")}
- Clear written communication; comfortable with async work

## Nice to have

- Experience with event-driven architectures
- Open-source contributions

## Location

${loc}. Hybrid options available.

## Benefits

- Competitive salary + ESOPs
- Health insurance for you and family
- Learning budget of ₹50,000/yr
`;
}

async function main() {
  await sql`TRUNCATE companies, jobs, profile, scores, feedback, runs, labels, cover_notes, eval_reports, settings, job_versions, job_events, salary_estimates, company_stats, skill_gaps, resume_variants, interview_packs, reminders RESTART IDENTITY CASCADE`;

  const compRows = await sql`INSERT INTO companies ${sql(
    companies.map((c, i) => ({ name: c.name, ats: c.ats, slug: c.slug, tier: c.tier, active: i !== 14, last_fetched_at: new Date(now - 3600000) })),
  )} RETURNING id, name`;

  const prefs = {
    name: "Ayush",
    roles: ["Backend Engineer", "Full Stack Engineer", "AI Engineer", "SDE-2"],
    locations: ["Bengaluru", "Remote (India)", "Pune"],
    remote: "any",
    min_exp: 2,
    max_exp: 5,
    dealbreakers: ["unpaid", "crypto trading", "night shift"],
    skills: mySkills,
  };
  await sql`INSERT INTO profile (version, resume_md, preferences, created_at) VALUES
    (1, ${"# Ayush Sharma\nBackend engineer."}, ${sql.json(prefs)}, ${new Date(now - 40 * day)}),
    (2, ${`# Ayush Sharma
Software Engineer · Bengaluru · 3 yrs

Backend engineer who ships payments, integrations and data-heavy APIs.

## Experience
**MaterialDepot** — Software Engineer (2023–present)
- Designed Kylas CRM bidirectional sync handling 40k webhooks/day with idempotent Celery workers
- Built order, payments (Razorpay) and accounting (Zoho Books) integrations in Django + Celery
- Cut P95 of cart APIs from 17s to 9s by restructuring ORM queries and adding PostgreSQL indexes
- Moved notification fan-out (WhatsApp, SMS, email) onto Redis-backed queues with retries
- Deployed services on Kubernetes (AKS) with ArgoCD and OpenTelemetry tracing

**Freelance** — Full Stack Developer (2022–2023)
- Shipped three React + Node.js dashboards for D2C brands, including Shopify webhooks
- Wrote REST APIs and admin tooling in TypeScript for inventory sync

## Projects
- **Scout** — job-hunt copilot with LLM scoring, evals, calibration and hybrid search (pgvector + FTS)
- **Keel** — typed workflow engine in TypeScript with durable retries
- **RAG notes** — retrieval-augmented Q&A over personal notes using LLMs and embeddings

## Education
B.Tech, Computer Science — 2022

## Skills
Python, Django, PostgreSQL, Redis, Celery, TypeScript, React, Next.js, Node.js, Kubernetes, REST APIs, Webhooks, SQL, LLMs, RAG, Evals`}, ${sql.json(prefs)}, ${new Date(now - 6 * day)})`;

  const jobRows: { id: number; hash: string; company: string; title: string; skills: readonly string[]; min: number; max: number; sen: string; tier: number; remote: boolean }[] = [];
  let groupCounter = 1;
  for (let i = 0; i < 120; i++) {
    const ci = i < 15 ? i : i % 3 === 0 ? (rand(), 13) : Math.floor(rand() * companies.length);
    const c = companies[ci];
    const r = pick(roles);
    const loc = pick(locations);
    const remote = loc.startsWith("Remote");
    const posted = new Date(now - Math.floor(rand() * 21 * day) - Math.floor(rand() * day));
    const desc = description(c.name, r.title, r.skills, r.min, r.max, loc);
    const h = hash(desc + i);
    const src = rand() < 0.75 ? c.ats : pick(sources);
    const salary = rand() < 0.4 ? { min: (r.min + 1) * 700000 + Math.floor(rand() * 5) * 100000, cur: "INR" } : null;
    const closed = rand() < 0.05 ? new Date(now - 2 * day) : null;
    const [row] = await sql`INSERT INTO jobs (source, external_id, company_id, company_name, url, title, location, remote, seniority, min_exp, max_exp, salary_min, salary_max, salary_currency, description_md, posted_at, first_seen_at, last_seen_at, content_hash, closed_at, notified_at)
      VALUES (${src}, ${`${c.slug}-${1000 + i}`}, ${compRows[ci].id}, ${c.name}, ${`https://${c.domain}/careers/${1000 + i}`}, ${r.title}, ${loc}, ${remote}, ${r.sen}, ${r.min}, ${r.max},
      ${salary?.min ?? null}, ${salary ? salary.min + 1500000 : null}, ${salary?.cur ?? null}, ${desc}, ${posted}, ${new Date(posted.getTime() + 3600000)}, ${new Date(now - 3600000)}, ${h}, ${closed}, ${rand() < 0.3 ? new Date(now - day) : null})
      RETURNING id`;
    jobRows.push({ id: Number(row.id), hash: h, company: c.name, title: r.title, skills: r.skills, min: r.min, max: r.max, sen: r.sen, tier: c.tier, remote });
  }

  for (let d = 0; d < 6; d++) {
    const base = jobRows[10 + d * 7];
    const [dup] = await sql`INSERT INTO jobs (source, external_id, company_id, company_name, url, title, location, remote, seniority, description_md, posted_at, content_hash, is_canonical)
      SELECT ${pick(["remotive", "hn", "arbeitnow"])}, ${"dup-" + d}, company_id, company_name, url || '?ref=agg', title, location, remote, seniority, description_md, posted_at, content_hash || 'd', FALSE FROM jobs WHERE id = ${base.id} RETURNING id`;
    await sql`UPDATE jobs SET dedup_group_id = ${groupCounter} WHERE id IN (${base.id}, ${dup.id})`;
    groupCounter++;
  }

  const models = ["jev-1.13", "jev-1.13", "jev-1.13", "gemini-2.5-flash", "heuristic"];
  const fitMap = new Map<number, number>();
  for (const j of jobRows) {
    const matched = j.skills.filter((s) => mySkills.includes(s));
    const missing = j.skills.filter((s) => !mySkills.includes(s));
    const skillFrac = matched.length / j.skills.length;
    const senOk = j.sen === "mid" || (j.sen === "senior" && rand() < 0.4);
    const sim = 0.45 + skillFrac * 0.35 + rand() * 0.12;
    const fitProb = Math.min(0.94, Math.max(0.04, 0.14 + skillFrac * 0.55 + (senOk ? 0.16 : -0.08) + (rand() - 0.5) * 0.4));
    const fitScore = Math.round(fitProb * 100) / 10;
    const applyProb = Math.min(0.98, Math.max(0.02, fitProb * 0.9 + (j.tier === 1 ? 0.08 : 0)));
    const final = Math.min(0.99, 0.5 * fitProb + 0.25 * sim + 0.15 * applyProb + (senOk ? 0.08 : 0) + (j.tier === 1 ? 0.04 : 0));
    fitMap.set(j.id, fitProb);
    const fill = (s: string) => s.replace("{min}", String(j.min)).replace("{max}", String(j.max));
    const pos = pickN(reasonBank.pos, fitProb > 0.6 ? 3 : 1).map(fill);
    const neg = fitProb < 0.6 ? pickN(reasonBank.neg, 1).map(fill) : [];
    const model = pick(models);
    const createdAt = new Date(now - Math.floor(rand() * 5 * day));
    await sql`INSERT INTO scores (job_id, profile_version, content_hash, model, embed_sim, fit_score, fit_prob, seniority, seniority_match, apply_prob, final_score, reasons, missing_skills, latency_ms, cost_usd, created_at)
      VALUES (${j.id}, 1, ${j.hash}, 'heuristic', ${sim - 0.05}, ${fitScore - 1}, ${fitProb - 0.1}, ${j.sen}, ${senOk}, ${applyProb}, ${final - 0.1}, ${sql.json(pos)}, ${sql.json(missing)}, 2, 0, ${new Date(now - 30 * day)})`;
    await sql`INSERT INTO scores (job_id, profile_version, content_hash, model, embed_sim, fit_score, fit_prob, seniority, seniority_match, apply_prob, final_score, reasons, missing_skills, latency_ms, cost_usd, created_at)
      VALUES (${j.id}, 2, ${j.hash}, ${model}, ${sim}, ${fitScore}, ${fitProb}, ${j.sen}, ${senOk}, ${applyProb}, ${final}, ${sql.json([...pos, ...neg])}, ${sql.json(missing)},
      ${model === "heuristic" ? 3 : model.startsWith("jev") ? 380 + Math.floor(rand() * 400) : 1400 + Math.floor(rand() * 900)}, ${model.startsWith("jev") ? 0.00021 : 0}, ${createdAt})`;
  }

  const ranked = [...jobRows].sort((a, b) => (fitMap.get(b.id) ?? 0) - (fitMap.get(a.id) ?? 0)).filter((_, i) => i % 2 === 1);
  const stagePlans: { action: string[]; idx: number }[] = [
    { action: ["up", "saved"], idx: 2 }, { action: ["saved"], idx: 5 }, { action: ["saved"], idx: 9 }, { action: ["up", "saved"], idx: 13 },
    { action: ["saved", "applied"], idx: 1 }, { action: ["applied"], idx: 4 }, { action: ["up", "applied"], idx: 7 }, { action: ["saved", "applied"], idx: 11 },
    { action: ["applied"], idx: 16 }, { action: ["applied"], idx: 20 },
    { action: ["saved", "applied", "interview"], idx: 0 }, { action: ["applied", "interview"], idx: 3 }, { action: ["applied", "interview"], idx: 12 },
    { action: ["applied", "interview", "offer"], idx: 6 },
    { action: ["applied", "rejected"], idx: 8 }, { action: ["applied", "interview", "rejected"], idx: 14 }, { action: ["applied", "rejected"], idx: 22 },
    { action: ["down"], idx: 25 }, { action: ["down"], idx: 30 }, { action: ["up"], idx: 33 }, { action: ["down"], idx: 40 },
  ];
  for (const p of stagePlans) {
    let t = now - (18 + Math.floor(rand() * 6)) * day;
    for (const a of p.action) {
      t += Math.floor((1 + rand() * 5) * day);
      await sql`INSERT INTO feedback (job_id, action, note, at) VALUES (${ranked[p.idx].id}, ${a}, ${a === "interview" ? "Phone screen scheduled" : null}, ${new Date(Math.min(t, now - 3600000))})`;
    }
  }

  for (const j of [...jobRows].sort((a, b) => a.id - b.id).slice(40, 88)) {
    const b = Buffer.from(createHash("md5").update(String(j.id)).digest()).readUInt32BE(0);
    await sql`INSERT INTO labels (job_id, label, split, at) VALUES (${j.id}, ${rand() < 0.45 ? "fit" : "no"}, ${b % 4 === 0 ? "test" : "dev"}, ${new Date(now - rand() * 5 * day)})`;
  }

  for (let r = 13; r >= 0; r--) {
    const start = new Date(now - r * day - 5.5 * 3600000);
    const fetched = 2800 + Math.floor(rand() * 700);
    const fresh = 40 + Math.floor(rand() * 120);
    const scored = Math.min(60, fresh) + Math.floor(rand() * 10);
    const failed = r === 4;
    const errors = [] as { source: string; message: string; at: string }[];
    if (rand() < 0.4) errors.push({ source: "remoteok", message: "HTTP 429 Too Many Requests (retried 3x)", at: start.toISOString() });
    if (rand() < 0.3) errors.push({ source: "ashby:hasura", message: "Timeout after 20s", at: start.toISOString() });
    if (failed) errors.push({ source: "scoring", message: "Jev 503; fell back to gemini-2.5-flash for 41 jobs", at: start.toISOString() });
    if (r === 2) errors.push({ source: "lever:setu", message: "404 Not Found — slug may have changed", at: start.toISOString() });
    await sql`INSERT INTO runs (started_at, finished_at, status, counts, errors, cost_usd) VALUES (${start}, ${new Date(start.getTime() + (180 + rand() * 200) * 1000)}, ${failed ? "partial" : "ok"},
      ${sql.json({ fetched, new: fresh, updated: Math.floor(fetched * 0.1), closed: Math.floor(rand() * 30), deduped: Math.floor(fresh * 0.08), filtered: Math.floor(fresh * 0.5), scored, notified: 10 })},
      ${sql.json(errors)}, ${(scored * 0.00021 + (failed ? 0 : 0)).toFixed(6)})`;
  }

  const calibration = Array.from({ length: 10 }, (_, i) => {
    const predicted = (i + 0.5) / 10;
    return { bin: i, predicted: Math.round(predicted * 100) / 100, observed: Math.round(Math.min(1, Math.max(0, predicted + (rand() - 0.5) * 0.12)) * 100) / 100, count: 5 + Math.floor(rand() * 20) };
  });
  await sql`INSERT INTO eval_reports (created_at, report) VALUES (${new Date(now - day)}, ${sql.json({
    n_dev: 150,
    n_test: 50,
    scorers: {
      jev: { p_at_10: 0.8, recall_at_50: 0.86, ece: 0.041, p50_ms: 412, usd_per_1k: 0.21 },
      gemini: { p_at_10: 0.7, recall_at_50: 0.81, ece: 0.093, p50_ms: 1620, usd_per_1k: 0 },
      local: { p_at_10: 0.6, recall_at_50: 0.74, ece: 0.12, p50_ms: 2350, usd_per_1k: 0 },
      heuristic: { p_at_10: 0.4, recall_at_50: 0.62, ece: 0.21, p50_ms: 3, usd_per_1k: 0 },
    },
    calibration,
  })})`;

  const [cn] = await sql`SELECT id FROM jobs ORDER BY id LIMIT 1`;
  await sql`INSERT INTO cover_notes (job_id, profile_version, body, model) VALUES (${cn.id}, 2, ${"Hi Razorpay team — I build payment and accounting integrations in Django at MaterialDepot and would love to bring that to your backend team."}, 'template')`;
  await sql`INSERT INTO settings (key, value) VALUES ('weights', ${sql.json({ fit: 0.5, embed: 0.25, apply: 0.15, seniority: 0.08, tier: 0.04 })})`;

  await seedV2(jobRows, compRows as unknown as { id: number; name: string }[]);

  const [{ count }] = await sql`SELECT count(*)::int AS count FROM jobs`;
  console.log(`seeded ${count} jobs`);
  await sql.end();
}

const keyOf = (name: string) =>
  name
    .toLowerCase()
    .replace(/\b(inc|labs|pvt|ltd|llc|technologies|private|limited)\b\.?/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();

type SeedJob = { id: number; hash: string; company: string; title: string; skills: readonly string[]; min: number; max: number; sen: string; tier: number; remote: boolean };

async function embedAll() {
  try {
    const { pipeline } = await import("@huggingface/transformers");
    const ex = await pipeline("feature-extraction", "Xenova/bge-small-en-v1.5", { dtype: "q8" });
    const rows = await sql`SELECT id, title, company_name, location, description_md FROM jobs ORDER BY id`;
    for (let i = 0; i < rows.length; i += 16) {
      const batch = rows.slice(i, i + 16);
      const out = await ex(batch.map((r) => `${r.title} at ${r.company_name}. ${r.location ?? ""}\n${String(r.description_md).slice(0, 1500)}`), { pooling: "cls", normalize: true });
      const data = out.data as Float32Array;
      for (let b = 0; b < batch.length; b++) {
        const v = Array.from(data.slice(b * 384, (b + 1) * 384)).map((x) => x.toFixed(6));
        await sql`UPDATE jobs SET embedding = ${`[${v.join(",")}]`}::vector WHERE id = ${batch[b].id}`;
      }
    }
    console.log(`embedded ${rows.length} jobs`);
  } catch (e) {
    console.warn("embedding skipped:", (e as Error).message);
  }
}

async function seedV2(jobRows: SeedJob[], compRows: { id: number; name: string }[]) {
  await embedAll();
  const jobs = await sql`SELECT id, title, location, salary_min, salary_max, salary_currency, description_md, first_seen_at, closed_at, company_name, company_id, remote, seniority FROM jobs WHERE is_canonical ORDER BY id`;

  for (const j of jobs) {
    await sql`INSERT INTO job_events (job_id, kind, detail, at) VALUES (${j.id}, 'opened', ${sql.json({})}, ${j.first_seen_at})`;
    if (j.closed_at) await sql`INSERT INTO job_events (job_id, kind, detail, at) VALUES (${j.id}, 'closed', ${sql.json({ missed_runs: 3 })}, ${j.closed_at})`;
  }

  const tracked = jobs.filter((_, i) => i % 4 === 1).slice(0, 30);
  for (const [n, j] of tracked.entries()) {
    const base = String(j.description_md);
    const v1 = base
      .replace("Improve reliability and latency of core APIs", "Improve reliability of core APIs")
      .replace("- Open-source contributions\n", "")
      .replace("Hybrid options available.", "Onsite, 5 days a week.");
    const t1 = n % 5 === 0 ? j.title.replace("Engineer", "Developer") : j.title;
    const l1 = n % 7 === 0 ? "Bengaluru (Onsite)" : j.location;
    const s1min = j.salary_min != null && n % 3 === 0 ? j.salary_min - 300000 : j.salary_min;
    const s1max = j.salary_max != null && n % 3 === 0 ? j.salary_max - 400000 : j.salary_max;
    const t0 = new Date(j.first_seen_at).getTime();
    const at1 = new Date(t0 + 3600000);
    const at2 = new Date(Math.min(now - 3600000, t0 + (2 + (n % 5)) * day));
    await sql`INSERT INTO job_versions (job_id, content_hash, title, location, salary_min, salary_max, description_md, captured_at) VALUES
      (${j.id}, ${hash(v1 + t1)}, ${t1}, ${l1}, ${s1min}, ${s1max}, ${v1}, ${at1}),
      (${j.id}, ${hash(base + j.title)}, ${j.title}, ${j.location}, ${j.salary_min}, ${j.salary_max}, ${base}, ${at2})`;
    const fields = ["description", ...(t1 !== j.title ? ["title"] : []), ...(l1 !== j.location ? ["location"] : [])];
    const detail: Record<string, unknown> = { fields, description_delta: base.length - v1.length };
    if (t1 !== j.title) detail.title = { old: t1, new: j.title };
    if (l1 !== j.location) detail.location = { old: l1, new: j.location };
    await sql`INSERT INTO job_events (job_id, kind, detail, at) VALUES (${j.id}, 'changed', ${sql.json(detail as never)}, ${at2})`;
    if (s1min !== j.salary_min)
      await sql`INSERT INTO job_events (job_id, kind, detail, at) VALUES (${j.id}, 'salary_changed', ${sql.json({ old: { min: s1min, max: s1max }, new: { min: j.salary_min, max: j.salary_max } })}, ${at2})`;
    if (n % 9 === 4) {
      const reAt = new Date(Math.min(now - 1800000, at2.getTime() + day));
      await sql`INSERT INTO job_events (job_id, kind, detail, at) VALUES (${j.id}, 'closed', ${sql.json({ missed_runs: 3 })}, ${new Date(reAt.getTime() - day / 2)}), (${j.id}, 'reopened', ${sql.json({})}, ${reAt})`;
    }
  }

  const cityOf = (l: string | null) => (l && /bengaluru/i.test(l) ? "Bengaluru" : l && !/remote/i.test(l) ? l : null);
  const famOf = (t: string) => (/machine|ai|llm/i.test(t) ? "ml" : /frontend/i.test(t) ? "frontend" : /platform|site reliability|devops/i.test(t) ? "devops" : /data/i.test(t) ? "data" : /manager/i.test(t) ? "management" : "backend");
  const withSalary = jobs.filter((j) => j.salary_min != null);
  for (const j of jobs.filter((x) => x.salary_min == null)) {
    const sen = String(j.seniority ?? "mid");
    const baseL = { junior: 9, mid: 20, senior: 32, staff: 55, lead: 48 }[sen] ?? 20;
    const bump = famOf(j.title) === "ml" ? 1.15 : 1;
    const comps = withSalary.filter((w) => w.seniority === j.seniority).slice(0, 10);
    if (comps.length >= 3 && rand() < 0.7) {
      const vals = comps.map((c) => (Number(c.salary_min) + Number(c.salary_max)) / 2).sort((a, b) => a - b);
      const q = (p: number) => vals[Math.min(vals.length - 1, Math.floor(p * vals.length))];
      await sql`INSERT INTO salary_estimates (job_id, low, high, currency, confidence, n_comparables, basis, model) VALUES
        (${j.id}, ${Math.round(q(0.25))}, ${Math.round(q(0.75))}, 'INR', ${Math.round((0.35 + rand() * 0.4) * 100) / 100}, ${comps.length},
        ${sql.json({ group: { market: "india", family: famOf(j.title), seniority: sen }, level: 1, keys: ["market", "family", "seniority"], n: comps.length, p25: Math.round(q(0.25)), median: Math.round(q(0.5)), p75: Math.round(q(0.75)), comparable_ids: comps.map((c) => Number(c.id)) })}, 'comparables-v1')`;
    } else {
      const lo = Math.round(baseL * bump * 0.85 * 10) / 10;
      const hi = Math.round(baseL * bump * 1.45 * 10) / 10;
      await sql`INSERT INTO salary_estimates (job_id, low, high, currency, confidence, n_comparables, basis, model) VALUES
        (${j.id}, ${Math.round(lo * 100000)}, ${Math.round(hi * 100000)}, 'INR', ${Math.round((0.2 + rand() * 0.1) * 100) / 100}, 0,
        ${sql.json({ group: { market: "india", family: famOf(j.title), seniority: sen, city: cityOf(j.location), tier: 1 }, level: null, keys: ["family", "seniority", "city"], n: 0, lpa: [lo, hi], multiplier: bump })}, 'prior-v1')`;
    }
  }

  const skillCounts = (ids: number[]) => {
    const m = new Map<string, number>();
    for (const j of jobRows.filter((x) => ids.includes(x.id))) for (const s of j.skills) m.set(s.toLowerCase(), (m.get(s.toLowerCase()) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([skill, count]) => ({ skill, count }));
  };
  for (const c of compRows.slice(0, 12)) {
    const cj = jobs.filter((j) => j.company_id === c.id);
    const open = cj.filter((j) => !j.closed_at);
    if (!cj.length) continue;
    const weeks = Array.from({ length: 12 }, (_, w) => {
      const start = new Date(now - (11 - w) * 7 * day);
      const opened = cj.filter((j) => Math.abs(new Date(j.first_seen_at).getTime() - start.getTime()) < 3.5 * day).length + Math.floor(rand() * 3);
      return { week: start.toISOString().slice(0, 10), opened, closed: Math.floor(rand() * 2) };
    });
    const locs = new Map<string, number>();
    for (const j of open) locs.set(j.location ?? "Unspecified", (locs.get(j.location ?? "Unspecified") ?? 0) + 1);
    const mix: Record<string, number> = {};
    for (const j of open) mix[j.seniority ?? "unknown"] = (mix[j.seniority ?? "unknown"] ?? 0) + 1;
    const sal = open.map((j) => (j.salary_min != null ? (Number(j.salary_min) + Number(j.salary_max ?? j.salary_min)) / 2 : null)).filter((x): x is number => x != null).sort((a, b) => a - b);
    await sql`INSERT INTO company_stats (company_key, company_id, company_name, open_jobs, opened_30d, closed_30d, velocity_series, top_skills, locations, remote_share, seniority_mix, median_salary_inr, matches, updated_at) VALUES
      (${keyOf(c.name)}, ${c.id}, ${c.name}, ${open.length}, ${cj.filter((j) => now - new Date(j.first_seen_at).getTime() < 30 * day).length}, ${cj.filter((j) => j.closed_at).length},
      ${sql.json(weeks)}, ${sql.json(skillCounts(cj.map((j) => Number(j.id))))}, ${sql.json([...locs.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([location, count]) => ({ location, count })))},
      ${open.length ? open.filter((j) => j.remote).length / open.length : 0}, ${sql.json(mix)}, ${sal.length ? Math.round(sal[Math.floor(sal.length / 2)]) : null},
      ${Math.floor(open.length * 0.5)}, ${new Date(now - 2 * 3600000)})`;
  }

  const gapSkills = [
    { skill: "go", unlocked: 14, mention: 31, gain: 0.12 },
    { skill: "kafka", unlocked: 11, mention: 24, gain: 0.1 },
    { skill: "distributed systems", unlocked: 9, mention: 18, gain: 0.09 },
    { skill: "aws", unlocked: 8, mention: 22, gain: 0.07 },
    { skill: "terraform", unlocked: 6, mention: 13, gain: 0.08 },
    { skill: "java", unlocked: 5, mention: 17, gain: 0.06 },
    { skill: "pytorch", unlocked: 4, mention: 9, gain: 0.09 },
    { skill: "spark", unlocked: 3, mention: 8, gain: 0.05 },
    { skill: "vector dbs", unlocked: 3, mention: 7, gain: 0.06 },
    { skill: "prometheus", unlocked: 2, mention: 6, gain: 0.04 },
  ];
  for (const g of gapSkills) {
    const ex = jobRows.filter((j) => j.skills.some((s) => s.toLowerCase() === g.skill)).slice(0, 5).map((j) => j.id);
    await sql`INSERT INTO skill_gaps (profile_version, skill, jobs_mentioning, jobs_unlocked, avg_fit_gain, example_job_ids, updated_at) VALUES (2, ${g.skill}, ${g.mention}, ${g.unlocked}, ${g.gain}, ${sql.json(ex)}, ${new Date(now - 3 * 3600000)})`;
  }

  const stages = await sql`SELECT DISTINCT ON (f.job_id) f.job_id, f.action, f.at, j.title, j.company_name FROM feedback f JOIN jobs j ON j.id = f.job_id WHERE f.action IN ('applied','interview') ORDER BY f.job_id, f.at DESC`;
  let r = 0;
  for (const st of stages) {
    const kind = st.action === "interview" ? "interview_prep" : "follow_up";
    const due = st.action === "interview" ? new Date(now - 6 * 3600000) : new Date(new Date(st.at).getTime() + 7 * day);
    const draft =
      kind === "follow_up"
        ? `Hi ${st.company_name} team — following up on my application for ${st.title}. I'm still very interested and happy to share more about my payments and integrations work. Thanks!`
        : `Prep for ${st.title} at ${st.company_name}: review the prep pack, rehearse the webhook-idempotency story, and prepare two questions about on-call.`;
    const sent = due.getTime() < now && r % 2 === 0 ? new Date(due.getTime() + 600000) : null;
    const dismissed = r === 3 ? new Date(now - day) : null;
    await sql`INSERT INTO reminders (job_id, kind, due_at, draft, sent_at, dismissed_at) VALUES (${st.job_id}, ${kind}, ${due}, ${draft}, ${sent}, ${dismissed})`;
    r++;
  }

  const [last] = await sql`SELECT id, counts FROM runs ORDER BY started_at DESC LIMIT 1`;
  await sql`UPDATE runs SET counts = ${sql.json({
    ...(last.counts as Record<string, unknown>),
    tracking: { opened: 12, changed: tracked.length, closed: 3, salary_changed: 4, versions: tracked.length * 2 },
    salary: { estimated: jobs.length - withSalary.length, "prior-v1": 20, "comparables-v1": 40 },
    company_stats: { rows: 12, with_matches: 9 },
    skill_gaps: { skills: gapSkills.length },
    reminders_sent: { due: 4, sent: 2 },
    fetch_s: 11.9, dedup_s: 4.4, embed_s: 11.5, score_s: 38.2, salary_s: 7, company_stats_s: 5.4, skill_gaps_s: 2.7, reminders_sent_s: 0.2,
  } as never)} WHERE id = ${last.id}`;
}

main().catch(async (e) => {
  console.error(e);
  await sql.end();
  process.exit(1);
});
