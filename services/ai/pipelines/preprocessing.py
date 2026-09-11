"""
SIH26033 Data Preprocessing & Cleaning Module
---------------------------------------------
Cleans, normalizes, handles outliers and missing values, and saves
processed datasets ready for feature engineering and ML training.
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
    Cleans and normalizes mandi prices dataset:
    - Sorts chronologically by commodity, market, date
    - Deduplicates by keeping last valid observation
    - Imputes occasional APMC off-day missing prices via forward-fill per commodity-market track
    - Normalizes strings
    """
    df = df.copy()
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values(by=["commodity", "market", "date"]).reset_index(drop=True)
    df = df.drop_duplicates(subset=["date", "commodity", "market"], keep="last")

    # Grouped forward fill for price continuity across trading tracks
    df["modal_price"] = df.groupby(["commodity", "market"])["modal_price"].ffill().bfill()
    df["min_price"] = df.groupby(["commodity", "market"])["min_price"].ffill().bfill()
    df["max_price"] = df.groupby(["commodity", "market"])["max_price"].ffill().bfill()
    df["arrivals"] = df.groupby(["commodity", "market"])["arrivals"].ffill().bfill()

    # Outlier clipping at 99.9th percentile to remove erroneous extreme spikes
    for col in ["modal_price", "min_price", "max_price"]:
        q999 = df[col].quantile(0.999)
        df[col] = df[col].clip(upper=q999)

    return df

def clean_weather_data(df: pd.DataFrame) -> pd.DataFrame:
    """
    Cleans agro-weather dataset:
    - Sorts by district and date
    - Fills minor missing sensor values via interpolation
    """
    df = df.copy()
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values(by=["district", "date"]).reset_index(drop=True)
    df = df.drop_duplicates(subset=["date", "district"], keep="last")

    for col in ["temp_mean", "temp_min", "temp_max", "rainfall", "humidity"]:
        df[col] = df.groupby("district")[col].transform(lambda group: group.interpolate().ffill().bfill())

    return df

def clean_crop_recommendation(df: pd.DataFrame) -> pd.DataFrame:
    """
    Cleans crop recommendation dataset:
    - Removes exact duplicate rows if any
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

    # Impute any missing district weather via cross-district state median
    for col in ["temp_mean", "temp_min", "temp_max", "rainfall", "humidity"]:
        merged[col] = merged[col].fillna(merged[col].median())

    return merged

def process_all_and_save():
    """
    Executes end-to-end cleaning and saves processed CSV artifacts.
    """
    data_dir = get_data_dir()
    processed_dir = os.path.join(data_dir, "processed")
    os.makedirs(processed_dir, exist_ok=True)

    mandi_raw = load_mandi_prices()
    weather_raw = load_weather_data()
    crop_raw = load_crop_recommendation_data()

    mandi_cleaned = clean_mandi_prices(mandi_raw)
    weather_cleaned = clean_weather_data(weather_raw)
    crop_cleaned = clean_crop_recommendation(crop_raw)
    merged_mandi = merge_mandi_and_weather(mandi_raw, weather_raw)

    mandi_cleaned.to_csv(os.path.join(processed_dir, "mandi_prices_cleaned.csv"), index=False)
    weather_cleaned.to_csv(os.path.join(processed_dir, "weather_cleaned.csv"), index=False)
    crop_cleaned.to_csv(os.path.join(processed_dir, "crop_recommendation_cleaned.csv"), index=False)
    merged_mandi.to_csv(os.path.join(processed_dir, "mandi_weather_merged.csv"), index=False)

    print(f"[Preprocessing] Processed datasets saved to {processed_dir}")

if __name__ == "__main__":
    process_all_and_save()
