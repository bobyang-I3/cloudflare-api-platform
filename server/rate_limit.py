"""
Rate limiting configuration using slowapi
"""
from slowapi import Limiter
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from fastapi import Request, Response
from fastapi.responses import JSONResponse
import redis
from typing import Optional
import os

# Try to connect to Redis, fall back to in-memory storage
redis_url = os.getenv("REDIS_URL", "redis://localhost:6379")
redis_client: Optional[redis.Redis] = None

try:
    redis_client = redis.from_url(redis_url, decode_responses=True)
    redis_client.ping()  # Test connection
    print(f"✅ Connected to Redis at {redis_url}")
    storage_backend = f"redis://{redis_url.split('://')[1]}"
except Exception as e:
    print(f"⚠️  Redis not available ({e}), using in-memory rate limiting")
    storage_backend = None

# Create limiter
# If Redis is available, use it for distributed rate limiting
# Otherwise, use in-memory storage (only works for single process)
if storage_backend:
    limiter = Limiter(
        key_func=get_remote_address,
        storage_uri=storage_backend,
        strategy="fixed-window"
    )
else:
    limiter = Limiter(
        key_func=get_remote_address,
        strategy="fixed-window"
    )

# Custom rate limit exceeded handler
def rate_limit_exceeded_handler(request: Request, exc: RateLimitExceeded) -> Response:
    """
    Custom handler for rate limit exceeded errors
    """
    return JSONResponse(
        status_code=429,
        content={
            "detail": "Rate limit exceeded. Please try again later.",
            "retry_after": exc.detail
        }
    )

# Rate limit decorators for common use cases
RATE_LIMITS = {
    "strict": "10/minute",      # Very restrictive (registration, password reset)
    "normal": "60/minute",      # Normal endpoints (most API calls)
    "generous": "300/minute",   # Generous (read-only, public endpoints)
    "ai_request": "30/minute",  # AI generation requests
}

def get_rate_limit(limit_type: str = "normal") -> str:
    """Get rate limit string for a given type"""
    return RATE_LIMITS.get(limit_type, RATE_LIMITS["normal"])

