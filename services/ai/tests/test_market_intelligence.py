"""
Tests for Market Intelligence Endpoints and Data Aggregation
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings

@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        c.headers.update({"x-internal-api-key": settings.AI_SERVICE_INTERNAL_KEY})
        yield c

def test_get_supported_commodities(client):
    response = client.get("/api/v1/market/commodities")
    assert response.status_code == 200
    commodities = response.json()
    assert isinstance(commodities, list)
    assert len(commodities) >= 5
    assert "Tomato" in commodities
    assert "Onion" in commodities

def test_get_market_intelligence_success(client):
    response = client.get("/api/v1/market/intelligence/Tomato")
    assert response.status_code == 200
    data = response.json()

    assert data["commodity"] == "Tomato"
    assert data["total_markets_reporting"] > 0
    assert len(data["markets"]) > 0

    # Validate overall summary stats
    stats = data["overall_stats"]
    assert stats["min_modal_price"] > 0
    assert stats["max_modal_price"] >= stats["min_modal_price"]
    assert stats["avg_modal_price"] > 0
    assert stats["total_arrivals_tonnes"] > 0
    assert "top_paying_market" in stats
    assert "lowest_paying_market" in stats

    # Validate market observations
    first_market = data["markets"][0]
    assert "market" in first_market
    assert "modal_price" in first_market
    assert "min_price" in first_market
    assert "max_price" in first_market
    assert "arrivals" in first_market
    assert first_market["min_price"] <= first_market["modal_price"] <= first_market["max_price"]

    # Validate historical trend
    assert len(data["historical_trend"]) > 0
    assert "date" in data["historical_trend"][0]
    assert "modal_price" in data["historical_trend"][0]

    # Validate forward outlook
    outlook = data["forward_outlook"]
    assert "current_modal_price" in outlook
    assert outlook["price_trend_direction"] in ["RISING", "FALLING", "STABLE"]
    assert outlook["demand_absorption_band"] in ["LOW", "MODERATE", "HIGH"]
    assert len(outlook["supporting_factors"]) > 0

    # Validate transparency & disclaimers
    assert len(data["limitations"]) >= 2
    assert "data_source" in data

def test_get_market_intelligence_onion(client):
    response = client.get("/api/v1/market/intelligence/Onion")
    assert response.status_code == 200
    data = response.json()
    assert data["commodity"] == "Onion"
    assert any(m["market"] == "Lasalgaon" for m in data["markets"])

def test_get_market_intelligence_unknown_commodity(client):
    response = client.get("/api/v1/market/intelligence/DragonFruitNonExistent")
    assert response.status_code == 404
    data = response.json()
    assert "not found" in data["detail"].lower()

def test_market_endpoint_unauthorized():
    with TestClient(app) as unauth_client:
        response = unauth_client.get("/api/v1/market/intelligence/Tomato")
        assert response.status_code == 401
