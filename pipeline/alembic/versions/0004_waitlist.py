from pathlib import Path

from alembic import op

revision = "0004_waitlist"
down_revision = "0003_workable"
branch_labels = None
depends_on = None

SCHEMA = Path(__file__).resolve().parents[3] / "schema_v5.sql"


def upgrade() -> None:
    op.execute(SCHEMA.read_text())


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS waitlist")
