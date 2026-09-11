"""
Demand Forecasting Route
"""

from fastapi import APIRouter, status
from ...schemas.demand import DemandForecastRequest, DemandForecastResponse
from ...services.model_registry import model_registry

router = APIRouter(prefix="/predict", tags=["Demand Forecasting"])

@router.post("/demand", response_model=DemandForecastResponse, status_code=status.HTTP_200_OK)
async def forecast_demand(req: DemandForecastRequest):
    """
    Infers baseline agricultural market demand absorption proxy (arrivals in tonnes).
    """
    return model_registry.forecast_demand(req)
