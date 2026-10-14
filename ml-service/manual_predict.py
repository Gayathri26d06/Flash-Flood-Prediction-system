"""
Inference helper for the manual four-input disaster classifier.
"""

import os
import numpy as np
import joblib
import pandas as pd

FEATURE_COLUMNS = ["rainfall", "temperature", "humidity", "soil_moisture"]
MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "manual_disaster_model.joblib")

_model = None

# ------------------------------------------------------------------
# Risk-level banding for the prototype classifier's probability output.
#
# NOTE: this probability is the Random Forest's class-1 confidence on a
# SYNTHETIC training distribution. It is NOT a scientifically validated
# real-world flash-flood probability and must not be presented as one.
# ------------------------------------------------------------------
# Thresholds are env-tunable so you can re-band the output without editing
# code. Set MANUAL_RISK_CRITICAL_THRESHOLD=101 to disable the CRITICAL tier
# entirely and cap the output at HIGH, matching the original 3-tier behaviour.
def _threshold(name: str, default: float) -> float:
    try:
        return float(os.environ.get(name, default))
    except (TypeError, ValueError):
        return default


RISK_THRESHOLDS = [
    (_threshold("MANUAL_RISK_CRITICAL_THRESHOLD", 85.0), "CRITICAL"),
    (_threshold("MANUAL_RISK_HIGH_THRESHOLD", 70.0), "HIGH"),
    (_threshold("MANUAL_RISK_MODERATE_THRESHOLD", 40.0), "MODERATE"),
    (0.0, "LOW"),
]

MESSAGES = {
    "CRITICAL": (
        "Extreme environmental conditions detected by the prototype classifier. "
        "Treat as a screening signal only and cross-check official IMD/CWC warnings immediately."
    ),
    "HIGH": (
        "High-risk environmental conditions detected. Use this prototype result "
        "as an additional screening signal and verify against official warnings."
    ),
    "MODERATE": (
        "Moderately elevated conditions. The prototype model suggests staying alert "
        "and monitoring rainfall and soil saturation trends."
    ),
    "LOW": (
        "The entered conditions indicate relatively lower disaster risk in the prototype model."
    ),
}


def risk_level_from_probability(probability: float) -> str:
    """Map a 0-100 model probability onto LOW/MODERATE/HIGH/CRITICAL."""
    for threshold, level in RISK_THRESHOLDS:
        if probability >= threshold:
            return level
    return "LOW"



class ManualModelNotLoadedError(Exception):
    pass


def load_model():
    global _model
    if not os.path.exists(MODEL_PATH):
        raise ManualModelNotLoadedError(
            f"Manual disaster model not found at {MODEL_PATH}. Run `python train_manual.py` first."
        )
    _model = joblib.load(MODEL_PATH)
    print(f"[manual_predict] Model loaded from {MODEL_PATH}")
    return _model


def is_model_loaded():
    return _model is not None


def predict(features: dict) -> dict:
    if _model is None:
        raise ManualModelNotLoadedError("Manual disaster model is not loaded.")

    values = []
    for feature in FEATURE_COLUMNS:
        try:
            value = float(features[feature])
        except (KeyError, TypeError, ValueError):
            raise ValueError(f"Feature '{feature}' must be numeric.")
        values.append(value)

    X = pd.DataFrame([values], columns=FEATURE_COLUMNS)
    prediction = int(_model.predict(X)[0])

    probabilities = _model.predict_proba(X)[0]
    classes = list(_model.classes_)
    probability = float(probabilities[classes.index(1)] * 100) if 1 in classes else 0.0

    disaster = prediction == 1
    risk_level = risk_level_from_probability(probability)

    return {
        "disaster": disaster,
        "prediction": "DISASTER LIKELY" if disaster else "NO DISASTER",
        "probability": round(probability, 2),
        "risk_level": risk_level,
        "message": MESSAGES[risk_level],
        "model_source": "Prototype Random Forest classifier",
    }
