from fastapi import FastAPI
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

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount core API endpoints
app.include_router(api_router, prefix="/api")


@app.get("/", tags=["Root"])
async def root():
    return {
        "message": "Welcome to LexLens Legal AI Assistant API",
        "documentation": "/docs",
        "health_check": "/api/health"
    }
