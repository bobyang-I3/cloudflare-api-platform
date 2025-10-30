"""
FastAPI main application
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from config import settings
from database import init_db
from routers import auth_router, ai_router, usage_router, admin_router, credit_router, message_router, forum_router
from rate_limit import limiter, rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

# Create FastAPI app
app = FastAPI(
    title="Cloudflare API Billing Platform",
    description="API management platform with Credit-based billing for Cloudflare Workers AI",
    version="2.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_exceeded_handler)

# Include routers
app.include_router(auth_router.router, prefix=settings.api_v1_prefix)
app.include_router(ai_router.router, prefix=settings.api_v1_prefix)
app.include_router(usage_router.router, prefix=settings.api_v1_prefix)
app.include_router(credit_router.router, prefix=settings.api_v1_prefix)
app.include_router(message_router.router)
app.include_router(forum_router.router)
app.include_router(admin_router.router)


@app.on_event("startup")
def startup_event():
    """Initialize database on startup"""
    print("🚀 Starting Cloudflare API Billing Platform...")
    init_db()
    print(f"✅ Server ready on http://{settings.host}:{settings.port}")


@app.get("/")
def root():
    """Root endpoint"""
    return {
        "message": "Cloudflare API Billing Platform",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health"
    }


@app.get("/health")
def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "cloudflare-api-billing"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.host,
        port=settings.port,
        reload=False  # Disabled to avoid permission issues
    )

