"""
Market Data Service
-------------------
In-memory aggregation and forward market intelligence generation
based on processed APMC wholesale mandi dataset.
"""

from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
import pandas as pd
import numpy as np

from ..core.config import settings
from ..core.logging import logger
from ..schemas.market import (
    CommodityMarketIntelligenceResponse,
    MarketObservation,
    HistoricalPricePoint,
    ForwardOutlook,
    MarketSummaryStats
)
from ..schemas.price import PricePredictionRequest
from ..schemas.demand import DemandForecastRequest
from .model_registry import model_registry

class MarketDataService:
    def __init__(self):
        self.dataset_path = Path(settings.DATA_DIR) / "processed" / "mandi_weather_merged.csv"
        self._df: Optional[pd.DataFrame] = None
        self._load_dataset()

    def _load_dataset(self):
        try:
            if self.dataset_path.exists():
                self._df = pd.read_csv(self.dataset_path)
                logger.info(f"Loaded {len(self._df)} mandi weather records from {self.dataset_path}")
            else:
                logger.warn(f"Mandi dataset not found at {self.dataset_path}")
                self._df = pd.DataFrame()
        except Exception as e:
            logger.error(f"Failed to load mandi weather dataset: {str(e)}")
            self._df = pd.DataFrame()

    def get_supported_commodities(self) -> List[str]:
        if self._df is None or self._df.empty:
            return []
        return sorted(self._df["commodity"].dropna().unique().tolist())

    def get_market_intelligence(self, commodity: str) -> CommodityMarketIntelligenceResponse:
        if self._df is None or self._df.empty:
            raise ValueError("Mandi dataset is not available.")

        comm_clean = commodity.strip().title()
        df_comm = self._df[self._df["commodity"].str.title() == comm_clean].copy()

        if df_comm.empty:
            raise ValueError(f"Commodity '{commodity}' not found in benchmark market dataset.")

        # Sort chronologically
        df_comm["date"] = pd.to_datetime(df_comm["date"])
        df_comm = df_comm.sort_values("date")

        latest_date = df_comm["date"].max()
        latest_date_str = latest_date.strftime("%Y-%m-%d")

        # Get latest record for each distinct market
        latest_markets_df = (
            df_comm.groupby("market")
            .last()
            .reset_index()
            .sort_values("modal_price", ascending=False)
        )

        market_observations: List[MarketObservation] = []
        for _, row in latest_markets_df.iterrows():
            mkt_name = str(row["market"])
            dist_name = str(row["district"]) if pd.notna(row["district"]) else mkt_name
            st_name = str(row["state"]) if pd.notna(row["state"]) else "India"
            min_p = round(float(row["min_price"]), 2)
            max_p = round(float(row["max_price"]), 2)
            modal_p = round(float(row["modal_price"]), 2)
            arr = round(float(row["arrivals"]), 2)
            t_mean = round(float(row["temp_mean"]), 1) if pd.notna(row.get("temp_mean")) else None
            rain = round(float(row["rainfall"]), 1) if pd.notna(row.get("rainfall")) else None
            hum = round(float(row["humidity"]), 1) if pd.notna(row.get("humidity")) else None

            # Generate ML forward price forecast for this market (+7 days)
            pred_price = None
            if "price" in model_registry.models:
                try:
                    target_d = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
                    p_req = PricePredictionRequest(
                        commodity=comm_clean,
                        market=mkt_name,
                        district=dist_name,
                        state=st_name,
                        target_date=target_d,
                        historical_price_lag_1=modal_p,
                        historical_price_lag_7=modal_p,
                        historical_price_rolling_7=modal_p,
                        arrivals_lag_1=arr,
                        temp_mean=t_mean or 26.0,
                        rainfall=rain or 1.0,
                        humidity=hum or 65.0
                    )
                    pred_res = model_registry.predict_price(p_req)
                    pred_price = pred_res.predicted_modal_price
                except Exception as ex:
                    logger.debug(f"Could not compute forward price for {mkt_name}: {ex}")

            market_observations.append(
                MarketObservation(
                    market=mkt_name,
                    district=dist_name,
                    state=st_name,
                    min_price=min_p,
                    max_price=max_p,
                    modal_price=modal_p,
                    arrivals=arr,
                    temp_mean=t_mean,
                    rainfall=rain,
                    humidity=hum,
                    predicted_price=pred_price
                )
            )

        # Historical trend: last 14 distinct dates across all reporting markets
        recent_dates = df_comm["date"].drop_duplicates().nlargest(14).sort_values()
        df_recent = df_comm[df_comm["date"].isin(recent_dates)]
        daily_trend = (
            df_recent.groupby(df_recent["date"].dt.strftime("%Y-%m-%d"))
            .agg({"modal_price": "mean", "arrivals": "sum"})
            .reset_index()
            .sort_values("date")
        )

        trend_points: List[HistoricalPricePoint] = [
            HistoricalPricePoint(
                date=str(r["date"]),
                modal_price=round(float(r["modal_price"]), 2),
                arrivals=round(float(r["arrivals"]), 2)
            )
            for _, r in daily_trend.iterrows()
        ]

        # Overall summary statistics
        all_modal_prices = [m.modal_price for m in market_observations]
        min_modal = min(all_modal_prices)
        max_modal = max(all_modal_prices)
        avg_modal = round(float(np.mean(all_modal_prices)), 2)
        total_arr = round(sum(m.arrivals for m in market_observations), 2)

        top_market = market_observations[0].market
        lowest_market = market_observations[-1].market

        overall_stats = MarketSummaryStats(
            min_modal_price=min_modal,
            max_modal_price=max_modal,
            avg_modal_price=avg_modal,
            total_arrivals_tonnes=total_arr,
            top_paying_market=top_market,
            lowest_paying_market=lowest_market
        )

        # Forward Outlook (+7d and +14d) using baseline model
        projected_7d = None
        projected_14d = None
        trend_direction = "STABLE"
        change_pct = None
        absorption_band = "MODERATE"
        supporting_factors: List[str] = []

        if "price" in model_registry.models:
            try:
                date_7d = (datetime.now() + timedelta(days=7)).strftime("%Y-%m-%d")
                date_14d = (datetime.now() + timedelta(days=14)).strftime("%Y-%m-%d")

                res_7d = model_registry.predict_price(
                    PricePredictionRequest(
                        commodity=comm_clean,
                        market=top_market,
                        target_date=date_7d,
                        historical_price_lag_1=avg_modal,
                        historical_price_lag_7=avg_modal,
                        historical_price_rolling_7=avg_modal,
                        arrivals_lag_1=total_arr / max(1, len(market_observations))
                    )
                )
                projected_7d = res_7d.predicted_modal_price

                res_14d = model_registry.predict_price(
                    PricePredictionRequest(
                        commodity=comm_clean,
                        market=top_market,
                        target_date=date_14d,
                        historical_price_lag_1=projected_7d,
                        historical_price_lag_7=avg_modal,
                        historical_price_rolling_7=projected_7d,
                        arrivals_lag_1=total_arr / max(1, len(market_observations))
                    )
                )
                projected_14d = res_14d.predicted_modal_price

                change_pct = round(((projected_14d - avg_modal) / avg_modal) * 100, 1)
                if change_pct > 2.0:
                    trend_direction = "RISING"
                    supporting_factors.append(f"Model projects a +{change_pct}% modal price increase over the next 14 days.")
                elif change_pct < -2.0:
                    trend_direction = "FALLING"
                    supporting_factors.append(f"Model projects downward price pressure of {change_pct}% over the next 14 days.")
                else:
                    trend_direction = "STABLE"
                    supporting_factors.append("Price trajectory indicates a stable sideways range within ±2%.")

            except Exception as e:
                logger.warn(f"Failed to infer forward outlook for {commodity}: {e}")

        # Demand absorption forecast proxy
        if "demand" in model_registry.models:
            try:
                d_res = model_registry.forecast_demand(
                    DemandForecastRequest(
                        commodity=comm_clean,
                        market=top_market,
                        arrivals_lag_1=total_arr / max(1, len(market_observations)),
                        historical_price_lag_1=avg_modal
                    )
                )
                absorption_band = d_res.demand_band
                supporting_factors.append(
                    f"Wholesale arrival absorption is expected to be {absorption_band} ({d_res.forecast_demand_proxy:.1f} tonnes)."
                )
            except Exception as e:
                logger.warn(f"Failed to infer demand absorption for {commodity}: {e}")

        # Additional seasonal / spread factor
        price_spread = max_modal - min_modal
        supporting_factors.append(
            f"Inter-mandi price spread is currently ₹{price_spread:.2f}/quintal across reporting centers."
        )

        forward_outlook = ForwardOutlook(
            current_modal_price=avg_modal,
            projected_7d_price=projected_7d,
            projected_14d_price=projected_14d,
            projected_change_percent=change_pct,
            price_trend_direction=trend_direction,
            demand_absorption_band=absorption_band,
            supporting_factors=supporting_factors
        )

        limitations = [
            "Mandi figures reflect wholesale APMC clearing auctions, not farm-gate purchase prices.",
            "Logistics, storage, loading, and statutory mandi cess must be subtracted to determine actual net realization.",
            "Data is derived from synthetic demonstration baseline modeled after APMC seasonal dynamics."
        ]

        return CommodityMarketIntelligenceResponse(
            commodity=comm_clean,
            reporting_date=latest_date_str,
            total_markets_reporting=len(market_observations),
            overall_stats=overall_stats,
            markets=market_observations,
            historical_trend=trend_points,
            forward_outlook=forward_outlook,
            limitations=limitations
        )

market_data_service = MarketDataService()
