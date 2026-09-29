import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split

MODEL_PATH = Path("backend/data")
MODEL_PATH.mkdir(parents=True, exist_ok=True)


def generate_synthetic_data(n_rows: int = 300, seed: int = 42):
    rng = np.random.default_rng(seed)
    dates = pd.date_range("2023-01-01", periods=n_rows, freq="D")
    sleep = rng.normal(7.0, 1.2, n_rows).clip(4, 10)
    steps = rng.normal(8000, 2500, n_rows).clip(2000, 18000).astype(int)
    hydration = rng.normal(2.2, 0.7, n_rows).clip(1.0, 4.0)
    nutrition = rng.normal(68, 16, n_rows).clip(20, 100).astype(int)
    stress = rng.normal(45, 20, n_rows).clip(0, 100).astype(int)
    trend = np.linspace(0, 2, n_rows)
    target = 55 + 8 * (sleep - 7) + 0.001 * steps + 12 * (hydration - 2.2) + 0.45 * nutrition - 0.35 * stress + trend * 4 + rng.normal(0, 6, n_rows)
    target = target.clip(20, 100)
    df = pd.DataFrame(
        {
            "date": dates,
            "sleep_hours": sleep,
            "steps": steps,
            "hydration_liters": hydration,
            "nutrition_score": nutrition,
            "stress_level": stress,
            "wellness_index": target,
        }
    )
    return df


def train_and_save_model():
    df = generate_synthetic_data()
    df = df.sort_values("date").reset_index(drop=True)
    split_index = int(len(df) * 0.8)
    train = df.iloc[:split_index]
    test = df.iloc[split_index:]

    features = ["sleep_hours", "steps", "hydration_liters", "nutrition_score", "stress_level"]
    X_train, X_test = train[features], test[features]
    y_train, y_test = train["wellness_index"], test["wellness_index"]

    baseline = y_train.mean()
    baseline_pred = np.full(len(y_test), baseline)
    model = RandomForestRegressor(random_state=42, n_estimators=200, max_depth=8)
    model.fit(X_train, y_train)
    pred = model.predict(X_test)

    metrics = {
        "dataset_size": {"train": len(train), "test": len(test), "total": len(df)},
        "mae": round(float(mean_absolute_error(y_test, pred)), 4),
        "rmse": round(float(np.sqrt(mean_squared_error(y_test, pred))), 4),
        "r2": round(float(r2_score(y_test, pred)), 4),
        "baseline_mae": round(float(mean_absolute_error(y_test, baseline_pred)), 4),
        "baseline_rmse": round(float(np.sqrt(mean_squared_error(y_test, baseline_pred))), 4),
        "note": "Synthetic wellness-index prediction, not medical risk estimation.",
    }

    with open(MODEL_PATH / "model_metadata.json", "w", encoding="utf-8") as file:
        json.dump(metrics, file)
    return metrics


def what_if_prediction(inputs: dict):
    model_path = MODEL_PATH / "model_metadata.json"
    if not model_path.exists():
        return {"status": "missing_model", "message": "Train the synthetic model before running a what-if simulation."}

    df = generate_synthetic_data()
    features = ["sleep_hours", "steps", "hydration_liters", "nutrition_score", "stress_level"]
    X = df[features]
    y = df["wellness_index"]
    model = RandomForestRegressor(random_state=42, n_estimators=200, max_depth=8)
    model.fit(X, y)
    scenario = np.array([[inputs.get("sleep_hours", 7.0), inputs.get("steps", 8000), inputs.get("hydration_liters", 2.2), inputs.get("nutrition_score", 70), inputs.get("stress_level", 45)]])
    prediction = float(model.predict(scenario)[0])
    return {
        "baseline_estimate": round(float(y.mean()), 2),
        "scenario_estimate": round(prediction, 2),
        "input_differences": inputs,
        "limitations": "This is a synthetic educational model and not a validated clinical prediction.",
        "status": "ok",
    }
