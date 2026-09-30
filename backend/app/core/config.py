import os
from functools import lru_cache
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "EvoTwin"
    api_prefix: str = "/api"
    environment: str = "development"
    jwt_secret_key: str = Field(default_factory=lambda: os.getenv("JWT_SECRET_KEY", "dev-secret-key"))
    jwt_algorithm: str = "HS256"
    jwt_expiry_minutes: int = 60 * 24 * 7
    mongo_uri: str = Field(default_factory=lambda: os.getenv("MONGO_URI", "mongodb://localhost:27017"))
    mongo_db_name: str = Field(default_factory=lambda: os.getenv("MONGO_DB_NAME", "vitatwin"))
    chroma_persist_directory: str = Field(default_factory=lambda: os.getenv("CHROMA_PERSIST_DIR", "/tmp/vitatwin_chroma"))
    gemini_api_key: str = Field(default_factory=lambda: os.getenv("GEMINI_API_KEY", ""))
    allowed_origins: str = Field(default_factory=lambda: os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"))
    log_level: str = Field(default_factory=lambda: os.getenv("LOG_LEVEL", "INFO"))
    demo_mode: bool = Field(default_factory=lambda: os.getenv("DEMO_MODE", "true").lower() == "true")

    @property
    def allowed_origins_list(self) -> List[str]:
        return [item.strip() for item in self.allowed_origins.split(",") if item.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
