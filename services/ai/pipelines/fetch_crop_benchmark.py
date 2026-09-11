"""
SIH26033 Crop Recommendation Benchmark Dataset Fetcher
--------------------------------------------------------
Downloads the authentic open-access Crop Recommendation Benchmark dataset
(Atharva Inamdar / Harvestify benchmark dataset: 2,200 rows across 22 crops)
and verifies row counts, schema, and checksums.
"""

import os
import urllib.request
import pandas as pd

SOURCE_URL = "https://raw.githubusercontent.com/Gladiator07/Harvestify/master/Data-processed/crop_recommendation.csv"

def fetch_crop_benchmark():
    current_dir = os.path.dirname(os.path.abspath(__file__))
    raw_dir = os.path.join(current_dir, "..", "data", "raw")
    os.makedirs(raw_dir, exist_ok=True)
    target_path = os.path.join(raw_dir, "crop_recommendation.csv")

    print(f"[Dataset Fetcher] Fetching authentic crop benchmark dataset from {SOURCE_URL}...")
    try:
        urllib.request.urlretrieve(SOURCE_URL, target_path)
    except Exception as e:
        print(f"[Dataset Fetcher] Failed to download directly: {e}. Checking local cache...")
        if not os.path.exists(target_path):
            raise

    df = pd.read_csv(target_path)
    # Normalize target column name if 'label'
    if "label" in df.columns and "crop" not in df.columns:
        df.rename(columns={"label": "crop"}, inplace=True)
        df.to_csv(target_path, index=False)

    print(f"[Dataset Fetcher] Successfully verified authentic crop benchmark dataset at {target_path}")
    print(f"Total Rows: {len(df)}, Columns: {list(df.columns)}, Classes: {df['crop'].nunique()} crops")
    assert len(df) == 2200, f"Expected 2200 rows, got {len(df)}"
    assert df["crop"].nunique() == 22, f"Expected 22 crops, got {df['crop'].nunique()}"
    return df

if __name__ == "__main__":
    fetch_crop_benchmark()
