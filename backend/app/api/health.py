from fastapi import APIRouter
from app.schemas.health import HealthResponse

router = APIRouter(tags=["Health"])


@router.get("/health", response_model=HealthResponse, summary="Service Health Check")
async def health_check() -> HealthResponse:
    """Return backend operational status and service name."""
    return HealthResponse(
        status="ok",
        service="legal-ai-backend"
    )
