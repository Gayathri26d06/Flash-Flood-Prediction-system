"""
predict.py
==========
Loads the trained Random Forest model and exposes a single
`predict(features: dict) -> dict` function used by main.py (FastAPI).

Input dict must contain exactly the FEATURE_COLUMNS defined in
data/generate_synthetic_dataset.py:
    rainfall_1h, rainfall_3h, rainfall_6h, rainfall_24h,
    soil_moisture, river_level, humidity, temperature,
    slope, elevation, historical_risk

Output dict:
    {
        "risk_score": float (0-100),
        "risk_level": "LOW" | "MODERATE" | "HIGH" | "CRITICAL",
        "confidence": float (0-1),
        "lead_time_minutes": int
    }
"""

import os
import json
import numpy as np
import joblib

from risk_engine import score_to_risk_level, estimate_lead_time_minutes, apply_safety_floor

MODEL_PATH = os.path.join("models", "flood_model.joblib")
FEATURES_PATH = os.path.join("models", "feature_list.json")

_model = None
_feature_list = None


class ModelNotLoadedError(Exception):
    pass


def load_model():
    """Loads the model + feature list into module-level cache.
    Called once at FastAPI startup (see main.py)."""
    global _model, _feature_list

    if not os.path.exists(MODEL_PATH):
        raise ModelNotLoadedError(
            f"Model file not found at {MODEL_PATH}. Run `python train.py` first."
        )

    _model = joblib.load(MODEL_PATH)

    if os.path.exists(FEATURES_PATH):
        with open(FEATURES_PATH) as f:
            _feature_list = json.load(f)["features"]
    else:
        # Fallback — should not normally happen if train.py ran correctly.
        _feature_list = [
            "rainfall_1h", "rainfall_3h", "rainfall_6h", "rainfall_24h",
            "soil_moisture", "river_level", "humidity", "temperature",
            "slope", "elevation", "historical_risk",
        ]

    print(f"[predict] Model loaded from {MODEL_PATH} with {len(_feature_list)} features.")
    return _model, _feature_list


def is_model_loaded() -> bool:
    return _model is not None


def validate_features(features: dict):
    if _feature_list is None:
        raise ModelNotLoadedError("Model/feature list not loaded yet.")

    missing = [f for f in _feature_list if f not in features]
    if missing:
        raise ValueError(f"Missing required feature(s): {missing}")

    for key in _feature_list:
        try:
            float(features[key])
        except (TypeError, ValueError):
            raise ValueError(f"Feature '{key}' must be numeric, got: {features[key]!r}")


def _model_confidence(model, X_row: np.ndarray) -> float:
    """
    RandomForestRegressor has no native predict_proba for regression,
    so we approximate confidence using inverse-normalized variance
    across the ensemble's individual tree predictions: tighter
    agreement across trees => higher confidence.
    """
    tree_preds = np.array([tree.predict(X_row)[0] for tree in model.estimators_])
    std = float(np.std(tree_preds))
    # Map std (0 -> most confident, ~25+ -> least confident) to a 0.5-0.99 range.
    confidence = 0.99 - min(std / 25, 1.0) * 0.49
    return round(max(0.5, min(0.99, confidence)), 3)


def predict(features: dict) -> dict:
    if _model is None or _feature_list is None:
        raise ModelNotLoadedError("Model is not loaded. Call load_model() at startup.")

    validate_features(features)

    X_row = np.array([[float(features[f]) for f in _feature_list]])
    raw_score = float(_model.predict(X_row)[0])
    raw_score = apply_safety_floor(raw_score, features)
    raw_score = round(max(0, min(100, raw_score)), 2)

    risk_level = score_to_risk_level(raw_score)
    confidence = _model_confidence(_model, X_row)
    lead_time_minutes = estimate_lead_time_minutes(risk_level, features)

    return {
        "risk_score": raw_score,
        "risk_level": risk_level,
        "confidence": confidence,
        "lead_time_minutes": lead_time_minutes,
    }
