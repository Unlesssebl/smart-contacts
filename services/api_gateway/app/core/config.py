from pydantic import computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "Smart Contacts API"
    API_V1_STR: str = "/api/v1"

    # PostgreSQL (Required)
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    DB_HOST: str
    DB_PORT: int = 5432

    @computed_field
    @property
    def SQLALCHEMY_DATABASE_URI(self) -> str:
        import urllib.parse
        password = urllib.parse.quote_plus(self.POSTGRES_PASSWORD)
        return f"postgresql://{self.POSTGRES_USER}:{password}@{self.DB_HOST}:{self.DB_PORT}/{self.POSTGRES_DB}"

    # Redis
    REDIS_HOST: str = "redis"
    REDIS_PORT: int = 6379

    # JWT
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Initial admins (comma separated list of samAccountNames)
    INIT_ADMINS: str = ""

    # LDAP / AD
    AD_SERVER: str
    AD_BASE_DN: str
    AD_USER: Optional[str] = None
    AD_PASSWORD: Optional[str] = None
    
    # Kerberos
    KRB5_KEYTAB: str = "/etc/krb5.keytab"
    KRB5_SERVICE_NAME: str = "HTTP"

    model_config = SettingsConfigDict(
        case_sensitive=True,
        extra="ignore"
    )

settings = Settings()
