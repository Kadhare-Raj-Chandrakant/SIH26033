"""
SIH26033 AI Service Configuration
----------------------------------
Central configuration loaded from environment variables with safe defaults.
"""

import os
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    SERVICE_NAME: str = "SIH26033 AI Foundation Service"
    VERSION: str = "1.0.0"
    HOST: str = "127.0.0.1"
    PORT: int = 8080
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"

    # Base paths
    BASE_DIR: Path = Path(__file__).resolve().parent.parent.parent
    ARTIFACTS_DIR: Path = BASE_DIR / "artifacts"
    DATA_DIR: Path = BASE_DIR / "data"

    # Internal API Secret for NestJS ↔ FastAPI communication (optional defense-in-depth)
    AI_SERVICE_INTERNAL_KEY: str = "sih26033_internal_ai_token_secret"

    model_config = SettingsConfigDict(env_prefix="AI_", extra="ignore")

settings = Settings()
