"""
SIH26033 Data Ingestion Module
------------------------------
Standardized ingestion adapters for agricultural datasets.
Loads data, enforces unified schema naming, verifies essential columns,
and transparently identifies provenance (REAL benchmark vs. SYNTHETIC demo fixture).
"""

import os
from typing import Optional, Tuple
import pandas as pd

def get_data_dir() -> str:
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(base_dir, "data")

def load_mandi_prices(file_path: Optional[str] = None) -> Tuple[pd.DataFrame, str]:
    """
    Loads mandi daily price and arrivals dataset.
    Returns (DataFrame, provenance: 'REAL_AGMARKNET' or 'SYNTHETIC_DEMO').
    """
    data_dir = get_data_dir()
    provenance = "REAL_AGMARKNET"

    if file_path is None:
        real_path = os.path.join(data_dir, "raw", "agmarknet_mandi_prices_real.csv")
        demo_path = os.path.join(data_dir, "demo", "synthetic_mandi_prices.csv")
        if os.path.exists(real_path):
            file_path = real_path
            provenance = "REAL_AGMARKNET"
        elif os.path.exists(demo_path):
            file_path = demo_path
            provenance = "SYNTHETIC_DEMO"
        else:
            raise FileNotFoundError(f"Neither real Agmarknet export ({real_path}) nor demo fixture ({demo_path}) found.")

    df = pd.read_csv(file_path)
    required_cols = {"date", "commodity", "market", "district", "state", "min_price", "max_price", "modal_price", "arrivals"}
    missing = required_cols - set(df.columns)
    if missing:
        raise ValueError(f"Mandi price dataset missing required columns: {missing}")

    df["date"] = pd.to_datetime(df["date"])
    df["commodity"] = df["commodity"].astype(str).str.strip().str.capitalize()
    df["market"] = df["market"].astype(str).str.strip().str.title()
    df["district"] = df["district"].astype(str).str.strip().str.title()
    df["state"] = df["state"].astype(str).str.strip().str.title()
    df["min_price"] = pd.to_numeric(df["min_price"], errors="coerce")
    df["max_price"] = pd.to_numeric(df["max_price"], errors="coerce")
    df["modal_price"] = pd.to_numeric(df["modal_price"], errors="coerce")
    df["arrivals"] = pd.to_numeric(df["arrivals"], errors="coerce")

    return df, provenance

def load_weather_data(file_path: Optional[str] = None) -> Tuple[pd.DataFrame, str]:
    """
    Loads agroclimatological daily weather dataset.
    Returns (DataFrame, provenance: 'REAL_WEATHER' or 'SYNTHETIC_DEMO').
    """
    data_dir = get_data_dir()
    provenance = "REAL_WEATHER"

    if file_path is None:
        real_path = os.path.join(data_dir, "raw", "india_agri_weather_real.csv")
        demo_path = os.path.join(data_dir, "demo", "synthetic_agri_weather.csv")
        if os.path.exists(real_path):
            file_path = real_path
            provenance = "REAL_WEATHER"
        elif os.path.exists(demo_path):
            file_path = demo_path
            provenance = "SYNTHETIC_DEMO"
        else:
            raise FileNotFoundError(f"Weather dataset not found at {demo_path}")

    df = pd.read_csv(file_path)
    required_cols = {"date", "district", "state", "temp_mean", "temp_min", "temp_max", "rainfall", "humidity"}
    missing = required_cols - set(df.columns)
    if missing:
        raise ValueError(f"Weather dataset missing required columns: {missing}")

    df["date"] = pd.to_datetime(df["date"])
    df["district"] = df["district"].astype(str).str.strip().str.title()
    df["state"] = df["state"].astype(str).str.strip().str.title()
    for col in ["temp_mean", "temp_min", "temp_max", "rainfall", "humidity"]:
        df[col] = pd.to_numeric(df[col], errors="coerce")

    return df, provenance

def load_crop_recommendation_data(file_path: Optional[str] = None) -> Tuple[pd.DataFrame, str]:
    """
    Loads authentic open Crop Recommendation benchmark dataset.
    Returns (DataFrame, provenance: 'ATHARVA_INAMDAR_BENCHMARK').
    """
    if file_path is None:
        file_path = os.path.join(get_data_dir(), "raw", "crop_recommendation.csv")

    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Crop recommendation dataset not found at {file_path}")

    df = pd.read_csv(file_path)
    if "label" in df.columns and "crop" not in df.columns:
        df.rename(columns={"label": "crop"}, inplace=True)

    required_cols = {"N", "P", "K", "temperature", "humidity", "ph", "rainfall", "crop"}
    missing = required_cols - set(df.columns)
    if missing:
        raise ValueError(f"Crop recommendation dataset missing required columns: {missing}")

    for col in ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]:
        df[col] = pd.to_numeric(df[col], errors="coerce")
    df["crop"] = df["crop"].astype(str).str.strip().str.lower()

    return df, "ATHARVA_INAMDAR_BENCHMARK"
