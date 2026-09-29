ALTER TABLE jobs ADD COLUMN IF NOT EXISTS workable_from_india BOOLEAN;
CREATE INDEX IF NOT EXISTS jobs_workable_idx ON jobs (workable_from_india) WHERE closed_at IS NULL;
