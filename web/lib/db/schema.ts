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
  real,
  serial,
  smallint,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

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

export type RunCounts = Partial<Record<"fetched" | "new" | "updated" | "closed" | "deduped" | "filtered" | "scored" | "notified", number>>;
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
