"""
train.py
========
Trains the Random Forest flash-flood risk regression model.

Steps:
  1. Load dataset (real CSV if present at data/training_data.csv,
     otherwise generate a SYNTHETIC dataset for prototype purposes)
  2. Validate required columns
  3. Handle missing values
  4. Basic preprocessing
  5. Train Random Forest Regressor
  6. Evaluate model (MAE, RMSE, R^2)
  7. Print metrics
  8. Save model + feature list via Joblib

Usage:
    python train.py
"""

import os
import sys
import json

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import joblib

from data.generate_synthetic_dataset import generate_dataset, FEATURE_COLUMNS

TARGET_COLUMN = "risk_score"
REAL_DATA_PATH = os.path.join("data", "training_data.csv")
SYNTHETIC_DATA_PATH = os.path.join("data", "synthetic_training_data.csv")
MODEL_DIR = "models"
MODEL_PATH = os.path.join(MODEL_DIR, "flood_model.joblib")
FEATURES_PATH = os.path.join(MODEL_DIR, "feature_list.json")


def load_dataset() -> pd.DataFrame:
    """Loads a real dataset if available, otherwise generates and
    caches a synthetic one. Always prints which source was used."""
    if os.path.exists(REAL_DATA_PATH):
        print(f"[train] Loading REAL dataset from {REAL_DATA_PATH}")
        df = pd.read_csv(REAL_DATA_PATH)
        df.attrs["synthetic"] = False
        return df

    print("[train] No real dataset found at data/training_data.csv.")
    print("[train] Generating SYNTHETIC training dataset for prototype purposes.")
    print("[train] NOTE: This is NOT real disaster/sensor data — see data/generate_synthetic_dataset.py")
    df = generate_dataset()
    os.makedirs("data", exist_ok=True)
    df.to_csv(SYNTHETIC_DATA_PATH, index=False)
    df.attrs["synthetic"] = True
    return df


def validate_columns(df: pd.DataFrame):
    required = FEATURE_COLUMNS + [TARGET_COLUMN]
    missing = [c for c in required if c not in df.columns]
    if missing:
        print(f"[train] ERROR: Dataset is missing required columns: {missing}")
        sys.exit(1)
    print(f"[train] All {len(required)} required columns present.")


def handle_missing_values(df: pd.DataFrame) -> pd.DataFrame:
    before = len(df)
    n_missing = df[FEATURE_COLUMNS + [TARGET_COLUMN]].isna().sum().sum()
    if n_missing > 0:
        print(f"[train] Found {n_missing} missing values — imputing with column medians.")
        for col in FEATURE_COLUMNS + [TARGET_COLUMN]:
            if df[col].isna().any():
                df[col] = df[col].fillna(df[col].median())
    df = df.dropna(subset=FEATURE_COLUMNS + [TARGET_COLUMN])
    after = len(df)
    if after < before:
        print(f"[train] Dropped {before - after} unrecoverable rows.")
    return df


def preprocess(df: pd.DataFrame) -> pd.DataFrame:
    # Clip target and key features to physically sensible bounds.
    df[TARGET_COLUMN] = df[TARGET_COLUMN].clip(0, 100)
    df["soil_moisture"] = df["soil_moisture"].clip(0, 100)
    df["humidity"] = df["humidity"].clip(0, 100)
    df["river_level"] = df["river_level"].clip(0, 100)
    df["historical_risk"] = df["historical_risk"].clip(0, 1)
    for col in ["rainfall_1h", "rainfall_3h", "rainfall_6h", "rainfall_24h", "slope", "elevation"]:
        df[col] = df[col].clip(lower=0)
    return df


def train_model(df: pd.DataFrame):
    X = df[FEATURE_COLUMNS]
    y = df[TARGET_COLUMN]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42
    )

    model = RandomForestRegressor(
        n_estimators=300,
        max_depth=14,
        min_samples_leaf=3,
        random_state=42,
        n_jobs=-1,
    )
    print(f"[train] Training RandomForestRegressor on {len(X_train)} samples...")
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    rmse = np.sqrt(mean_squared_error(y_test, y_pred))
    r2 = r2_score(y_test, y_pred)

    print("[train] Evaluation on held-out test set:")
    print(f"        MAE  = {mae:.3f}")
    print(f"        RMSE = {rmse:.3f}")
    print(f"        R^2  = {r2:.3f}")

    importances = sorted(
        zip(FEATURE_COLUMNS, model.feature_importances_), key=lambda x: x[1], reverse=True
    )
    print("[train] Feature importances:")
    for name, importance in importances:
        print(f"        {name:<18} {importance:.3f}")

    return model, {"mae": mae, "rmse": rmse, "r2": r2}


def save_model(model):
    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    with open(FEATURES_PATH, "w") as f:
        json.dump({"features": FEATURE_COLUMNS}, f, indent=2)
    print(f"[train] Model saved to {MODEL_PATH}")
    print(f"[train] Feature list saved to {FEATURES_PATH}")


def main():
    df = load_dataset()
    validate_columns(df)
    df = handle_missing_values(df)
    df = preprocess(df)
    model, metrics = train_model(df)
    save_model(model)
    print("[train] Done.")


if __name__ == "__main__":
    main()
