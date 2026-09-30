from pathlib import Path

from alembic import op

revision = "0005_drop_chat"
down_revision = "0004_waitlist"
branch_labels = None
depends_on = None

SCHEMA = Path(__file__).resolve().parents[3] / "schema_v6.sql"


def upgrade() -> None:
    op.execute(SCHEMA.read_text())


def downgrade() -> None:
    op.execute(
        "CREATE TABLE IF NOT EXISTS chat_messages (id BIGSERIAL PRIMARY KEY, session_id TEXT NOT NULL, "
        "role TEXT NOT NULL CHECK (role IN ('user','assistant','tool')), content TEXT NOT NULL, "
        "tool_calls JSONB NOT NULL DEFAULT '[]'::jsonb, created_at TIMESTAMPTZ NOT NULL DEFAULT now())"
    )
