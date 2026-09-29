CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE companies (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    ats TEXT NOT NULL,
    slug TEXT NOT NULL,
    tier SMALLINT NOT NULL DEFAULT 2,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    last_fetched_at TIMESTAMPTZ,
    last_etag TEXT,
    UNIQUE (ats, slug)
);

CREATE TABLE jobs (
    id BIGSERIAL PRIMARY KEY,
    source TEXT NOT NULL,
    external_id TEXT NOT NULL,
    company_id INT REFERENCES companies(id),
    company_name TEXT NOT NULL,
    url TEXT NOT NULL,
    title TEXT NOT NULL,
    location TEXT,
    remote BOOLEAN NOT NULL DEFAULT FALSE,
    seniority TEXT,
    min_exp SMALLINT,
    max_exp SMALLINT,
    salary_min INT,
    salary_max INT,
    salary_currency TEXT,
    description_md TEXT NOT NULL DEFAULT '',
    posted_at TIMESTAMPTZ,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    missed_runs SMALLINT NOT NULL DEFAULT 0,
    closed_at TIMESTAMPTZ,
    content_hash TEXT NOT NULL,
    dedup_group_id BIGINT,
    is_canonical BOOLEAN NOT NULL DEFAULT TRUE,
    embedding vector(384),
    notified_at TIMESTAMPTZ,
    UNIQUE (source, external_id)
);
CREATE INDEX jobs_open_idx ON jobs (closed_at) WHERE closed_at IS NULL;
CREATE INDEX jobs_dedup_idx ON jobs (dedup_group_id);
CREATE INDEX jobs_embedding_idx ON jobs USING hnsw (embedding vector_cosine_ops);

CREATE TABLE profile (
    id SERIAL PRIMARY KEY,
    version INT NOT NULL UNIQUE,
    resume_md TEXT NOT NULL,
    resume_embedding vector(384),
    preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE scores (
    id BIGSERIAL PRIMARY KEY,
    job_id BIGINT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    profile_version INT NOT NULL,
    content_hash TEXT NOT NULL,
    model TEXT NOT NULL,
    embed_sim REAL,
    fit_score REAL,
    fit_prob REAL,
    seniority TEXT,
    seniority_match BOOLEAN,
    apply_prob REAL,
    final_score REAL,
    reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
    missing_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
    latency_ms INT,
    cost_usd NUMERIC(10,6) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (job_id, profile_version, content_hash, model)
);
CREATE INDEX scores_rank_idx ON scores (profile_version, final_score DESC);

CREATE TABLE feedback (
    id BIGSERIAL PRIMARY KEY,
    job_id BIGINT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    action TEXT NOT NULL CHECK (action IN ('up','down','saved','applied','interview','offer','rejected')),
    note TEXT,
    at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX feedback_job_idx ON feedback (job_id, at DESC);

CREATE TABLE runs (
    id BIGSERIAL PRIMARY KEY,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'running',
    counts JSONB NOT NULL DEFAULT '{}'::jsonb,
    errors JSONB NOT NULL DEFAULT '[]'::jsonb,
    cost_usd NUMERIC(10,6) NOT NULL DEFAULT 0
);

CREATE TABLE labels (
    job_id BIGINT PRIMARY KEY REFERENCES jobs(id) ON DELETE CASCADE,
    label TEXT NOT NULL CHECK (label IN ('fit','no')),
    split TEXT NOT NULL CHECK (split IN ('dev','test')),
    at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE cover_notes (
    id BIGSERIAL PRIMARY KEY,
    job_id BIGINT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    profile_version INT NOT NULL,
    body TEXT NOT NULL,
    model TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE eval_reports (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    report JSONB NOT NULL
);

CREATE TABLE settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL
);
