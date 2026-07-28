from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    database_url: str = "postgresql://cardbase:cardbase123@localhost/cardbase"
    anthropic_api_key: str = ""
    jwt_secret: str = "chave-secreta-padrao-mude-em-producao"
    jwt_expiration_hours: int = 24
    admin_username: str = "anderson"
    admin_password: str = "cardbase123"
    upload_dir: str = "./uploads"
    max_image_size_mb: int = 10

    class Config:
        env_file = ".env"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
