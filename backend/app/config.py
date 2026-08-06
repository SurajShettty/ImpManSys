from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator


def _parse_bool(value):
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in ("true", "1", "yes", "debug")
    return bool(value)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Implementation Management System"
    debug: bool = False
    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24  # 1 day

    db_host: str = "db"
    db_port: int = 5432
    db_user: str = "ims"
    db_password: str = "ims"
    db_name: str = "ims"

    documents_dir: str = "documents"
    max_document_size_mb: int = 20

    @field_validator("debug", mode="before")
    @classmethod
    def _debug_bool(cls, value):
        return _parse_bool(value)

    @property
    def database_url(self) -> str:
        return (
            f"postgresql+psycopg://{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}"
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
