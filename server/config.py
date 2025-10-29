"""
Configuration management using Pydantic Settings
"""
from pydantic_settings import BaseSettings
from typing import List
import json


class Settings(BaseSettings):
    # Cloudflare
    cloudflare_api_key: str
    cloudflare_account_id: str
    cloudflare_api_base: str = "https://api.cloudflare.com/client/v4"
    
    # Database
    database_url: str = "sqlite:///./app.db"
    
    # JWT
    jwt_secret_key: str
    jwt_algorithm: str = "HS256"
    jwt_access_token_expire_minutes: int = 1440  # 24 hours
    
    # API
    api_v1_prefix: str = "/api"
    cors_origins: str = '["http://localhost:5173","http://localhost:3000","http://172.26.39.223:5173","http://172.26.39.223:3000","http://104.154.208.245:5173","http://104.154.208.245:8000"]'
    
    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    
    @property
    def cors_origins_list(self) -> List[str]:
        return json.loads(self.cors_origins)
    
    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()

