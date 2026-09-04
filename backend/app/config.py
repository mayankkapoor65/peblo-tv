from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from typing import Optional
from pathlib import Path

class Settings(BaseSettings):
    PROJECT_NAME: str = "Peblo TV Mini API"
    VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api"
    
    # Environment
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    
    # Database
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://postgres:postgres@localhost:5432/peblo_tv",
        description="Async database connection string"
    )
    SYNC_DATABASE_URL: str = Field(
        default="postgresql://postgres:postgres@localhost:5432/peblo_tv",
        description="Sync database connection string for Alembic"
    )
    
    # Storage Configuration
    STORAGE_BACKEND: str = Field(default="local", description="'local' or 's3'")
    STORAGE_LOCAL_DIR: str = Field(
        default=str(Path(__file__).resolve().parent.parent.parent / "storage_data"),
        description="Local directory for file storage"
    )
    STORAGE_PUBLIC_URL_PREFIX: str = Field(
        default="/storage",
        description="Prefix for locally served storage items"
    )
    
    # S3 / MinIO / Cloudflare R2 settings
    S3_ENDPOINT_URL: Optional[str] = None
    S3_ACCESS_KEY: Optional[str] = None
    S3_SECRET_KEY: Optional[str] = None
    S3_BUCKET_NAME: str = "peblo-tv-catalog"
    S3_REGION_NAME: str = "auto"
    S3_PUBLIC_BASE_URL: Optional[str] = None
    
    # Security / Auth
    SECRET_KEY: str = "peblo-tv-secret-key-change-in-production-super-secure"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day
    
    # Catalog settings
    CATALOG_FILE_PATH: str = "catalog/catalog.json"
    
    # CORS
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
    ]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
