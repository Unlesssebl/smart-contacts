from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, computed_field
from typing import Optional


class Settings(BaseSettings):
    # Active Directory
    AD_SERVER: str = Field(..., description="LDAP address of domain controller")
    AD_BASE_DN: str = Field(..., description="Base DN for search")
    AD_CA_CERT_PATH: Optional[str] = None
    AD_INSECURE_SKIP_VERIFY: bool = False
    
    # Secret Key for decrypting settings
    SECRET_KEY: str
    
    AD_PULL_INTERVAL_SECONDS: int = 3600
    AD_MAX_RETRIES: int = 5
    AD_RETRY_BASE_SECONDS: int = 10
    
    # Database
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    DB_HOST: str
    DB_PORT: int

    # Redis
    REDIS_HOST: str
    REDIS_PORT: int = 6379

    @computed_field
    @property
    def DATABASE_URL(self) -> str:
        import urllib.parse
        password = urllib.parse.quote_plus(self.POSTGRES_PASSWORD)
        return f"postgresql://{self.POSTGRES_USER}:{password}@{self.DB_HOST}:{self.DB_PORT}/{self.POSTGRES_DB}"
    
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
