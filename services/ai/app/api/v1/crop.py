"""
Crop Recommendation Route
"""

from fastapi import APIRouter, status
from ...schemas.crop import CropRecommendationRequest, CropRecommendationResponse
from ...services.model_registry import model_registry

router = APIRouter(prefix="/predict", tags=["Crop Recommendation"])

@router.post("/crop", response_model=CropRecommendationResponse, status_code=status.HTTP_200_OK)
async def recommend_crop(req: CropRecommendationRequest):
    """
    Classifies optimal crop recommendations given soil N-P-K, pH, and climate variables.
    """
    return model_registry.recommend_crop(req)
