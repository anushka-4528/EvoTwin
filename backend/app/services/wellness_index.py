from typing import Dict, Tuple


def calculate_wellness_index(payload: Dict) -> Tuple[float, float]:
    domains = {
        "sleep_hours": payload.get("sleep_hours"),
        "hydration_liters": payload.get("hydration_liters"),
        "nutrition_score": payload.get("nutrition_score"),
        "stress_level": payload.get("stress_level"),
        "steps": payload.get("steps"),
    }
    available = {k: v for k, v in domains.items() if v is not None}
    if not available:
        return 0.0, 0.0

    def normalize_sleep(value):
        return min(100, max(0, (value / 8) * 100))

    def normalize_hydration(value):
        return min(100, max(0, (value / 2.5) * 100))

    def normalize_steps(value):
        return min(100, max(0, (value / 10000) * 100))

    def normalize_nutrition(value):
        return float(value)

    def normalize_stress(value):
        return max(0, 100 - float(value))

    scores = []
    for key, value in available.items():
        if key == "sleep_hours":
            scores.append(normalize_sleep(value))
        elif key == "hydration_liters":
            scores.append(normalize_hydration(value))
        elif key == "steps":
            scores.append(normalize_steps(value))
        elif key == "nutrition_score":
            scores.append(normalize_nutrition(value))
        elif key == "stress_level":
            scores.append(normalize_stress(value))

    index = sum(scores) / len(scores)
    completeness = len(available) / len(domains)
    return round(index, 2), round(completeness, 2)
