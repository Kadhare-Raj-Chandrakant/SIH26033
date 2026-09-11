"""
SIH26033 Data Preprocessing & Cleaning Module
---------------------------------------------
Cleans, normalizes, and handles missing values with ZERO FUTURE LEAKAGE.

STRICT ZERO LEAKAGE POLICY:
1. NO backward-filling (`bfill()`) anywhere in time series.
2. NO bidirectional interpolation across time points.
3. NO global parameter estimation (medians, quantiles) across the combined train/val/test span.
4. Only forward-filling (`ffill()`) along chronological time within commodity-market tracks.
"""

import os
import pandas as pd
from .ingestion import (
    load_mandi_prices,
    load_weather_data,
    load_crop_recommendation_data,
    get_data_dir
)

def clean_mandi_prices(df: pd.DataFrame) -> pd.DataFrame:
    """
    Cleans and normalizes mandi prices dataset strictly forward-in-time:
    - Sorts chronologically by commodity, market, date
    - Deduplicates by keeping last valid observation
    - Imputes occasional APMC off-day missing prices via FORWARD-FILL ONLY per track
    - Drops leading unobserved dates before trading began (NO bfill)
    """
    df = df.copy()
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values(by=["commodity", "market", "date"]).reset_index(drop=True)
    df = df.drop_duplicates(subset=["date", "commodity", "market"], keep="last")

    # Grouped FORWARD FILL ONLY for market closures / off-days
    df["modal_price"] = df.groupby(["commodity", "market"])["modal_price"].ffill()
    df["min_price"] = df.groupby(["commodity", "market"])["min_price"].ffill()
    df["max_price"] = df.groupby(["commodity", "market"])["max_price"].ffill()
    df["arrivals"] = df.groupby(["commodity", "market"])["arrivals"].ffill()

    # Drop any leading rows where forward-fill could not populate initial values (NO bfill allowed)
    df = df.dropna(subset=["modal_price", "arrivals"]).reset_index(drop=True)

    return df

def clean_weather_data(df: pd.DataFrame) -> pd.DataFrame:
    """
    Cleans agro-weather dataset strictly forward-in-time:
    - Sorts by district and date
    - Fills minor missing sensor values via FORWARD-FILL ONLY (NO bfill, NO future interpolation)
    """
    df = df.copy()
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values(by=["district", "date"]).reset_index(drop=True)
    df = df.drop_duplicates(subset=["date", "district"], keep="last")

    for col in ["temp_mean", "temp_min", "temp_max", "rainfall", "humidity"]:
        df[col] = df.groupby("district")[col].ffill()

    df = df.dropna(subset=["temp_mean", "rainfall", "humidity"]).reset_index(drop=True)
    return df

def clean_crop_recommendation(df: pd.DataFrame) -> pd.DataFrame:
    """
    Cleans crop recommendation dataset:
    - Removes exact duplicate rows
    - Standardizes target label casing
    """
    df = df.copy()
    df = df.drop_duplicates()
    df["crop"] = df["crop"].str.strip().str.lower()
    return df

def merge_mandi_and_weather(mandi_df: pd.DataFrame, weather_df: pd.DataFrame) -> pd.DataFrame:
    """
    Left-joins historical weather features onto mandi price observations
    keyed by (district, date).
    """
    mandi_clean = clean_mandi_prices(mandi_df)
    weather_clean = clean_weather_data(weather_df)

    weather_cols = ["date", "district", "temp_mean", "temp_min", "temp_max", "rainfall", "humidity"]
    merged = pd.merge(
        mandi_clean,
        weather_clean[weather_cols],
        on=["date", "district"],
        how="left"
    )

    return merged

def process_all_and_save():
    """
    Executes end-to-end cleaning and saves processed CSV artifacts.
    """
    data_dir = get_data_dir()
    processed_dir = os.path.join(data_dir, "processed")
    os.makedirs(processed_dir, exist_ok=True)

    mandi_raw, mandi_prov = load_mandi_prices()
    weather_raw, weather_prov = load_weather_data()
    crop_raw, crop_prov = load_crop_recommendation_data()

    print(f"[Preprocessing] Mandi data provenance: {mandi_prov}")
    print(f"[Preprocessing] Weather data provenance: {weather_prov}")
    print(f"[Preprocessing] Crop benchmark provenance: {crop_prov}")

    mandi_cleaned = clean_mandi_prices(mandi_raw)
    weather_cleaned = clean_weather_data(weather_raw)
    crop_cleaned = clean_crop_recommendation(crop_raw)
    merged_mandi = merge_mandi_and_weather(mandi_raw, weather_raw)

    mandi_cleaned.to_csv(os.path.join(processed_dir, "mandi_prices_cleaned.csv"), index=False)
    weather_cleaned.to_csv(os.path.join(processed_dir, "weather_cleaned.csv"), index=False)
    crop_cleaned.to_csv(os.path.join(processed_dir, "crop_recommendation_cleaned.csv"), index=False)
    merged_mandi.to_csv(os.path.join(processed_dir, "mandi_weather_merged.csv"), index=False)

    print(f"[Preprocessing] Cleaned datasets saved to {processed_dir} with ZERO backward-filling.")

if __name__ == "__main__":
    process_all_and_save()
