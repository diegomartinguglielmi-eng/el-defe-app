from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    database_url: str = "sqlite:///./el_defe.db"
    secret_key: str = "dev-secret-change-me"
    access_token_minutes: int = 720
    admin_email: str = "admin@elde.fe"
    admin_password: str = "Cambiar123!"
    sync_hour: int = 7
    sync_minute: int = 30
    allowed_origins: str = "capacitor://localhost,http://localhost,https://localhost"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def origins(self):
        return [x.strip() for x in self.allowed_origins.split(",") if x.strip()]

settings = Settings()
