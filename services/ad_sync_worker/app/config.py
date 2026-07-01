from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, computed_field


class Settings(BaseSettings):
    # Active Directory
    AD_SERVER: str = Field(..., description="LDAP address of domain controller")
    AD_USER: str = Field(..., description="Service account DN")
    AD_PASSWORD: str = Field(..., description="Service account password")
    AD_BASE_DN: str = Field(..., description="Base DN for search")
    AD_INSECURE_SKIP_VERIFY: bool = False
    
    AD_PULL_INTERVAL_SECONDS: int = 3600
    AD_MAX_RETRIES: int = 5
    AD_RETRY_BASE_SECONDS: int = 10
    
    # Database
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    DB_HOST: str
    DB_PORT: int

    @computed_field
    @property
    def DATABASE_URL(self) -> str:
        import urllib.parse
        password = urllib.parse.quote_plus(self.POSTGRES_PASSWORD)
        return f"postgresql://{self.POSTGRES_USER}:{password}@{self.DB_HOST}:{self.DB_PORT}/{self.POSTGRES_DB}"
    
    # Paths
    CN_LIST_PATH: str = "docs/CN.md"
    
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
