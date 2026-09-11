"""
Liveness and Readiness Endpoints
"""

from fastapi import APIRouter, status, Response
from fastapi.responses import JSONResponse
from ...services.model_registry import model_registry
from ...core.config import settings

router = APIRouter(tags=["Health & Readiness"])

@router.get("/health", status_code=status.HTTP_200_OK)
async def health_check():
    return {
        "status": "ok",
        "service": settings.SERVICE_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT
    }

@router.get("/ready")
async def readiness_check():
    is_ready, details = model_registry.check_readiness()
    if is_ready:
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "status": "ready",
                "service": settings.SERVICE_NAME,
                "models": details
            }
        )
    else:
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content={
                "status": "unhealthy",
                "service": settings.SERVICE_NAME,
                "models": details,
                "message": "One or more ML baseline models are not loaded"
            }
        )
