"""
Market Intelligence Schemas
---------------------------
Data schemas for APMC wholesale market intelligence, comparisons, and trend reporting.
"""

from typing import List, Optional
from pydantic import BaseModel, Field

class MarketObservation(BaseModel):
    market: str
    district: str
    state: str
    min_price: float = Field(..., description="Minimum clearing price (INR / Quintal)")
    max_price: float = Field(..., description="Maximum clearing price (INR / Quintal)")
    modal_price: float = Field(..., description="Modal market price (INR / Quintal)")
    arrivals: float = Field(..., description="Wholesale arrival volume in tonnes")
    temp_mean: Optional[float] = Field(None, description="Mean temperature in Celsius")
    rainfall: Optional[float] = Field(None, description="Rainfall in mm")
    humidity: Optional[float] = Field(None, description="Relative humidity %")
    predicted_price: Optional[float] = Field(None, description="Forward ML model predicted price (INR / Quintal)")

class HistoricalPricePoint(BaseModel):
    date: str
    modal_price: float
    arrivals: float

class ForwardOutlook(BaseModel):
    current_modal_price: float
    projected_7d_price: Optional[float] = None
    projected_14d_price: Optional[float] = None
    projected_change_percent: Optional[float] = None
    price_trend_direction: str = Field("STABLE", description="RISING | FALLING | STABLE")
    demand_absorption_band: str = Field("MODERATE", description="LOW | MODERATE | HIGH")
    supporting_factors: List[str]

class MarketSummaryStats(BaseModel):
    min_modal_price: float
    max_modal_price: float
    avg_modal_price: float
    total_arrivals_tonnes: float
    top_paying_market: str
    lowest_paying_market: str

class CommodityMarketIntelligenceResponse(BaseModel):
    commodity: str
    reporting_date: str
    total_markets_reporting: int
    overall_stats: MarketSummaryStats
    markets: List[MarketObservation]
    historical_trend: List[HistoricalPricePoint]
    forward_outlook: ForwardOutlook
    data_source: str = "APMC Mandi Wholesale Benchmark (Synthetic Demo Baseline)"
    data_freshness_status: str = "DEMO_FIXTURE_NO_FABRICATED_REAL_CLAIMS"
    limitations: List[str]
