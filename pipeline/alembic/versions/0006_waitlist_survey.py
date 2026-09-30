from pathlib import Path

from alembic import op

revision = "0006_waitlist_survey"
down_revision = "0005_drop_chat"
branch_labels = None
depends_on = None

SCHEMA = Path(__file__).resolve().parents[3] / "schema_v7.sql"
COLUMNS = ("search_stage", "roles", "locations", "pains", "tools", "pay_likelihood", "pay_reason", "survey_step", "survey_completed_at")


def upgrade() -> None:
    op.execute(SCHEMA.read_text())


def downgrade() -> None:
    op.execute("ALTER TABLE waitlist DROP CONSTRAINT IF EXISTS waitlist_pay_likelihood_check")
    op.execute("ALTER TABLE waitlist DROP CONSTRAINT IF EXISTS waitlist_survey_step_check")
    for c in COLUMNS:
        op.execute(f"ALTER TABLE waitlist DROP COLUMN IF EXISTS {c}")
