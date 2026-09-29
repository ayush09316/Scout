import {
  bigint,
  bigserial,
  boolean,
  customType,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  real,
  serial,
  smallint,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return "vector(384)";
  },
  toDriver(v) {
    return `[${v.join(",")}]`;
  },
  fromDriver(v) {
    return v.slice(1, -1).split(",").map(Number);
  },
});

const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

const tz = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

export const companies = pgTable(
  "companies",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    ats: text("ats").notNull(),
    slug: text("slug").notNull(),
    tier: smallint("tier").notNull().default(2),
    active: boolean("active").notNull().default(true),
    lastFetchedAt: tz("last_fetched_at"),
    lastEtag: text("last_etag"),
  },
  (t) => [unique().on(t.ats, t.slug)],
);

export const jobs = pgTable(
  "jobs",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    source: text("source").notNull(),
    externalId: text("external_id").notNull(),
    companyId: integer("company_id").references(() => companies.id),
    companyName: text("company_name").notNull(),
    url: text("url").notNull(),
    title: text("title").notNull(),
    location: text("location"),
    remote: boolean("remote").notNull().default(false),
    seniority: text("seniority"),
    minExp: smallint("min_exp"),
    maxExp: smallint("max_exp"),
    salaryMin: integer("salary_min"),
    salaryMax: integer("salary_max"),
    salaryCurrency: text("salary_currency"),
    descriptionMd: text("description_md").notNull().default(""),
    postedAt: tz("posted_at"),
    firstSeenAt: tz("first_seen_at").notNull().defaultNow(),
    lastSeenAt: tz("last_seen_at").notNull().defaultNow(),
    missedRuns: smallint("missed_runs").notNull().default(0),
    closedAt: tz("closed_at"),
    contentHash: text("content_hash").notNull(),
    dedupGroupId: bigint("dedup_group_id", { mode: "number" }),
    isCanonical: boolean("is_canonical").notNull().default(true),
    embedding: vector("embedding"),
    notifiedAt: tz("notified_at"),
  workableFromIndia: boolean("workable_from_india"),
    searchTsv: tsvector("search_tsv").generatedAlwaysAs(
      sql`setweight(to_tsvector('english', coalesce(title, '')), 'A') || setweight(to_tsvector('english', coalesce(company_name, '')), 'B') || setweight(to_tsvector('english', coalesce(location, '')), 'B') || setweight(to_tsvector('english', left(coalesce(description_md, ''), 20000)), 'C')`,
    ),
  },
  (t) => [unique().on(t.source, t.externalId), index("jobs_dedup_idx").on(t.dedupGroupId)],
);

export const profile = pgTable("profile", {
  id: serial("id").primaryKey(),
  version: integer("version").notNull().unique(),
  resumeMd: text("resume_md").notNull(),
  resumeEmbedding: vector("resume_embedding"),
  preferences: jsonb("preferences").$type<Preferences>().notNull().default({}),
  createdAt: tz("created_at").notNull().defaultNow(),
});

export const scores = pgTable(
  "scores",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    jobId: bigint("job_id", { mode: "number" })
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    profileVersion: integer("profile_version").notNull(),
    contentHash: text("content_hash").notNull(),
    model: text("model").notNull(),
    embedSim: real("embed_sim"),
    fitScore: real("fit_score"),
    fitProb: real("fit_prob"),
    seniority: text("seniority"),
    seniorityMatch: boolean("seniority_match"),
    applyProb: real("apply_prob"),
    finalScore: real("final_score"),
    reasons: jsonb("reasons").$type<string[]>().notNull().default([]),
    missingSkills: jsonb("missing_skills").$type<string[]>().notNull().default([]),
    latencyMs: integer("latency_ms"),
    costUsd: numeric("cost_usd", { precision: 10, scale: 6 }).notNull().default("0"),
    createdAt: tz("created_at").notNull().defaultNow(),
  },
  (t) => [unique().on(t.jobId, t.profileVersion, t.contentHash, t.model)],
);

export const FEEDBACK_ACTIONS = ["up", "down", "saved", "applied", "interview", "offer", "rejected"] as const;
export type FeedbackAction = (typeof FEEDBACK_ACTIONS)[number];

export const feedback = pgTable("feedback", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  jobId: bigint("job_id", { mode: "number" })
    .notNull()
    .references(() => jobs.id, { onDelete: "cascade" }),
  action: text("action").$type<FeedbackAction>().notNull(),
  note: text("note"),
  at: tz("at").notNull().defaultNow(),
});

export type RunCounts = Partial<Record<"fetched" | "new" | "updated" | "closed" | "deduped" | "filtered" | "scored" | "notified" | "versions" | "events" | "salary_estimates" | "company_stats" | "skill_gaps" | "reminders_sent", number>>;
export type RunError = { source: string; message: string; at?: string };

export const runs = pgTable("runs", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  startedAt: tz("started_at").notNull().defaultNow(),
  finishedAt: tz("finished_at"),
  status: text("status").notNull().default("running"),
  counts: jsonb("counts").$type<RunCounts>().notNull().default({}),
  errors: jsonb("errors").$type<RunError[]>().notNull().default([]),
  costUsd: numeric("cost_usd", { precision: 10, scale: 6 }).notNull().default("0"),
});

export const labels = pgTable("labels", {
  jobId: bigint("job_id", { mode: "number" })
    .primaryKey()
    .references(() => jobs.id, { onDelete: "cascade" }),
  label: text("label").$type<"fit" | "no">().notNull(),
  split: text("split").$type<"dev" | "test">().notNull(),
  at: tz("at").notNull().defaultNow(),
});

export const coverNotes = pgTable("cover_notes", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  jobId: bigint("job_id", { mode: "number" })
    .notNull()
    .references(() => jobs.id, { onDelete: "cascade" }),
  profileVersion: integer("profile_version").notNull(),
  body: text("body").notNull(),
  model: text("model").notNull(),
  createdAt: tz("created_at").notNull().defaultNow(),
});

export type ScorerMetrics = { p_at_10: number; recall_at_50: number; ece: number; p50_ms: number; usd_per_1k: number };
export type EvalReport = {
  scorers: Record<string, ScorerMetrics>;
  calibration: { bin: number; predicted: number; observed: number; count?: number }[];
  n_dev?: number;
  n_test?: number;
};

export const evalReports = pgTable("eval_reports", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  createdAt: tz("created_at").notNull().defaultNow(),
  report: jsonb("report").$type<EvalReport>().notNull(),
});

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
});

export type Preferences = {
  roles?: string[];
  locations?: string[];
  remote?: "any" | "remote_only" | "onsite_ok" | boolean;
  min_exp?: number;
  max_exp?: number;
  dealbreakers?: string[];
  skills?: string[];
  name?: string;
};

export const jobVersions = pgTable(
  "job_versions",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    jobId: bigint("job_id", { mode: "number" })
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    contentHash: text("content_hash").notNull(),
    title: text("title").notNull(),
    location: text("location"),
    salaryMin: integer("salary_min"),
    salaryMax: integer("salary_max"),
    descriptionMd: text("description_md").notNull(),
    capturedAt: tz("captured_at").notNull().defaultNow(),
  },
  (t) => [unique().on(t.jobId, t.contentHash), index("job_versions_job_idx").on(t.jobId, t.capturedAt.desc())],
);

export const JOB_EVENT_KINDS = ["opened", "changed", "closed", "reopened", "salary_changed"] as const;
export type JobEventKind = (typeof JOB_EVENT_KINDS)[number];

export const jobEvents = pgTable(
  "job_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    jobId: bigint("job_id", { mode: "number" })
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    kind: text("kind").$type<JobEventKind>().notNull(),
    detail: jsonb("detail").$type<Record<string, unknown>>().notNull().default({}),
    at: tz("at").notNull().defaultNow(),
  },
  (t) => [index("job_events_job_idx").on(t.jobId, t.at.desc()), index("job_events_at_idx").on(t.at.desc())],
);

export type SalaryBasis = { method?: string; title_bucket?: string; seniority?: string; city?: string; comparables?: number[]; note?: string; [k: string]: unknown };

export const salaryEstimates = pgTable("salary_estimates", {
  jobId: bigint("job_id", { mode: "number" })
    .primaryKey()
    .references(() => jobs.id, { onDelete: "cascade" }),
  low: integer("low").notNull(),
  high: integer("high").notNull(),
  currency: text("currency").notNull().default("INR"),
  confidence: real("confidence").notNull(),
  nComparables: integer("n_comparables").notNull().default(0),
  basis: jsonb("basis").$type<SalaryBasis>().notNull().default({}),
  model: text("model").notNull(),
  createdAt: tz("created_at").notNull().defaultNow(),
});

export type VelocityPoint = { week: string; opened: number; closed: number };

export const companyStats = pgTable("company_stats", {
  companyKey: text("company_key").primaryKey(),
  companyId: integer("company_id").references(() => companies.id, { onDelete: "set null" }),
  companyName: text("company_name").notNull(),
  openJobs: integer("open_jobs").notNull().default(0),
  opened30d: integer("opened_30d").notNull().default(0),
  closed30d: integer("closed_30d").notNull().default(0),
  velocitySeries: jsonb("velocity_series").$type<VelocityPoint[]>().notNull().default([]),
  topSkills: jsonb("top_skills").$type<({ skill: string; count: number } | string)[]>().notNull().default([]),
  locations: jsonb("locations").$type<({ location: string; count: number } | string)[]>().notNull().default([]),
  remoteShare: real("remote_share").notNull().default(0),
  seniorityMix: jsonb("seniority_mix").$type<Record<string, number>>().notNull().default({}),
  medianSalaryInr: integer("median_salary_inr"),
  matches: integer("matches").notNull().default(0),
  updatedAt: tz("updated_at").notNull().defaultNow(),
});

export const skillGaps = pgTable(
  "skill_gaps",
  {
    profileVersion: integer("profile_version").notNull(),
    skill: text("skill").notNull(),
    jobsMentioning: integer("jobs_mentioning").notNull(),
    jobsUnlocked: integer("jobs_unlocked").notNull(),
    avgFitGain: real("avg_fit_gain").notNull().default(0),
    exampleJobIds: jsonb("example_job_ids").$type<number[]>().notNull().default([]),
    updatedAt: tz("updated_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.profileVersion, t.skill] })],
);

export const resumeVariants = pgTable(
  "resume_variants",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    jobId: bigint("job_id", { mode: "number" })
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    profileVersion: integer("profile_version").notNull(),
    bodyMd: text("body_md").notNull(),
    keywordBefore: real("keyword_before").notNull(),
    keywordAfter: real("keyword_after").notNull(),
    addedKeywords: jsonb("added_keywords").$type<string[]>().notNull().default([]),
    model: text("model").notNull(),
    createdAt: tz("created_at").notNull().defaultNow(),
  },
  (t) => [index("resume_variants_job_idx").on(t.jobId, t.createdAt.desc())],
);

export type PrepCategory = "technical" | "system_design" | "behavioral" | "company";
export type PrepPack = {
  questions: { q: string; why: string; category: PrepCategory }[];
  talking_points: { skill: string; story_from_resume: string }[];
  company_notes: string[];
  questions_to_ask: string[];
};

export const interviewPacks = pgTable(
  "interview_packs",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    jobId: bigint("job_id", { mode: "number" })
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    profileVersion: integer("profile_version").notNull(),
    body: jsonb("body").$type<PrepPack>().notNull(),
    model: text("model").notNull(),
    createdAt: tz("created_at").notNull().defaultNow(),
  },
  (t) => [index("interview_packs_job_idx").on(t.jobId, t.createdAt.desc())],
);

export const REMINDER_KINDS = ["follow_up", "interview_prep", "offer_deadline"] as const;
export type ReminderKind = (typeof REMINDER_KINDS)[number];

export const reminders = pgTable(
  "reminders",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    jobId: bigint("job_id", { mode: "number" })
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    kind: text("kind").$type<ReminderKind>().notNull(),
    dueAt: tz("due_at").notNull(),
    draft: text("draft"),
    sentAt: tz("sent_at"),
    dismissedAt: tz("dismissed_at"),
    createdAt: tz("created_at").notNull().defaultNow(),
  },
  (t) => [unique().on(t.jobId, t.kind, t.dueAt)],
);

export type ChatRole = "user" | "assistant" | "tool";

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    sessionId: text("session_id").notNull(),
    role: text("role").$type<ChatRole>().notNull(),
    content: text("content").notNull(),
    toolCalls: jsonb("tool_calls").$type<unknown[]>().notNull().default([]),
    createdAt: tz("created_at").notNull().defaultNow(),
  },
  (t) => [index("chat_messages_session_idx").on(t.sessionId, t.createdAt)],
);
