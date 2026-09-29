from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

PIPELINE_DIR = Path(__file__).resolve().parent.parent
REPO_DIR = PIPELINE_DIR.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(str(REPO_DIR / ".env"), str(PIPELINE_DIR / ".env")),
        extra="ignore",
    )

    database_url: str = "postgresql+psycopg://localhost/scout"
    openrouter_api_key: str | None = None
    gemini_api_key: str | None = None
    groq_api_key: str | None = None
    ollama_url: str | None = None
    ollama_model: str = "llama3.1:8b"
    telegram_bot_token: str | None = None
    telegram_chat_id: str | None = None
    telegram_webhook_secret: str | None = None
    adzuna_app_id: str | None = None
    adzuna_app_key: str | None = None
    max_daily_cost_usd: float = 0.5
    scout_fake_embed: bool = False
    embed_model: str = "BAAI/bge-small-en-v1.5"
    scorer_chain: str = "jev,gemini,groq,local,heuristic"
    prefilter_top_k: int = 60
    notify_top_n: int = 10
    close_after_missed: int = 3
    companies_file: Path = REPO_DIR / "companies.yaml"
    metrics_file: Path = REPO_DIR / "metrics" / "latest.json"
    web_url: str = "http://localhost:3000"
    user_agent: str = "ScoutBot/0.1 (personal job search)"
    http_timeout: float = 30.0
    per_host_concurrency: int = 6


@lru_cache
def get_settings() -> Settings:
    return Settings()
