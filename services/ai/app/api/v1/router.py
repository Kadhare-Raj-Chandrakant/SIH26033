"""
API v1 Router Aggregator
"""

from fastapi import APIRouter
from .health import router as health_router
from .price import router as price_router
from .demand import router as demand_router
from .crop import router as crop_router
from .feedback import router as feedback_router

api_v1_router = APIRouter()

# Attach routes
api_v1_router.include_router(health_router)
api_v1_router.include_router(price_router)
api_v1_router.include_router(demand_router)
api_v1_router.include_router(crop_router)
api_v1_router.include_router(feedback_router)
