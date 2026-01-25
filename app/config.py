from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    bot_token: str
    webapp_url: str = ""
    database_url: str
    admin_telegram_ids: str = ""
    webapp_origin: str = "*"

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)

    @property
    def admin_ids(self) -> set[int]:
        raw = self.admin_telegram_ids.strip()
        if not raw:
            return set()
        parts = [p.strip() for p in raw.replace(";", ",").split(",") if p.strip()]
        result: set[int] = set()
        for part in parts:
            try:
                result.add(int(part))
            except ValueError:
                continue
        return result


settings = Settings()
