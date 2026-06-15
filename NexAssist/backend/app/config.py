from functools import lru_cache
import json

from pydantic import AnyHttpUrl, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class SupabaseSettings(BaseSettings):
    url: AnyHttpUrl
    anon_key: str
    service_key: str


class GroqSettings(BaseSettings):
    api_key: str
    chat_model: str
    vision_model: str
    whisper_model: str


class ChromaSettings(BaseSettings):
    persist_dir: str
    collection_manual: str
    collection_cases: str


class EmbeddingsSettings(BaseSettings):
    model_name: str


class AppSettings(BaseSettings):
    env: str
    version: str
    cors_origins: list[str] = Field(default_factory=list)

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value: str | list[str]) -> list[str]:
        if isinstance(value, str):
            stripped = value.strip()
            if stripped.startswith("["):
                parsed = json.loads(stripped)
                return [str(origin) for origin in parsed]
            return [origin.strip() for origin in stripped.split(",") if origin.strip()]
        return value


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_nested_delimiter="__",
        case_sensitive=False,
        extra="ignore",
    )

    supabase: SupabaseSettings
    groq: GroqSettings
    chroma: ChromaSettings
    embeddings: EmbeddingsSettings
    app: AppSettings

    @property
    def cors_origins(self) -> list[str]:
        return self.app.cors_origins

    @property
    def version(self) -> str:
        return self.app.version

    @property
    def env(self) -> str:
        return self.app.env


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
