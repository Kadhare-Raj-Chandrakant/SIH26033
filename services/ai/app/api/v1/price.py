"""
Price Intelligence Route
"""

from fastapi import APIRouter, status
from ...schemas.price import PricePredictionRequest, PricePredictionResponse
from ...services.model_registry import model_registry

router = APIRouter(prefix="/predict", tags=["Price Intelligence"])

@router.post("/price", response_model=PricePredictionResponse, status_code=status.HTTP_200_OK)
async def predict_price(req: PricePredictionRequest):
    """
    Infers baseline agricultural commodity modal price using historical lags,
    arrivals, seasonal markers, and agro-weather features.
    """
    return model_registry.predict_price(req)
