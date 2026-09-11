"""
Demand Forecasting Request and Response Schemas
"""

from typing import Optional, List
from pydantic import BaseModel, Field

class DemandForecastRequest(BaseModel):
    commodity: str = Field(..., description="Crop/Commodity name, e.g. 'Wheat', 'Tomato'", min_length=2)
    market: Optional[str] = Field(default="Azadpur", description="Mandi/Market name")
    target_date: Optional[str] = Field(default=None, description="Forecast target date YYYY-MM-DD")
    arrivals_lag_1: Optional[float] = Field(default=None, description="Lagged 1-day arrival in metric tonnes")
    arrivals_rolling_mean_7: Optional[float] = Field(default=None, description="7-day rolling arrival mean")
    historical_price_lag_1: Optional[float] = Field(default=None, description="Lagged 1-day price in INR/quintal")

class DemandForecastResponse(BaseModel):
    commodity: str
    market: str
    target_date: str
    forecast_demand_proxy: float = Field(..., description="Estimated market arrival absorption in Metric Tonnes")
    unit: str = "Metric Tonnes"
    demand_band: str = Field(..., description="Demand band: LOW, MODERATE, HIGH")
    proxy_disclosure: str = (
        "Proxy metric based on APMC wholesale arrival absorption volume. "
        "Does not represent direct platform transaction volume."
    )
    model_version: str
