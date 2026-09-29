from pathlib import Path

from alembic import op

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None

SCHEMA = Path(__file__).resolve().parents[3] / "schema.sql"
TABLES = ["settings", "eval_reports", "cover_notes", "labels", "runs", "feedback", "scores", "profile", "jobs", "companies"]


def upgrade() -> None:
    op.execute(SCHEMA.read_text())


def downgrade() -> None:
    for table in TABLES:
        op.execute(f"DROP TABLE IF EXISTS {table} CASCADE")
