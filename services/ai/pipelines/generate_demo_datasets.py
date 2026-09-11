"""
SIH26033 Synthetic Demonstration Fixture Generator
--------------------------------------------------
DISCLOSURE NOTICE:
THIS SCRIPT GENERATES SYNTHETIC / DEMO FIXTURES FOR SYSTEM INTEGRATION AND
PIPELINE VALIDATION PURPOSES ONLY.
THESE ARE NOT REAL FIELD OBSERVATIONS.

Generates:
1. `services/ai/data/demo/synthetic_mandi_prices.csv`:
   Modeled on wholesale APMC seasonal supply/demand clearing dynamics.
2. `services/ai/data/demo/synthetic_agri_weather.csv`:
   Modeled on regional agro-climatic temperature and rainfall patterns.
3. `services/ai/data/demo/synthetic_platform_transactions.csv`:
   Sample future platform sales transactions contract fixture.
"""

import os
import math
from datetime import datetime, timedelta
import numpy as np
import pandas as pd

def get_demo_dir() -> str:
    current_dir = os.path.dirname(os.path.abspath(__file__))
    demo_dir = os.path.join(current_dir, "..", "data", "demo")
    os.makedirs(demo_dir, exist_ok=True)
    return demo_dir

def generate_demo_weather_dataset(output_path: str):
    """
    Generates synthetic agro-climatic weather observations across 6 sample agricultural districts
    for pipeline testing.
    """
    np.random.seed(101)
    
    districts = {
        "Nashik": {"state": "Maharashtra", "lat": 19.9975, "lon": 73.7898, "base_t": 26.0, "t_range": 12.0, "rain_tot": 800, "hum_base": 62},
        "Pune": {"state": "Maharashtra", "lat": 18.5204, "lon": 73.8567, "base_t": 25.5, "t_range": 11.5, "rain_tot": 750, "hum_base": 65},
        "Hubballi": {"state": "Karnataka", "lat": 15.3647, "lon": 75.1240, "base_t": 27.0, "t_range": 8.0, "rain_tot": 720, "hum_base": 60},
        "Kolar": {"state": "Karnataka", "lat": 13.1367, "lon": 78.1292, "base_t": 24.5, "t_range": 9.0, "rain_tot": 740, "hum_base": 63},
        "Ludhiana": {"state": "Punjab", "lat": 30.9010, "lon": 75.8573, "base_t": 24.0, "t_range": 18.0, "rain_tot": 650, "hum_base": 55},
        "Agra": {"state": "Uttar Pradesh", "lat": 27.1767, "lon": 78.0081, "base_t": 26.0, "t_range": 17.0, "rain_tot": 620, "hum_base": 52},
    }

    start_date = datetime(2023, 1, 1)
    end_date = datetime(2025, 12, 31)
    num_days = (end_date - start_date).days + 1

    rows = []
    for dist_name, dist_info in districts.items():
        for d_idx in range(num_days):
            cur_date = start_date + timedelta(days=d_idx)
            day_of_year = cur_date.timetuple().tm_yday
            
            temp_season = -math.cos(2 * math.pi * (day_of_year - 15) / 365.25)
            mean_temp = dist_info["base_t"] + (dist_info["t_range"] / 2.0) * temp_season + np.random.normal(0, 1.2)
            temp_min = mean_temp - np.random.uniform(4.0, 7.0)
            temp_max = mean_temp + np.random.uniform(4.0, 8.0)

            is_monsoon = 150 <= day_of_year <= 270
            if is_monsoon:
                rain_prob = 0.45
                rain = float(np.random.exponential(scale=14.0)) if np.random.rand() < rain_prob else 0.0
                humidity = float(np.clip(dist_info["hum_base"] + 22.0 + np.random.normal(0, 5), 40, 98))
            else:
                rain_prob = 0.04
                rain = float(np.random.exponential(scale=3.0)) if np.random.rand() < rain_prob else 0.0
                humidity = float(np.clip(dist_info["hum_base"] - 12.0 + np.random.normal(0, 6), 18, 75))

            rows.append({
                "date": cur_date.strftime("%Y-%m-%d"),
                "district": dist_name,
                "state": dist_info["state"],
                "latitude": dist_info["lat"],
                "longitude": dist_info["lon"],
                "temp_mean": round(float(mean_temp), 2),
                "temp_min": round(float(temp_min), 2),
                "temp_max": round(float(temp_max), 2),
                "rainfall": round(float(rain), 2),
                "humidity": round(float(humidity), 2)
            })

    df = pd.DataFrame(rows)
    df.to_csv(output_path, index=False)
    print(f"[Demo Dataset] Generated Synthetic Agro-Weather fixture ({len(df)} rows) -> {output_path}")

def generate_demo_mandi_dataset(output_path: str):
    """
    Generates synthetic mandi price and arrival observations across sample APMC tracks.
    """
    np.random.seed(2026)

    mandi_commodity_matrix = [
        ("Onion", "Lasalgaon", "Nashik", "Maharashtra", "Red", "FAQ", 2100, 3200, 11),
        ("Onion", "Nashik", "Nashik", "Maharashtra", "Local", "FAQ", 1950, 2500, 11),
        ("Onion", "Pune", "Pune", "Maharashtra", "Local", "Medium", 2200, 1800, 11),
        ("Tomato", "Kolar", "Kolar", "Karnataka", "Hybrid", "Grade A", 1750, 1600, 7),
        ("Tomato", "Hubballi", "Hubballi", "Karnataka", "Local", "FAQ", 1550, 1200, 8),
        ("Tomato", "Nashik", "Nashik", "Maharashtra", "Deshi", "FAQ", 1650, 1400, 8),
        ("Potato", "Agra", "Agra", "Uttar Pradesh", "Desi", "FAQ", 1350, 3800, 2),
        ("Potato", "Pune", "Pune", "Maharashtra", "Jyoti", "Medium", 1600, 2100, 3),
        ("Wheat", "Ludhiana", "Ludhiana", "Punjab", "PBW-343", "FAQ", 2275, 4500, 4),
        ("Wheat", "Khanna", "Ludhiana", "Punjab", "Kalyan Sona", "Grade A", 2350, 5200, 4),
        ("Rice", "Hubballi", "Hubballi", "Karnataka", "Sona Masuri", "FAQ", 3400, 1800, 12),
        ("Rice", "Ludhiana", "Ludhiana", "Punjab", "Basmati 1121", "Grade A", 4100, 2400, 11),
    ]

    start_date = datetime(2023, 1, 1)
    end_date = datetime(2025, 12, 31)
    num_days = (end_date - start_date).days + 1

    rows = []
    for item in mandi_commodity_matrix:
        comm, market, dist, state, variety, grade, base_price, base_arr, peak_month = item
        
        for d_idx in range(num_days):
            cur_date = start_date + timedelta(days=d_idx)
            if cur_date.weekday() == 6 and np.random.rand() < 0.85:
                continue

            year_fraction = d_idx / 365.25
            month = cur_date.month

            month_dist = abs(month - peak_month)
            if month_dist > 6:
                month_dist = 12 - month_dist
            
            season_arrival_mult = 1.0 + 0.85 * math.exp(-0.5 * (month_dist / 1.2) ** 2)
            season_price_mult = 1.0 - 0.25 * math.exp(-0.5 * (month_dist / 1.4) ** 2) + 0.15 * math.exp(-0.5 * ((month_dist - 5) / 1.8) ** 2)
            trend_mult = 1.0 + 0.05 * year_fraction

            daily_arrivals = base_arr * season_arrival_mult * (1.0 + np.random.normal(0, 0.18))
            daily_arrivals = max(50.0, float(daily_arrivals))

            noise = np.random.normal(0, 0.06)
            modal_p = base_price * season_price_mult * trend_mult * (1.0 + noise)
            modal_p = max(400.0, float(modal_p))
            
            spread = modal_p * np.random.uniform(0.04, 0.10)
            min_p = max(300.0, modal_p - spread)
            max_p = modal_p + spread * np.random.uniform(0.8, 1.4)

            rows.append({
                "date": cur_date.strftime("%Y-%m-%d"),
                "commodity": comm,
                "market": market,
                "district": dist,
                "state": state,
                "variety": variety,
                "grade": grade,
                "min_price": round(float(min_p), 2),
                "max_price": round(float(max_p), 2),
                "modal_price": round(float(modal_p), 2),
                "arrivals": round(daily_arrivals, 2)
            })

    df = pd.DataFrame(rows)
    df.to_csv(output_path, index=False)
    print(f"[Demo Dataset] Generated Synthetic Mandi Prices fixture ({len(df)} rows) -> {output_path}")

def generate_demo_platform_transactions(output_path: str):
    """
    Constructs sample platform transaction dataset representing future platform sales.
    """
    np.random.seed(999)

    commodities = [
        ("Wheat", "Nashik", "Maharashtra", 24.0, "KG"),
        ("Tomato", "Hubballi", "Karnataka", 28.0, "KG"),
        ("Onion", "Nashik", "Maharashtra", 32.0, "KG"),
        ("Potato", "Pune", "Maharashtra", 22.0, "KG"),
        ("Rice", "Hubballi", "Karnataka", 55.0, "KG"),
    ]

    start_date = datetime(2025, 1, 1)
    rows = []
    for i in range(600):
        comm, loc, st, base_p, unit = commodities[i % len(commodities)]
        order_date = start_date + timedelta(days=int(i / 2))
        qty = round(float(np.random.uniform(50.0, 5000.0)), 2)
        listed_price = round(float(base_p * np.random.uniform(0.95, 1.15)), 2)
        negotiated_price = round(float(listed_price * np.random.uniform(0.92, 1.0)), 2)
        final_price = negotiated_price
        fulfillment_days = int(np.random.choice([1, 2, 3, 4, 5], p=[0.2, 0.4, 0.25, 0.1, 0.05]))
        outcome = np.random.choice(["DELIVERED_ON_TIME", "DELIVERED_LATE", "CANCELLED"], p=[0.88, 0.09, 0.03])

        rows.append({
            "order_id": f"ORD-SYNTH-{1000 + i}",
            "commodity": comm,
            "seller_type": np.random.choice(["FARMER", "FPO"]),
            "buyer_type": np.random.choice(["RETAILER", "WHOLESALER", "BULK_PROCESSOR"]),
            "location": loc,
            "state": st,
            "quantity": qty,
            "unit": unit,
            "listed_price_per_unit": listed_price,
            "negotiated_price_per_unit": negotiated_price,
            "final_price_per_unit": final_price,
            "order_date": order_date.strftime("%Y-%m-%d"),
            "order_status": "COMPLETED" if outcome != "CANCELLED" else "CANCELLED",
            "fulfillment_days": fulfillment_days,
            "delivery_outcome": outcome,
            "platform_fee_inr": round(final_price * qty * 0.02, 2)
        })

    df = pd.DataFrame(rows)
    df.to_csv(output_path, index=False)
    print(f"[Demo Dataset] Generated Synthetic Platform Transactions fixture ({len(df)} rows) -> {output_path}")

def generate_all_demo_fixtures():
    demo_dir = get_demo_dir()
    generate_demo_weather_dataset(os.path.join(demo_dir, "synthetic_agri_weather.csv"))
    generate_demo_mandi_dataset(os.path.join(demo_dir, "synthetic_mandi_prices.csv"))
    generate_demo_platform_transactions(os.path.join(demo_dir, "synthetic_platform_transactions.csv"))
    print(f"[Demo Generator] All synthetic demo fixtures generated in {demo_dir}")

if __name__ == "__main__":
    generate_all_demo_fixtures()
