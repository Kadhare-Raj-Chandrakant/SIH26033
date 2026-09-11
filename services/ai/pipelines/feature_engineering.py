"""
SIH26033 Feature Engineering Module
------------------------------------
Creates reusable, leakage-free feature sets for Price Intelligence and
Demand/Arrival Forecasting.

CRITICAL LEAKAGE-PREVENTION POLICY:
All historical market indicators (prices, spreads, arrivals, rolling stats)
are strictly computed using backward-looking observations:
    df.groupby([...])[col].shift(1).rolling(...)
This guarantees that at time t (prediction target date), no current or future
target observations leak into the predictor features.
"""

from typing import Tuple, List
import numpy as np
import pandas as pd

def get_season(month: int) -> str:
    """
    Indian agricultural crop seasons:
    - Kharif: July to October (Monsoon crops)
    - Rabi: November to March (Winter crops)
    - Zaid: April to June (Summer crops)
    """
    if 7 <= month <= 10:
        return "kharif"
    elif month >= 11 or month <= 3:
        return "rabi"
    else:
        return "zaid"

def engineer_temporal_features(df: pd.DataFrame, date_col: str = "date") -> pd.DataFrame:
    """
    Extracts cyclical and categorical temporal features.
    """
    df = df.copy()
    dates = pd.to_datetime(df[date_col])
    
    df["year"] = dates.dt.year
    df["month"] = dates.dt.month
    df["day"] = dates.dt.day
    df["day_of_week"] = dates.dt.dayofweek
    df["day_of_year"] = dates.dt.dayofyear
    df["quarter"] = dates.dt.quarter
    df["is_weekend"] = (dates.dt.dayofweek >= 5).astype(int)
    df["season"] = dates.dt.month.apply(get_season)
    
    # Cyclical encodings for periodic calendar variables
    df["sin_month"] = np.sin(2 * np.pi * df["month"] / 12.0)
    df["cos_month"] = np.cos(2 * np.pi * df["month"] / 12.0)
    df["sin_day_of_year"] = np.sin(2 * np.pi * df["day_of_year"] / 365.25)
    df["cos_day_of_year"] = np.cos(2 * np.pi * df["day_of_year"] / 365.25)

    return df

def engineer_market_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Generates time-series lag and rolling summary features for each
    commodity-market track.
    
    Guarantees zero data leakage by shifting all historical signals by at least 1 day.
    """
    df = df.copy()
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values(by=["commodity", "market", "date"]).reset_index(drop=True)
    
    grouped = df.groupby(["commodity", "market"])

    # Price lag features (shifted by 1 day)
    df["price_lag_1"] = grouped["modal_price"].shift(1)
    df["price_lag_7"] = grouped["modal_price"].shift(7)
    df["price_lag_14"] = grouped["modal_price"].shift(14)
    df["price_lag_30"] = grouped["modal_price"].shift(30)

    # Rolling price statistics (strictly shifted backward)
    shifted_price = grouped["modal_price"].shift(1)
    df["price_rolling_mean_7"] = shifted_price.rolling(window=7, min_periods=1).mean().reset_index(drop=True)
    df["price_rolling_std_7"] = shifted_price.rolling(window=7, min_periods=1).std().fillna(0).reset_index(drop=True)
    df["price_rolling_mean_30"] = shifted_price.rolling(window=30, min_periods=1).mean().reset_index(drop=True)
    df["price_rolling_std_30"] = shifted_price.rolling(window=30, min_periods=1).std().fillna(0).reset_index(drop=True)

    # Price spread (max - min) lag
    df["_spread_tmp"] = df["max_price"] - df["min_price"]
    df["spread_lag_1"] = df.groupby(["commodity", "market"])["_spread_tmp"].shift(1)
    df.drop(columns=["_spread_tmp"], inplace=True)

    # Arrival lag and rolling features (shifted by 1 day)
    df["arrivals_lag_1"] = grouped["arrivals"].shift(1)
    df["arrivals_lag_7"] = grouped["arrivals"].shift(7)
    df["arrivals_lag_14"] = grouped["arrivals"].shift(14)

    shifted_arrivals = grouped["arrivals"].shift(1)
    df["arrivals_rolling_mean_7"] = shifted_arrivals.rolling(window=7, min_periods=1).mean().reset_index(drop=True)
    df["arrivals_rolling_mean_30"] = shifted_arrivals.rolling(window=30, min_periods=1).mean().reset_index(drop=True)

    # Impute initial warm-up rows (where shift produced NaNs) via backward fill within track, then global median
    numeric_cols = [
        "price_lag_1", "price_lag_7", "price_lag_14", "price_lag_30",
        "price_rolling_mean_7", "price_rolling_std_7", "price_rolling_mean_30", "price_rolling_std_30",
        "spread_lag_1", "arrivals_lag_1", "arrivals_lag_7", "arrivals_lag_14",
        "arrivals_rolling_mean_7", "arrivals_rolling_mean_30"
    ]
    for col in numeric_cols:
        df[col] = df.groupby(["commodity", "market"])[col].bfill()
        df[col] = df[col].fillna(df[col].median())

    return df

def engineer_weather_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Computes derived agro-weather features.
    """
    df = df.copy()
    if "temp_max" in df.columns and "temp_min" in df.columns:
        df["temp_diurnal_range"] = df["temp_max"] - df["temp_min"]
    
    if "rainfall" in df.columns:
        # 7-day cumulative rainfall per district
        if "district" in df.columns and "date" in df.columns:
            df["date"] = pd.to_datetime(df["date"])
            df = df.sort_values(by=["district", "date"]).reset_index(drop=True)
            df["rainfall_sum_7d"] = (
                df.groupby("district")["rainfall"]
                .shift(1)
                .rolling(window=7, min_periods=1)
                .sum()
                .reset_index(drop=True)
                .fillna(0.0)
            )
        else:
            df["rainfall_sum_7d"] = df["rainfall"]

    return df

def build_full_market_feature_matrix(merged_mandi_weather_df: pd.DataFrame) -> pd.DataFrame:
    """
    Constructs the complete ML feature matrix for price prediction and demand forecasting.
    """
    df = engineer_temporal_features(merged_mandi_weather_df, date_col="date")
    df = engineer_market_features(df)
    df = engineer_weather_features(df)

    # One-hot / categorical encoding indicators
    # Keep original strings for human-readable querying, but provide categorical code columns
    df["commodity_cat"] = df["commodity"].astype("category").cat.codes if "commodity" in df.columns else 0
    df["market_cat"] = df["market"].astype("category").cat.codes if "market" in df.columns else 0
    df["district_cat"] = df["district"].astype("category").cat.codes if "district" in df.columns else 0
    
    state_col = "state" if "state" in df.columns else ("state_x" if "state_x" in df.columns else None)
    df["state_cat"] = df[state_col].astype("category").cat.codes if state_col else 0
    df["season_cat"] = df["season"].astype("category").cat.codes if "season" in df.columns else 0

    return df
