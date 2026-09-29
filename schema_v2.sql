ALTER TABLE jobs ADD COLUMN IF NOT EXISTS search_tsv tsvector
    GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(company_name, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(location, '')), 'B') ||
        setweight(to_tsvector('english', left(coalesce(description_md, ''), 20000)), 'C')
    ) STORED;
CREATE INDEX IF NOT EXISTS jobs_search_idx ON jobs USING gin (search_tsv);

CREATE TABLE IF NOT EXISTS job_versions (
    id BIGSERIAL PRIMARY KEY,
    job_id BIGINT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    content_hash TEXT NOT NULL,
    title TEXT NOT NULL,
    location TEXT,
    salary_min INT,
    salary_max INT,
    description_md TEXT NOT NULL,
    captured_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (job_id, content_hash)
);
CREATE INDEX IF NOT EXISTS job_versions_job_idx ON job_versions (job_id, captured_at DESC);

CREATE TABLE IF NOT EXISTS job_events (
    id BIGSERIAL PRIMARY KEY,
    job_id BIGINT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('opened','changed','closed','reopened','salary_changed')),
    detail JSONB NOT NULL DEFAULT '{}'::jsonb,
    at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS job_events_job_idx ON job_events (job_id, at DESC);
CREATE INDEX IF NOT EXISTS job_events_at_idx ON job_events (at DESC);

CREATE TABLE IF NOT EXISTS salary_estimates (
    job_id BIGINT PRIMARY KEY REFERENCES jobs(id) ON DELETE CASCADE,
    low INT NOT NULL,
    high INT NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    confidence REAL NOT NULL,
    n_comparables INT NOT NULL DEFAULT 0,
    basis JSONB NOT NULL DEFAULT '{}'::jsonb,
    model TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS company_stats (
    company_key TEXT PRIMARY KEY,
    company_id INT REFERENCES companies(id) ON DELETE SET NULL,
    company_name TEXT NOT NULL,
    open_jobs INT NOT NULL DEFAULT 0,
    opened_30d INT NOT NULL DEFAULT 0,
    closed_30d INT NOT NULL DEFAULT 0,
    velocity_series JSONB NOT NULL DEFAULT '[]'::jsonb,
    top_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
    locations JSONB NOT NULL DEFAULT '[]'::jsonb,
    remote_share REAL NOT NULL DEFAULT 0,
    seniority_mix JSONB NOT NULL DEFAULT '{}'::jsonb,
    median_salary_inr INT,
    matches INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS skill_gaps (
    profile_version INT NOT NULL,
    skill TEXT NOT NULL,
    jobs_mentioning INT NOT NULL,
    jobs_unlocked INT NOT NULL,
    avg_fit_gain REAL NOT NULL DEFAULT 0,
    example_job_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (profile_version, skill)
);

CREATE TABLE IF NOT EXISTS resume_variants (
    id BIGSERIAL PRIMARY KEY,
    job_id BIGINT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    profile_version INT NOT NULL,
    body_md TEXT NOT NULL,
    keyword_before REAL NOT NULL,
    keyword_after REAL NOT NULL,
    added_keywords JSONB NOT NULL DEFAULT '[]'::jsonb,
    model TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS resume_variants_job_idx ON resume_variants (job_id, created_at DESC);

CREATE TABLE IF NOT EXISTS interview_packs (
    id BIGSERIAL PRIMARY KEY,
    job_id BIGINT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    profile_version INT NOT NULL,
    body JSONB NOT NULL,
    model TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS interview_packs_job_idx ON interview_packs (job_id, created_at DESC);

CREATE TABLE IF NOT EXISTS reminders (
    id BIGSERIAL PRIMARY KEY,
    job_id BIGINT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    kind TEXT NOT NULL CHECK (kind IN ('follow_up','interview_prep','offer_deadline')),
    due_at TIMESTAMPTZ NOT NULL,
    draft TEXT,
    sent_at TIMESTAMPTZ,
    dismissed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (job_id, kind, due_at)
);
CREATE INDEX IF NOT EXISTS reminders_due_idx ON reminders (due_at) WHERE sent_at IS NULL AND dismissed_at IS NULL;

CREATE TABLE IF NOT EXISTS chat_messages (
    id BIGSERIAL PRIMARY KEY,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user','assistant','tool')),
    content TEXT NOT NULL,
    tool_calls JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS chat_messages_session_idx ON chat_messages (session_id, created_at);
