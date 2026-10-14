"""
Prototype training data generator for the manual four-input disaster classifier.

This is synthetic demo data, not observed disaster records.
Replace the generated labels with a real labelled dataset when available.
"""

import numpy as np
import pandas as pd

FEATURE_COLUMNS = ["rainfall", "temperature", "humidity", "soil_moisture"]


def generate_manual_dataset(n_samples: int = 8000, random_state: int = 42) -> pd.DataFrame:
    rng = np.random.default_rng(random_state)

    rainfall = np.clip(rng.gamma(shape=1.6, scale=28, size=n_samples), 0, 300)
    temperature = np.clip(rng.normal(28, 5, n_samples), 5, 45)
    humidity = np.clip(45 + 0.18 * rainfall + rng.normal(0, 10, n_samples), 20, 100)
    soil_moisture = np.clip(25 + 0.22 * rainfall + 0.20 * (humidity - 50) + rng.normal(0, 10, n_samples), 5, 100)

    # Prototype environmental risk heuristic used ONLY to create labels.
    # Rainfall and soil saturation dominate; humidity supports the signal.
    rain_component = np.clip(rainfall / 180 * 100, 0, 100)
    soil_component = soil_moisture
    humidity_component = humidity
    temperature_component = np.clip((35 - temperature) / 20 * 100, 0, 100)

    score = (
        0.50 * rain_component
        + 0.28 * soil_component
        + 0.17 * humidity_component
        + 0.05 * temperature_component
        + rng.normal(0, 5, n_samples)
    )

    disaster = (score >= 55).astype(int)

    return pd.DataFrame({
        "rainfall": rainfall,
        "temperature": temperature,
        "humidity": humidity,
        "soil_moisture": soil_moisture,
        "disaster": disaster,
    }).round(2)
