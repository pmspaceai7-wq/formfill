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
    PROFILE_ID: str = "default"   # v0 has no auth — one profile per install


settings = Settings()
