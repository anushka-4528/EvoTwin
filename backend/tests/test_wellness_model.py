from app.ml.synthetic_pipeline import generate_synthetic_data, train_and_save_model, what_if_prediction


def test_synthetic_data_and_training():
    df = generate_synthetic_data(n_rows=50, seed=7)
    assert len(df) == 50
    assert "wellness_index" in df.columns

    metrics = train_and_save_model()
    assert metrics["dataset_size"]["total"] > 0
    assert "mae" in metrics

    result = what_if_prediction({"sleep_hours": 8, "steps": 10000, "hydration_liters": 3.0, "nutrition_score": 75, "stress_level": 30})
    assert result["status"] == "ok"
