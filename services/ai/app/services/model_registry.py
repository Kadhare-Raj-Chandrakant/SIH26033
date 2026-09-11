"""
SIH26033 AI Model Registry & Inference Service
----------------------------------------------
Manages model loading, caching, feature construction, prediction execution,
and explainability factor generation.
"""

import os
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
import joblib
import numpy as np
import pandas as pd

from ..core.config import settings
from ..core.logging import logger
from ..core.errors import AIModelNotFoundError, AIInferenceError
from ..schemas.price import PricePredictionRequest, PricePredictionResponse, PriceContributingFactor
from ..schemas.demand import DemandForecastRequest, DemandForecastResponse
from ..schemas.crop import CropRecommendationRequest, CropRecommendationResponse, CropCandidate
from ..schemas.feedback import FeedbackRecordRequest, FeedbackRecordResponse

class ModelRegistry:
    def __init__(self):
        self.artifacts_dir = Path(settings.ARTIFACTS_DIR)
        self.models: Dict[str, Any] = {}
        self.metadata: Dict[str, Dict[str, Any]] = {}
        self.is_loaded = False

    def load_models(self):
        """Loads all trained model artifacts and metadata into memory."""
        try:
            # 1. Price Model
            price_dir = self.artifacts_dir / "price_model"
            if (price_dir / "model.joblib").exists() and (price_dir / "metadata.json").exists():
                self.models["price"] = joblib.load(price_dir / "model.joblib")
                with open(price_dir / "metadata.json", "r") as f:
                    self.metadata["price"] = json.load(f)
                logger.info(f"Loaded price model v{self.metadata['price']['model_version']}")

            # 2. Demand Model
            demand_dir = self.artifacts_dir / "demand_model"
            if (demand_dir / "model.joblib").exists() and (demand_dir / "metadata.json").exists():
                self.models["demand"] = joblib.load(demand_dir / "model.joblib")
                with open(demand_dir / "metadata.json", "r") as f:
                    self.metadata["demand"] = json.load(f)
                logger.info(f"Loaded demand model v{self.metadata['demand']['model_version']}")

            # 3. Crop Model
            crop_dir = self.artifacts_dir / "crop_model"
            if (crop_dir / "model.joblib").exists() and (crop_dir / "metadata.json").exists():
                self.models["crop"] = joblib.load(crop_dir / "model.joblib")
                with open(crop_dir / "metadata.json", "r") as f:
                    self.metadata["crop"] = json.load(f)
                logger.info(f"Loaded crop model v{self.metadata['crop']['model_version']}")

            self.is_loaded = all(k in self.models for k in ["price", "demand", "crop"])
            logger.info(f"Model registry status: {'ALL READY' if self.is_loaded else 'PARTIAL'}")
        except Exception as e:
            logger.error(f"Error loading models: {str(e)}")
            self.is_loaded = False

    def check_readiness(self) -> Tuple[bool, Dict[str, Any]]:
        status = {
            "price_model": "price" in self.models,
            "demand_model": "demand" in self.models,
            "crop_model": "crop" in self.models,
            "all_loaded": self.is_loaded
        }
        return self.is_loaded, status

    def predict_price(self, req: PricePredictionRequest) -> PricePredictionResponse:
        if "price" not in self.models:
            raise AIModelNotFoundError("price_predictor_baseline")

        meta = self.metadata["price"]
        model = self.models["price"]

        target_dt = (
            datetime.strptime(req.target_date, "%Y-%m-%d")
            if req.target_date
            else datetime.now()
        )

        month = target_dt.month
        day_of_week = target_dt.weekday()
        day_of_year = target_dt.timetuple().tm_yday
        quarter = (month - 1) // 3 + 1
        is_weekend = 1 if day_of_week >= 5 else 0

        # Season
        if 7 <= month <= 10:
            season_cat = 0  # kharif
        elif month >= 11 or month <= 3:
            season_cat = 1  # rabi
        else:
            season_cat = 2  # zaid

        sin_month = float(np.sin(2 * np.pi * month / 12.0))
        cos_month = float(np.cos(2 * np.pi * month / 12.0))
        sin_day_of_year = float(np.sin(2 * np.pi * day_of_year / 365.25))
        cos_day_of_year = float(np.cos(2 * np.pi * day_of_year / 365.25))

        # Categorical lookups
        comm_map = meta.get("commodity_mapping", {})
        comm_cat = comm_map.get(req.commodity.strip().title(), comm_map.get(req.commodity.strip(), 0))

        market_map = meta.get("market_mapping", {})
        mkt_cat = market_map.get(req.market, 0)

        dist_map = meta.get("district_mapping", {})
        dist_cat = dist_map.get(req.district, 0)

        state_map = meta.get("state_mapping", {})
        st_cat = state_map.get(req.state, 0)

        # Numerical indicators with robust defaults if not supplied
        p_lag_1 = req.historical_price_lag_1 if req.historical_price_lag_1 is not None else 2800.0
        p_lag_7 = req.historical_price_lag_7 if req.historical_price_lag_7 is not None else p_lag_1
        p_lag_14 = p_lag_1
        p_lag_30 = p_lag_1
        p_roll_7 = req.historical_price_rolling_7 if req.historical_price_rolling_7 is not None else p_lag_1
        p_roll_std_7 = 50.0
        p_roll_30 = p_roll_7
        p_roll_std_30 = 90.0
        spread_lag_1 = 300.0
        arr_lag_1 = req.arrivals_lag_1 if req.arrivals_lag_1 is not None else 3500.0
        arr_lag_7 = arr_lag_1
        arr_roll_7 = arr_lag_1
        t_mean = req.temp_mean if req.temp_mean is not None else 26.0
        rain = req.rainfall if req.rainfall is not None else 1.5
        hum = req.humidity if req.humidity is not None else 65.0
        rain_sum_7d = rain * 7.0

        feature_vector = [
            comm_cat, mkt_cat, dist_cat, st_cat,
            month, day_of_week, quarter, is_weekend, season_cat,
            sin_month, cos_month, sin_day_of_year, cos_day_of_year,
            p_lag_1, p_lag_7, p_lag_14, p_lag_30,
            p_roll_7, p_roll_std_7, p_roll_30, p_roll_std_30,
            spread_lag_1, arr_lag_1, arr_lag_7, arr_roll_7,
            t_mean, rain, hum, rain_sum_7d
        ]

        cols = meta.get("features")
        X_input = pd.DataFrame([feature_vector], columns=cols) if cols else [feature_vector]

        try:
            predicted_price = float(model.predict(X_input)[0])
        except Exception as e:
            raise AIInferenceError(f"Failed to infer price: {str(e)}")

        # Confidence bounds using test RMSE
        test_rmse = meta.get("metrics", {}).get("test", {}).get("rmse", 185.0)
        lower_bound = max(0.0, round(predicted_price - (1.96 * test_rmse), 2))
        upper_bound = round(predicted_price + (1.96 * test_rmse), 2)

        # Top explainability factors
        top_importances = list(meta.get("feature_importances", {}).items())[:3]
        factors = [
            PriceContributingFactor(
                feature=k,
                weight=v,
                interpretation=f"Feature '{k}' is a primary driver with {v*100:.1f}% model contribution weight."
            )
            for k, v in top_importances
        ]

        return PricePredictionResponse(
            commodity=req.commodity,
            market=req.market or "Azadpur",
            predicted_modal_price=round(predicted_price, 2),
            unit="INR / Quintal",
            lower_bound=lower_bound,
            upper_bound=upper_bound,
            model_version=meta.get("model_version", "1.0.0"),
            explainability_factors=factors
        )

    def forecast_demand(self, req: DemandForecastRequest) -> DemandForecastResponse:
        if "demand" not in self.models:
            raise AIModelNotFoundError("demand_forecaster_baseline")

        meta = self.metadata["demand"]
        model = self.models["demand"]

        target_dt = (
            datetime.strptime(req.target_date, "%Y-%m-%d")
            if req.target_date
            else datetime.now()
        )

        month = target_dt.month
        day_of_week = target_dt.weekday()
        quarter = (month - 1) // 3 + 1
        is_weekend = 1 if day_of_week >= 5 else 0
        day_of_year = target_dt.timetuple().tm_yday

        sin_month = float(np.sin(2 * np.pi * month / 12.0))
        cos_month = float(np.cos(2 * np.pi * month / 12.0))
        sin_day_of_year = float(np.sin(2 * np.pi * day_of_year / 365.25))
        cos_day_of_year = float(np.cos(2 * np.pi * day_of_year / 365.25))

        comm_map = meta.get("commodity_mapping", {})
        comm_cat = comm_map.get(req.commodity.strip().title(), comm_map.get(req.commodity.strip(), 0))

        market_map = meta.get("market_mapping", {})
        mkt_cat = market_map.get(req.market or "Azadpur", 0)

        arr_lag_1 = req.arrivals_lag_1 if req.arrivals_lag_1 is not None else 3200.0
        arr_lag_7 = arr_lag_1
        arr_lag_14 = arr_lag_1
        arr_roll_7 = req.arrivals_rolling_mean_7 if req.arrivals_rolling_mean_7 is not None else arr_lag_1
        arr_roll_30 = arr_roll_7
        p_lag_1 = req.historical_price_lag_1 if req.historical_price_lag_1 is not None else 2800.0
        p_roll_7 = p_lag_1
        rain_sum_7d = 10.0

        feature_vector = [
            comm_cat, mkt_cat, month, day_of_week, quarter, is_weekend,
            sin_month, cos_month, sin_day_of_year, cos_day_of_year,
            arr_lag_1, arr_lag_7, arr_lag_14,
            arr_roll_7, arr_roll_30,
            p_lag_1, p_roll_7, rain_sum_7d
        ]

        cols = meta.get("features")
        X_input = pd.DataFrame([feature_vector], columns=cols) if cols else [feature_vector]

        try:
            forecast_val = float(model.predict(X_input)[0])
        except Exception as e:
            raise AIInferenceError(f"Failed to infer demand: {str(e)}")

        forecast_val = max(0.0, forecast_val)
        if forecast_val < 1500.0:
            band = "LOW"
        elif forecast_val < 4500.0:
            band = "MODERATE"
        else:
            band = "HIGH"

        return DemandForecastResponse(
            commodity=req.commodity,
            market=req.market or "Azadpur",
            target_date=target_dt.strftime("%Y-%m-%d"),
            forecast_demand_proxy=round(forecast_val, 2),
            unit="Metric Tonnes",
            demand_band=band,
            model_version=meta.get("model_version", "1.0.0")
        )

    def recommend_crop(self, req: CropRecommendationRequest) -> CropRecommendationResponse:
        if "crop" not in self.models:
            raise AIModelNotFoundError("crop_recommender_baseline")

        meta = self.metadata["crop"]
        model = self.models["crop"]

        feature_cols = ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]
        feature_vector = [req.N, req.P, req.K, req.temperature, req.humidity, req.ph, req.rainfall]
        X_input = pd.DataFrame([feature_vector], columns=feature_cols)

        try:
            probs = model.predict_proba(X_input)[0]
            classes = model.classes_
        except Exception as e:
            raise AIInferenceError(f"Failed to infer crop recommendation: {str(e)}")

        # Rank candidates by probability
        ranked_indices = np.argsort(probs)[::-1]
        top_k = min(req.top_k, len(classes))

        top_recommendations = [
            CropCandidate(
                crop=str(classes[idx]).capitalize(),
                confidence_score=round(float(probs[idx]), 4)
            )
            for idx in ranked_indices[:top_k]
        ]

        recommended_crop = top_recommendations[0].crop

        # Soil profile summary
        n_desc = "High" if req.N > 100 else ("Medium" if req.N > 40 else "Low")
        ph_desc = "Neutral" if 6.0 <= req.ph <= 7.5 else ("Acidic" if req.ph < 6.0 else "Alkaline")
        summary = f"Soil exhibits {n_desc} Nitrogen and {ph_desc} pH ({req.ph:.1f}) under {req.rainfall:.0f}mm seasonal rainfall."

        return CropRecommendationResponse(
            recommended_crop=recommended_crop,
            top_recommendations=top_recommendations,
            model_version=meta.get("model_version", "1.0.0"),
            soil_profile_summary=summary
        )

    def record_feedback(self, req: FeedbackRecordRequest) -> FeedbackRecordResponse:
        """Appends feedback observation to an append-only JSONL log file for future M10 model retraining."""
        record_id = f"pred_fb_{uuid.uuid4().hex[:12]}"
        now_iso = datetime.now(timezone.utc).isoformat()

        record = {
            "record_id": record_id,
            "recorded_at": now_iso,
            "model_name": req.model_name,
            "model_version": req.model_version,
            "prediction_id": req.prediction_id,
            "features_logged": req.features_logged,
            "prediction_output": req.prediction_output,
            "actual_outcome": req.actual_outcome,
            "user_decision": req.user_decision
        }

        feedback_file = Path(settings.DATA_DIR) / "feedback_logs.jsonl"
        os.makedirs(feedback_file.parent, exist_ok=True)
        with open(feedback_file, "a", encoding="utf-8") as f:
            f.write(json.dumps(record) + "\n")

        return FeedbackRecordResponse(
            status="RECORDED",
            record_id=record_id,
            recorded_at=now_iso,
            message="Feedback observation logged successfully for model evaluation."
        )

# Global registry instance
model_registry = ModelRegistry()
