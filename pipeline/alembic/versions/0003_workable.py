from pathlib import Path

from alembic import op

revision = "0003_workable"
down_revision = "0002_insights"
branch_labels = None
depends_on = None

SCHEMA = Path(__file__).resolve().parents[3] / "schema_v3.sql"


def upgrade() -> None:
    op.execute(SCHEMA.read_text())


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS jobs_workable_idx")
    op.execute("ALTER TABLE jobs DROP COLUMN IF EXISTS workable_from_india")
