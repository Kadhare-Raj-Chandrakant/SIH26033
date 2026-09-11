"""
Market Intelligence Route
-------------------------
Exposes APMC wholesale market intelligence, comparisons, and trends.
"""

from typing import List
from fastapi import APIRouter, status, HTTPException
from ...schemas.market import CommodityMarketIntelligenceResponse
from ...services.market_data_service import market_data_service

router = APIRouter(prefix="/market", tags=["Market Intelligence"])

@router.get("/commodities", response_model=List[str], status_code=status.HTTP_200_OK)
async def get_supported_commodities():
    """Returns the list of commodities with historical APMC market intelligence available."""
    return market_data_service.get_supported_commodities()

@router.get("/intelligence/{commodity}", response_model=CommodityMarketIntelligenceResponse, status_code=status.HTTP_200_OK)
async def get_market_intelligence(commodity: str):
    """
    Returns aggregated APMC market prices, cross-market comparisons,
    14-day price/arrival trends, and forward price outlook for a commodity.
    """
    try:
        return market_data_service.get_market_intelligence(commodity)
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(ve)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate market intelligence: {str(e)}"
        )
