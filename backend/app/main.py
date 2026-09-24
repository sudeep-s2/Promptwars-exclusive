from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from app.api import api_router
import os

app = FastAPI(
    title="LexLens Legal AI Assistant API",
    description="Backend API foundation for LexLens - GenAI-powered Legal Information Assistant.",
    version="0.1.0",
)

# Configure CORS origins for development and production
frontend_env = os.getenv("FRONTEND_URL", "https://lexlens-gilt.vercel.app")
configured_origins = [url.strip().rstrip("/") for url in frontend_env.split(",") if url.strip()]

origins = list(dict.fromkeys([
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://lexlens-gilt.vercel.app",
    *configured_origins,
]))

# Allowed HTTP methods and headers (explicit, no unnecessary wildcards)
ALLOWED_METHODS = ["GET", "POST", "OPTIONS", "HEAD"]
ALLOWED_HEADERS = ["Content-Type", "Accept", "Authorization", "X-Requested-With"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=ALLOWED_METHODS,
    allow_headers=ALLOWED_HEADERS,
    max_age=600,
)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    """
    Enforce essential security response headers across all API endpoints:
    - X-Content-Type-Options: Prevents MIME-type sniffing
    - X-Frame-Options: Prevents clickjacking attacks
    - Strict-Transport-Security: Enforces HTTPS communication
    - Referrer-Policy: Prevents sensitive path leakage in Referer headers
    - Permissions-Policy: Restricts access to sensitive browser features
    - Content-Security-Policy: Restricts resource loading and frame ancestors
    """
    response = await call_next(request)

    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
        "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
        "img-src 'self' data: https://fastapi.tiangolo.com; "
        "frame-ancestors 'none';"
    )

    return response


# Mount core API endpoints
app.include_router(api_router, prefix="/api")


@app.get("/", tags=["Root"])
async def root():
    return {
        "message": "Welcome to LexLens Legal AI Assistant API",
        "documentation": "/docs",
        "health_check": "/api/health"
    }
