"""
generate_synthetic_dataset.py
==============================
Generates a realistic SYNTHETIC training dataset for the flash-flood
risk Random Forest model, used only because a real, labeled,
village-level flash flood/landslide sensor dataset is not available
for this SIH 2026 prototype.

IMPORTANT / DISCLAIMER
-----------------------
This dataset is entirely synthetic. It is generated from a simple,
hand-crafted physical/statistical heuristic (NOT observed data) and
must never be presented as real disaster records, IMD data, or
verified government measurements. Its only purpose is to give the
Random Forest model a plausible signal to learn from for demo
purposes.

The generation logic intentionally builds in a domain-informed
relationship between (rainfall intensity, soil moisture, river
level, slope, historical risk) and flood risk, with added Gaussian
noise, so the trained model behaves sensibly during live demos
without claiming forecasting accuracy.
"""

import numpy as np
import pandas as pd

FEATURE_COLUMNS = [
    "rainfall_1h",
    "rainfall_3h",
    "rainfall_6h",
    "rainfall_24h",
    "soil_moisture",
    "river_level",
    "humidity",
    "temperature",
    "slope",
    "elevation",
    "historical_risk",
]


def _clip(arr, lo, hi):
    return np.clip(arr, lo, hi)


def generate_dataset(n_samples: int = 6000, random_state: int = 42) -> pd.DataFrame:
    """Generates a synthetic, labeled dataset of shape (n_samples, len(FEATURE_COLUMNS) + 1).

    Returns a DataFrame with feature columns plus a 'risk_score' target (0-100).
    """
    rng = np.random.default_rng(random_state)

    # Base rainfall intensity (mm) at 1h resolution, right-skewed
    # (most of the time it's calm; occasionally extreme).
    rainfall_1h = _clip(rng.gamma(shape=1.4, scale=20, size=n_samples), 0, 200)

    # Multi-hour accumulation windows correlate with rainfall_1h but
    # accumulate with their own noise/variability.
    rainfall_3h = _clip(rainfall_1h * rng.uniform(1.6, 2.6, n_samples) + rng.normal(0, 8, n_samples), 0, 400)
    rainfall_6h = _clip(rainfall_3h * rng.uniform(1.3, 1.9, n_samples) + rng.normal(0, 10, n_samples), 0, 600)
    rainfall_24h = _clip(rainfall_6h * rng.uniform(1.5, 2.8, n_samples) + rng.normal(0, 15, n_samples), 0, 900)

    # Soil moisture rises with recent rainfall, saturates near 100.
    soil_moisture = _clip(
        30 + 0.25 * rainfall_6h + rng.normal(0, 8, n_samples), 5, 100
    )

    # River level responds to 6h/24h rainfall with a lag-like relationship.
    river_level = _clip(
        15 + 0.20 * rainfall_6h + 0.05 * rainfall_24h + rng.normal(0, 10, n_samples), 0, 100
    )

    humidity = _clip(50 + 0.15 * rainfall_1h + rng.normal(0, 10, n_samples), 20, 100)
    temperature = _clip(26 - 0.03 * rainfall_1h + rng.normal(0, 3, n_samples), 5, 40)

    # Static terrain / location attributes
    slope = _clip(rng.normal(28, 8, n_samples), 2, 60)
    elevation = _clip(rng.normal(1300, 500, n_samples), 50, 3500)
    historical_risk = _clip(rng.beta(2, 3, n_samples), 0, 1)

    # ---- Heuristic risk score construction (0-100) ----
    # Weighted combination reflecting domain intuition:
    #   heavy rain + saturated soil + high river level + steep slope
    #   + high historical risk => higher risk.
    score = (
        0.22 * (rainfall_1h / 150 * 100)
        + 0.15 * (rainfall_24h / 500 * 100)
        + 0.20 * soil_moisture
        + 0.20 * river_level
        + 0.10 * (slope / 60 * 100)
        + 0.13 * (historical_risk * 100)
    )

    # Non-linear boost when multiple extreme conditions co-occur
    # (captures compounding real-world danger).
    extreme_mask = (rainfall_1h > 90) & (soil_moisture > 75) & (river_level > 70)
    score = np.where(extreme_mask, score * 1.15, score)

    # Add noise and clip to valid range
    score = _clip(score + rng.normal(0, 6, n_samples), 0, 100)

    df = pd.DataFrame(
        {
            "rainfall_1h": rainfall_1h,
            "rainfall_3h": rainfall_3h,
            "rainfall_6h": rainfall_6h,
            "rainfall_24h": rainfall_24h,
            "soil_moisture": soil_moisture,
            "river_level": river_level,
            "humidity": humidity,
            "temperature": temperature,
            "slope": slope,
            "elevation": elevation,
            "historical_risk": historical_risk,
            "risk_score": score,
        }
    )

    return df.round(2)


if __name__ == "__main__":
    dataset = generate_dataset()
    out_path = "data/synthetic_training_data.csv"
    dataset.to_csv(out_path, index=False)
    print(f"Generated {len(dataset)} synthetic rows -> {out_path}")
    print("NOTE: This is SYNTHETIC data for prototype training only.")
