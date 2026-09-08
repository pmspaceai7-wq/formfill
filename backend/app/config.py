from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    AI_API_KEY: str = ""
    AI_BASE_URL: str = "https://api.groq.com/openai/v1"
    AI_MODEL: str = "qwen/qwen3.8-27b"
    DATA_DIR: str = "../data"
    FRONTEND_ORIGIN: str = "http://localhost:3000"
    MAX_UPLOAD_MB: int = 50
    FILL_MODE: str = "local"   # "local" = extract+match, "ai" = API call
    PROFILE_ID: str = "default"   # fallback profile when no auth

    # MongoDB
    MONGODB_URI: str = ""
    MONGODB_DB_NAME: str = "spacefill"

    # JWT
    JWT_SECRET_KEY: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440   # 24 hours


settings = Settings()
