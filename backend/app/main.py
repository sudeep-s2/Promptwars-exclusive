from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import api_router

app = FastAPI(
    title="LexLens Legal AI Assistant API",
    description="Backend API foundation for LexLens - GenAI-powered Legal Information Assistant.",
    version="0.1.0",
)

# Configure CORS for local frontend communication
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

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
