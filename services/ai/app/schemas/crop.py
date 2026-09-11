"""
Crop Recommendation Request and Response Schemas
"""

from typing import List
from pydantic import BaseModel, Field

class CropRecommendationRequest(BaseModel):
    N: float = Field(..., ge=0.0, le=300.0, description="Nitrogen ratio in soil (kg/ha)")
    P: float = Field(..., ge=0.0, le=300.0, description="Phosphorus ratio in soil (kg/ha)")
    K: float = Field(..., ge=0.0, le=300.0, description="Potassium ratio in soil (kg/ha)")
    temperature: float = Field(..., ge=-10.0, le=60.0, description="Ambient temperature in Celsius")
    humidity: float = Field(..., ge=0.0, le=100.0, description="Relative humidity in percentage")
    ph: float = Field(..., ge=0.0, le=14.0, description="Soil pH level (0-14)")
    rainfall: float = Field(..., ge=0.0, le=2500.0, description="Seasonal rainfall in mm")
    top_k: int = Field(default=3, ge=1, le=10, description="Number of top crop alternatives to return")

class CropCandidate(BaseModel):
    crop: str
    confidence_score: float = Field(..., description="Estimated suitability probability (0.0 - 1.0)")

class CropRecommendationResponse(BaseModel):
    recommended_crop: str
    top_recommendations: List[CropCandidate]
    model_version: str
    soil_profile_summary: str
