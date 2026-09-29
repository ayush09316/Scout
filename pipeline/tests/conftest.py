import json
import os
from pathlib import Path

os.environ["SCOUT_FAKE_EMBED"] = "1"
os.environ.setdefault("TEST_DATABASE_URL", "postgresql+psycopg://localhost/scout_test")
os.environ["DATABASE_URL"] = os.environ["TEST_DATABASE_URL"]
for key in ("OPENROUTER_API_KEY", "GEMINI_API_KEY", "GROQ_API_KEY", "OLLAMA_URL", "TELEGRAM_BOT_TOKEN", "TELEGRAM_CHAT_ID", "ADZUNA_APP_ID", "ADZUNA_APP_KEY"):
    os.environ[key] = ""

import pytest  # noqa: E402
from sqlalchemy import create_engine, text  # noqa: E402

from scout.config import get_settings  # noqa: E402

FIXTURES = Path(__file__).parent / "fixtures"
SCHEMA = Path(__file__).resolve().parents[2] / "schema.sql"


def load_fixture(name: str):
    return json.loads((FIXTURES / name).read_text())


@pytest.fixture(autouse=True)
def fresh_settings(monkeypatch):
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.fixture(scope="session")
def db_url() -> str:
    url = os.environ["TEST_DATABASE_URL"]
    engine = create_engine(url)
    with engine.begin() as conn:
        conn.execute(text("DROP SCHEMA public CASCADE; CREATE SCHEMA public;"))
        conn.exec_driver_sql(SCHEMA.read_text())
    engine.dispose()
    return url


@pytest.fixture()
def db(db_url):
    engine = create_engine(db_url)
    with engine.begin() as conn:
        conn.execute(text(
            "TRUNCATE settings, eval_reports, cover_notes, labels, runs, feedback, scores, profile, jobs, companies RESTART IDENTITY CASCADE"
        ))
    engine.dispose()
    return db_url
