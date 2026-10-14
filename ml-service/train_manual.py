"""
Train the prototype manual disaster classifier.

Inputs:
  rainfall, temperature, humidity, soil_moisture

Target:
  disaster (0 = no disaster, 1 = disaster)

The default training data is synthetic and intended for demonstration.
"""

import os
import numpy as np
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score

from data.generate_manual_dataset import generate_manual_dataset, FEATURE_COLUMNS

MODEL_DIR = os.path.join(os.path.dirname(__file__), "models")
MODEL_PATH = os.path.join(MODEL_DIR, "manual_disaster_model.joblib")


def main():
    df = generate_manual_dataset()
    X = df[FEATURE_COLUMNS]
    y = df["disaster"]

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    model = RandomForestClassifier(
        n_estimators=300,
        max_depth=12,
        min_samples_leaf=3,
        class_weight="balanced",
        random_state=42,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)

    predicted = model.predict(X_test)
    print("[manual-train] Evaluation on held-out test set:")
    print(f"  Accuracy  = {accuracy_score(y_test, predicted):.3f}")
    print(f"  Precision = {precision_score(y_test, predicted, zero_division=0):.3f}")
    print(f"  Recall    = {recall_score(y_test, predicted, zero_division=0):.3f}")
    print(f"  F1        = {f1_score(y_test, predicted, zero_division=0):.3f}")

    os.makedirs(MODEL_DIR, exist_ok=True)
    joblib.dump(model, MODEL_PATH)
    print(f"[manual-train] Model saved to {MODEL_PATH}")
    print("[manual-train] NOTE: labels are synthetic prototype labels, not real disaster records.")


if __name__ == "__main__":
    main()
