from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

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
    MONGODB_DB_NAME: str = "formfill"

    # JWT
    JWT_SECRET_KEY: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440   # 24 hours

    # Single admin account — provisioned from env on startup, not through
    # any signup form. Changing these values here and restarting the API
    # updates the admin's credentials.
    ADMIN_EMAIL: str = ""
    ADMIN_PASSWORD: str = ""
    ADMIN_NAME: str = "Administrator"

    # Public email providers that do not count as a "business" account.
    # Accounts can only be created by the admin with an email whose domain
    # is NOT in this list. Comma-separated, case-insensitive.
    BLOCKED_EMAIL_DOMAINS: str = (
        "gmail.com,googlemail.com,yahoo.com,yahoo.co.in,ymail.com,"
        "outlook.com,hotmail.com,hotmail.co.uk,live.com,msn.com,"
        "icloud.com,me.com,mac.com,aol.com,protonmail.com,proton.me,"
        "gmx.com,zoho.com,mail.com,yandex.com,rediffmail.com"
    )

    @property
    def blocked_email_domains(self) -> set[str]:
        return {
            d.strip().lower()
            for d in self.BLOCKED_EMAIL_DOMAINS.split(",")
            if d.strip()
        }


settings = Settings()
