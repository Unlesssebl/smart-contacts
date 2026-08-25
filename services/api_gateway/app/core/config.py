from pydantic import computed_field
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional

class Settings(BaseSettings):
    PROJECT_NAME: str = "Smart Contacts API Gateway"
    API_V1_STR: str = "/api/v1"
    ALLOWED_ORIGINS: str = "http://localhost,http://localhost:5173,http://127.0.0.1:5173"
    TRUSTED_PROXIES: str = "127.0.0.1,172.28.10.0/24,172.18.128.32"

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

    # Database Connection Pool
    DB_POOL_SIZE: int = 20
    DB_MAX_OVERFLOW: int = 10
    DB_POOL_RECYCLE: int = 300

    # Redis
    REDIS_HOST: str = "redis"
    REDIS_PORT: int = 6379

    # Brute-force Protection (Progressive ban + Permanent Lockout)
    BRUTE_FORCE_MAX_ATTEMPTS: int = 5
    BRUTE_FORCE_BASE_BAN_SECONDS: int = 180  # 3 minutes
    BRUTE_FORCE_MAX_BAN_SECONDS: int = 3600  # 1 hour
    BRUTE_FORCE_WINDOW_SECONDS: int = 7200  # 2 hours window
    BRUTE_FORCE_PERMANENT_ATTEMPTS: int = 15  # >= 15 failed attempts triggers permanent ban
    BRUTE_FORCE_HELPDESK_PHONE: str = "49-87"

    # JWT
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    COOKIE_SECURE: bool = False

    # Initial admins (comma separated list of samAccountNames)
    INIT_ADMINS: str = ""
    ADMINS: str = ""

    # LDAP / AD
    AD_SERVER: str
    AD_BASE_DN: str
    AD_CA_CERT_PATH: Optional[str] = None
    AD_INSECURE_SKIP_VERIFY: bool = False
    
    # Kerberos
    KRB5_KEYTAB: str = "/etc/krb5.keytab"
    KRB5_SERVICE_NAME: str = "HTTP"

    # Development Account (Bypass AD)
    DEV_USER: Optional[str] = None
    DEV_PASSWORD: Optional[str] = None

    model_config = SettingsConfigDict(
        case_sensitive=True,
        extra="ignore"
    )

settings = Settings()
