"""
risk_engine.py
==============
Lightweight rule-based helpers used alongside the Random Forest
model inside the ML service:

  1. score_to_risk_level(score)  -> maps a 0-100 score to a label
  2. estimate_lead_time_minutes(...) -> PROTOTYPE lead-time heuristic

NOTE ON DESIGN:
The Node.js backend implements the authoritative HYBRID risk engine
(ML output + rule-based safety adjustments) described in the project
spec, since that is where final risk decisions, alerting, and
persistence happen. This module provides a lighter, local version so
the FastAPI service can return a complete, sensible payload
(risk_score, risk_level, confidence, lead_time_minutes) on its own,
which the Node backend then further combines with its own
rule-based adjustments for the final authoritative score.

IMPORTANT: The lead-time estimate here is a prototype heuristic only
and is NOT a validated operational flood forecast.
"""

RISK_LEVELS = {
    "LOW": (0, 30),
    "MODERATE": (31, 60),
    "HIGH": (61, 80),
    "CRITICAL": (81, 100),
}

LEAD_TIME_RANGES_MINUTES = {
    "CRITICAL": (20, 45),
    "HIGH": (30, 90),
    "MODERATE": (60, 180),
    "LOW": (0, 0),
}


def score_to_risk_level(score: float) -> str:
    if score >= RISK_LEVELS["CRITICAL"][0]:
        return "CRITICAL"
    if score >= RISK_LEVELS["HIGH"][0]:
        return "HIGH"
    if score >= RISK_LEVELS["MODERATE"][0]:
        return "MODERATE"
    return "LOW"


def estimate_lead_time_minutes(risk_level: str, features: dict) -> int:
    """PROTOTYPE ONLY — heuristic lead time, not a validated forecast."""
    if risk_level not in LEAD_TIME_RANGES_MINUTES or risk_level == "LOW":
        return 0

    lo, hi = LEAD_TIME_RANGES_MINUTES[risk_level]

    rainfall_severity = min(1.0, features.get("rainfall_1h", 0) / 150)
    river_severity = min(1.0, features.get("river_level", 0) / 100)
    soil_severity = min(1.0, features.get("soil_moisture", 0) / 100)

    severity = rainfall_severity * 0.45 + river_severity * 0.35 + soil_severity * 0.20

    span = hi - lo
    lead_time = round(hi - severity * span)
    return max(lo, min(hi, lead_time))


def apply_safety_floor(score: float, features: dict) -> float:
    """
    A minimal, conservative safety-net rule applied INSIDE the ML
    service itself: if conditions are unambiguously extreme, ensure
    the score doesn't fall below a sane floor even if the model
    under-predicts (e.g. sparse training coverage of extreme events).
    This is intentionally lighter than the Node backend's full hybrid
    rule engine, which remains the authoritative final adjustment layer.
    """
    if features.get("rainfall_1h", 0) > 120 and features.get("soil_moisture", 0) > 85:
        score = max(score, 75)
    if features.get("river_level", 0) > 90:
        score = max(score, 80)
    return min(100, max(0, score))
