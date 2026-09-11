"""
SIH26033 Train/Validation/Test Splitters Module
------------------------------------------------
Provides strict time-aware chronological splitting for time-series forecasting
(Mandi Prices & Arrivals) to prevent look-ahead bias and data leakage,
and stratified splitting for tabular crop recommendation.
"""

from typing import Tuple, Dict, Any
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split

def chronological_time_split(
    df: pd.DataFrame,
    date_col: str = "date",
    train_ratio: float = 0.70,
    val_ratio: float = 0.15,
    test_ratio: float = 0.15
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, Dict[str, Any]]:
    """
    Splits time-series data chronologically into train, validation, and test partitions.
    
    CRITICAL METHODOLOGY:
    - Sorts records strictly by date ascending.
    - Earliest dates belong to the Train partition.
    - Intermediate dates belong to the Validation partition.
    - Most recent dates belong to the Test partition.
    - ZERO temporal leakage: test dates are strictly strictly greater than val dates,
      which are strictly greater than train dates.
    """
    assert abs((train_ratio + val_ratio + test_ratio) - 1.0) < 1e-5, "Ratios must sum to 1.0"
    
    df = df.copy()
    df[date_col] = pd.to_datetime(df[date_col])
    df = df.sort_values(by=[date_col]).reset_index(drop=True)

    unique_dates = df[date_col].drop_duplicates().sort_values().reset_index(drop=True)
    n_dates = len(unique_dates)

    train_end_idx = int(n_dates * train_ratio)
    val_end_idx = int(n_dates * (train_ratio + val_ratio))

    train_cutoff_date = unique_dates.iloc[train_end_idx - 1]
    val_cutoff_date = unique_dates.iloc[val_end_idx - 1]

    train_df = df[df[date_col] <= train_cutoff_date].copy().reset_index(drop=True)
    val_df = df[(df[date_col] > train_cutoff_date) & (df[date_col] <= val_cutoff_date)].copy().reset_index(drop=True)
    test_df = df[df[date_col] > val_cutoff_date].copy().reset_index(drop=True)

    split_metadata = {
        "strategy": "chronological_time_split",
        "train_rows": len(train_df),
        "val_rows": len(val_df),
        "test_rows": len(test_df),
        "train_date_range": [train_df[date_col].min().strftime("%Y-%m-%d"), train_df[date_col].max().strftime("%Y-%m-%d")],
        "val_date_range": [val_df[date_col].min().strftime("%Y-%m-%d"), val_df[date_col].max().strftime("%Y-%m-%d")],
        "test_date_range": [test_df[date_col].min().strftime("%Y-%m-%d"), test_df[date_col].max().strftime("%Y-%m-%d")],
        "leakage_assertion": bool(train_df[date_col].max() < val_df[date_col].min() < test_df[date_col].min())
    }

    return train_df, val_df, test_df, split_metadata

def stratified_classification_split(
    df: pd.DataFrame,
    target_col: str = "crop",
    train_ratio: float = 0.70,
    val_ratio: float = 0.15,
    test_ratio: float = 0.15,
    random_state: int = 42
) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame, Dict[str, Any]]:
    """
    Splits tabular crop recommendation dataset using stratified sampling
    to preserve balanced multi-class proportions across partitions.
    """
    assert abs((train_ratio + val_ratio + test_ratio) - 1.0) < 1e-5, "Ratios must sum to 1.0"
    
    # First split off train (70%) vs temp (30%)
    temp_ratio = val_ratio + test_ratio
    train_df, temp_df = train_test_split(
        df,
        test_size=temp_ratio,
        stratify=df[target_col],
        random_state=random_state
    )

    # Split temp (30%) into validation (15%) and test (15%)
    val_share_of_temp = val_ratio / temp_ratio
    val_df, test_df = train_test_split(
        temp_df,
        test_size=(1.0 - val_share_of_temp),
        stratify=temp_df[target_col],
        random_state=random_state
    )

    metadata = {
        "strategy": "stratified_classification_split",
        "random_state": random_state,
        "train_rows": len(train_df),
        "val_rows": len(val_df),
        "test_rows": len(test_df),
        "num_classes": df[target_col].nunique(),
        "train_class_counts": train_df[target_col].value_counts().to_dict(),
        "val_class_counts": val_df[target_col].value_counts().to_dict(),
        "test_class_counts": test_df[target_col].value_counts().to_dict()
    }

    return (
        train_df.reset_index(drop=True),
        val_df.reset_index(drop=True),
        test_df.reset_index(drop=True),
        metadata
    )
