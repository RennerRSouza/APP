from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "sqlite:///./dev.db"
    api_key: str = "dev-key"  # sobrescrever via env em qualquer ambiente real


settings = Settings()
