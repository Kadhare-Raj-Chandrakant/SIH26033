"""
Price Intelligence Request and Response Schemas
"""

from typing import Dict, Any, Optional
from pydantic import BaseModel, Field

class PricePredictionRequest(BaseModel):
    commodity: str = Field(..., description="Crop/Commodity name, e.g., 'Tomato', 'Wheat'", min_length=2)
    market: Optional[str] = Field(default="Azadpur", description="APMC mandi/market name")
    district: Optional[str] = Field(default="North Delhi", description="District name")
    state: Optional[str] = Field(default="Delhi", description="State name")
    target_date: Optional[str] = Field(default=None, description="Prediction target date in YYYY-MM-DD format")
    
    # Optional contextual overrides (if known from recent platform listings)
    historical_price_lag_1: Optional[float] = Field(default=None, description="Yesterday's modal price in INR/quintal")
    historical_price_lag_7: Optional[float] = Field(default=None, description="7-day lagged modal price in INR/quintal")
    historical_price_rolling_7: Optional[float] = Field(default=None, description="7-day rolling average modal price")
    arrivals_lag_1: Optional[float] = Field(default=None, description="Yesterday's arrival volume in tonnes")
    temp_mean: Optional[float] = Field(default=None, description="Mean temperature in Celsius")
    rainfall: Optional[float] = Field(default=None, description="Rainfall in mm")
    humidity: Optional[float] = Field(default=None, description="Relative humidity in percentage")

class PriceContributingFactor(BaseModel):
    feature: str
    weight: float
    interpretation: str

class PricePredictionResponse(BaseModel):
    commodity: str
    market: str
    predicted_modal_price: float = Field(..., description="Forecasted modal price in INR / quintal")
    unit: str = "INR / Quintal"
    lower_bound: float
    upper_bound: float
    model_version: str
    explainability_factors: list[PriceContributingFactor]
    methodology_notes: str = "Trained on historical APMC mandi observations with strict zero-leakage backward lags."
