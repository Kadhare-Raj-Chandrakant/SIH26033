"""
API v1 Router Aggregator
"""

from fastapi import APIRouter, Depends
from ...core.security import verify_internal_api_key
from .health import router as health_router
from .price import router as price_router
from .demand import router as demand_router
from .crop import router as crop_router
from .feedback import router as feedback_router

api_v1_router = APIRouter()

# Public liveness and readiness probe
api_v1_router.include_router(health_router)

# Protected inference and feedback endpoints (require internal pre-shared key)
api_v1_router.include_router(price_router, dependencies=[Depends(verify_internal_api_key)])
api_v1_router.include_router(demand_router, dependencies=[Depends(verify_internal_api_key)])
api_v1_router.include_router(crop_router, dependencies=[Depends(verify_internal_api_key)])
api_v1_router.include_router(feedback_router, dependencies=[Depends(verify_internal_api_key)])
