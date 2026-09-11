"""
SIH26033 Real Mandi Data Ingestion Adapter
------------------------------------------
PURPOSE:
Provides a standardized schema ingestion interface for authentic Agmarknet daily price
and arrival datasets.

HOW TO OBTAIN REAL AGMARKNET DATA:
1. Navigate to the official Agmarknet portal: https://agmarknet.gov.in/
2. Select desired commodity (e.g. Tomato, Onion, Wheat, Potato, Rice) and state/market.
3. Download/export official daily price and arrival data as CSV.
4. Place the export at `services/ai/data/raw/agmarknet_mandi_prices_real.csv`.
5. Run this adapter to validate and normalize columns.

If real export is not present, this module falls back transparently to the synthetic
demonstration fixture in `services/ai/data/demo/` and marks the dataset origin as DEMO.
"""

import os
from typing import Tuple
import pandas as pd

REQUIRED_COLUMNS = [
    "date", "commodity", "market", "district", "state",
    "variety", "grade", "min_price", "max_price", "modal_price", "arrivals"
]

def get_mandi_dataset() -> Tuple[pd.DataFrame, str]:
    """
    Returns (dataframe, provenance_status).
    provenance_status will be 'REAL_AGMARKNET' or 'SYNTHETIC_DEMO'.
    """
    current_dir = os.path.dirname(os.path.abspath(__file__))
    raw_real_path = os.path.join(current_dir, "..", "data", "raw", "agmarknet_mandi_prices_real.csv")
    demo_path = os.path.join(current_dir, "..", "data", "demo", "synthetic_mandi_prices.csv")

    if os.path.exists(raw_real_path):
        print(f"[Ingestion Adapter] Ingesting REAL Agmarknet data from {raw_real_path}...")
        df = pd.read_csv(raw_real_path)
        # Normalize column casing and standard schema
        df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]
        for col in REQUIRED_COLUMNS:
            if col not in df.columns:
                raise ValueError(f"Real Agmarknet export missing required column: {col}")
        return df, "REAL_AGMARKNET"
    else:
        print("[Ingestion Adapter] No external real Agmarknet CSV found at data/raw/agmarknet_mandi_prices_real.csv.")
        print("[Ingestion Adapter] Falling back to verified demonstration baseline at data/demo/synthetic_mandi_prices.csv.")
        print("[Ingestion Adapter] PROVENANCE: SYNTHETIC_DEMO (Clearly labeled demo fixture)")
        df = pd.read_csv(demo_path)
        return df, "SYNTHETIC_DEMO"

if __name__ == "__main__":
    df, status = get_mandi_dataset()
    print(f"Loaded {len(df)} rows with provenance: {status}")
