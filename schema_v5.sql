CREATE TABLE IF NOT EXISTS waitlist (
    id BIGSERIAL PRIMARY KEY,
    email TEXT NOT NULL,
    email_lower TEXT GENERATED ALWAYS AS (lower(email)) STORED,
    name TEXT,
    role TEXT,
    experience TEXT,
    city TEXT,
    would_pay TEXT,
    source TEXT,
    note TEXT,
    ref_code TEXT NOT NULL,
    referred_by TEXT,
    consent BOOLEAN NOT NULL,
    ip_hash TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    unsubscribed_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS waitlist_email_lower_key ON waitlist (email_lower);
CREATE UNIQUE INDEX IF NOT EXISTS waitlist_ref_code_key ON waitlist (ref_code);
CREATE INDEX IF NOT EXISTS waitlist_referred_by_idx ON waitlist (referred_by);
CREATE INDEX IF NOT EXISTS waitlist_created_at_idx ON waitlist (created_at);
