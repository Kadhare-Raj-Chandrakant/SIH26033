"""
Tests for FastAPI AI Service Endpoints, Lifespan, and Validation Handlers
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

def test_health_endpoint(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "version" in data

def test_readiness_endpoint(client):
    response = client.get("/ready")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ready"
    assert data["models"]["all_loaded"] is True

def test_internal_key_unauthorized_rejection():
    with TestClient(app) as unauth_client:
        # Omits x-internal-api-key
        response = unauth_client.post("/api/v1/predict/price", json={"commodity": "Tomato"})
        assert response.status_code == 401
        data = response.json()
        assert "UNAUTHORIZED" in str(data)

def test_predict_price_success(client):
    payload = {
        "commodity": "Tomato",
        "market": "Azadpur",
        "target_date": "2026-09-12",
        "historical_price_lag_1": 2500.0
    }
    response = client.post("/api/v1/predict/price", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["commodity"] == "Tomato"
    assert data["predicted_modal_price"] > 0
    assert "explainability_factors" in data
    assert len(data["explainability_factors"]) > 0

def test_predict_demand_success(client):
    payload = {
        "commodity": "Wheat",
        "market": "Khanna",
        "arrivals_lag_1": 3400.0
    }
    response = client.post("/api/v1/predict/demand", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["commodity"] == "Wheat"
    assert data["forecast_demand_proxy"] >= 0
    assert data["demand_band"] in ["LOW", "MODERATE", "HIGH"]

def test_predict_crop_success(client):
    payload = {
        "N": 80.0,
        "P": 40.0,
        "K": 40.0,
        "temperature": 25.0,
        "humidity": 75.0,
        "ph": 6.5,
        "rainfall": 180.0,
        "top_k": 3
    }
    response = client.post("/api/v1/predict/crop", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "recommended_crop" in data
    assert len(data["top_recommendations"]) == 3
    assert data["top_recommendations"][0]["confidence_score"] > 0

def test_validation_error_handling(client):
    bad_payload = {
        "N": -10.0,
        "P": 40.0,
        "K": 40.0,
        "temperature": 25.0,
        "humidity": 75.0,
        "ph": 20.0,
        "rainfall": 180.0
    }
    response = client.post("/api/v1/predict/crop", json=bad_payload)
    assert response.status_code == 422
    data = response.json()
    assert "error" in data
    assert data["error"]["code"] == "VALIDATION_ERROR"
    assert len(data["error"]["details"]) >= 2

def test_feedback_record_success(client):
    payload = {
        "model_name": "price_predictor_baseline",
        "model_version": "1.1.0",
        "features_logged": {"commodity": "Tomato", "market": "Azadpur"},
        "prediction_output": {"price": 2600.0},
        "user_decision": "ACCEPTED"
    }
    response = client.post("/api/v1/feedback/record", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["status"] == "RECORDED"
    assert "record_id" in data
