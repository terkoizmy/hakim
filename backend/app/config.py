"""Application settings loaded from backend/.env (or environment).

pydantic-settings reads both the .env file and real environment variables;
real env vars win. Field names map to UPPER_CASE env vars (e.g. `db_path`
<- `DB_PATH`).
"""

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(BACKEND_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # --- Sectors API -------------------------------------------------------
    sectors_api_key: str = ""
    sectors_mode: str = "fixture"  # fixture | live
    # Base WITHOUT the /v2 prefix — REST paths already carry /v2/... (so the
    # contract's endpoint fields stay correct and the URL is not doubled).
    sectors_base_url: str = "https://api.sectors.app"

    # --- LLM (Ollama cloud, OpenAI-compatible) -----------------------------
    ollama_base_url: str = "https://ollama.com/v1"
    ollama_api_key: str = ""
    model_analyst: str = "deepseek-v4-flash"
    model_debate: str = "deepseek-v4-flash"
    model_judge: str = "deepseek-v4-flash"

    # --- App ---------------------------------------------------------------
    trial_timeout_seconds: int = 300
    cache_ttl_days: int = 7
    db_path: str = str(BACKEND_DIR / "data" / "sidang.db")
    cors_origins: str = "http://localhost:5173"
    # When the LLM is unreachable / not configured, fall back to deterministic
    # template generation so the pipeline still completes (fixture demos).
    llm_fallback_template: bool = True
    version: str = "0.1.0"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def effective_mode(self) -> str:
        """Resolve 'auto' to the configured SECTORS_MODE."""
        return self.sectors_mode


@lru_cache
def get_settings() -> Settings:
    return Settings()
