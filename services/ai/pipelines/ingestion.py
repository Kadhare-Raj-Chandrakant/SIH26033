"""
SIH26033 Data Ingestion Module
------------------------------
Standardized ingestion adapters for raw agricultural datasets.
Loads data, enforces unified schema naming, and verifies essential columns.
"""

import os
from typing import Optional
import pandas as pd

def get_data_dir() -> str:
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(base_dir, "data")

def load_mandi_prices(file_path: Optional[str] = None) -> pd.DataFrame:
    """
    Loads raw Agmarknet mandi daily price and arrivals dataset.
    """
    if file_path is None:
        file_path = os.path.join(get_data_dir(), "raw", "agmarknet_mandi_prices.csv")
    
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Mandi price dataset not found at {file_path}")
    
    df = pd.read_csv(file_path)
    required_cols = {"date", "commodity", "market", "district", "state", "min_price", "max_price", "modal_price", "arrivals"}
    missing = required_cols - set(df.columns)
    if missing:
        raise ValueError(f"Mandi price dataset missing required columns: {missing}")
    
    # Standardize column types
    df["date"] = pd.to_datetime(df["date"])
    df["commodity"] = df["commodity"].astype(str).str.strip().str.capitalize()
    df["market"] = df["market"].astype(str).str.strip().str.title()
    df["district"] = df["district"].astype(str).str.strip().str.title()
    df["state"] = df["state"].astype(str).str.strip().str.title()
    df["min_price"] = pd.to_numeric(df["min_price"], errors="coerce")
    df["max_price"] = pd.to_numeric(df["max_price"], errors="coerce")
    df["modal_price"] = pd.to_numeric(df["modal_price"], errors="coerce")
    df["arrivals"] = pd.to_numeric(df["arrivals"], errors="coerce")

    return df

def load_weather_data(file_path: Optional[str] = None) -> pd.DataFrame:
    """
    Loads raw IMD / NASA POWER agroclimatological daily weather dataset.
    """
    if file_path is None:
        file_path = os.path.join(get_data_dir(), "raw", "india_agri_weather.csv")
    
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Weather dataset not found at {file_path}")
    
    df = pd.read_csv(file_path)
    required_cols = {"date", "district", "state", "temp_mean", "temp_min", "temp_max", "rainfall", "humidity"}
    missing = required_cols - set(df.columns)
    if missing:
        raise ValueError(f"Weather dataset missing required columns: {missing}")
    
    df["date"] = pd.to_datetime(df["date"])
    df["district"] = df["district"].astype(str).str.strip().str.title()
    df["state"] = df["state"].astype(str).str.strip().str.title()
    df["temp_mean"] = pd.to_numeric(df["temp_mean"], errors="coerce")
    df["temp_min"] = pd.to_numeric(df["temp_min"], errors="coerce")
    df["temp_max"] = pd.to_numeric(df["temp_max"], errors="coerce")
    df["rainfall"] = pd.to_numeric(df["rainfall"], errors="coerce")
    df["humidity"] = pd.to_numeric(df["humidity"], errors="coerce")

    return df

def load_crop_recommendation_data(file_path: Optional[str] = None) -> pd.DataFrame:
    """
    Loads raw ICAR / agricultural research crop recommendation dataset.
    """
    if file_path is None:
        file_path = os.path.join(get_data_dir(), "raw", "crop_recommendation.csv")
    
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Crop recommendation dataset not found at {file_path}")
    
    df = pd.read_csv(file_path)
    required_cols = {"N", "P", "K", "temperature", "humidity", "ph", "rainfall", "crop"}
    missing = required_cols - set(df.columns)
    if missing:
        raise ValueError(f"Crop dataset missing required columns: {missing}")
    
    for col in ["N", "P", "K", "temperature", "humidity", "ph", "rainfall"]:
        df[col] = pd.to_numeric(df[col], errors="coerce")
    df["crop"] = df["crop"].astype(str).str.strip().str.lower()

    return df

def load_platform_transactions(file_path: Optional[str] = None) -> pd.DataFrame:
    """
    Loads platform order transactions test fixture (synthetic / demo).
    """
    if file_path is None:
        file_path = os.path.join(get_data_dir(), "raw", "synthetic_platform_transactions.csv")
    
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Platform transactions dataset not found at {file_path}")
    
    df = pd.read_csv(file_path)
    return df
