from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """Health check response schema."""
    status: str = Field(..., description="Service health status", examples=["ok"])
    service: str = Field(..., description="Service identifier", examples=["legal-ai-backend"])
