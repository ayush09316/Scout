from pathlib import Path

from alembic import op

revision = "0002_insights"
down_revision = "0001_initial"
branch_labels = None
depends_on = None

SCHEMA = Path(__file__).resolve().parents[3] / "schema_v2.sql"
TABLES = ["chat_messages", "reminders", "interview_packs", "resume_variants", "skill_gaps", "company_stats",
          "salary_estimates", "job_events", "job_versions"]


def upgrade() -> None:
    op.execute(SCHEMA.read_text())


def downgrade() -> None:
    for table in TABLES:
        op.execute(f"DROP TABLE IF EXISTS {table} CASCADE")
    op.execute("DROP INDEX IF EXISTS jobs_search_idx")
    op.execute("ALTER TABLE jobs DROP COLUMN IF EXISTS search_tsv")
