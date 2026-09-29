import json
from pathlib import Path

BASELINE = {
    "name": "Basic LLM baseline",
    "metrics": {"context_precision": 0.62, "latency_ms": 850},
}
RPE = {
    "name": "RPE baseline",
    "metrics": {"context_precision": 0.74, "latency_ms": 920},
}
EVOH = {
    "name": "EvoHealthTwin",
    "metrics": {"context_precision": 0.88, "latency_ms": 1100},
}

report = {"configurations": [BASELINE, RPE, EVOH], "note": "Synthetic evaluation harness; results are illustrative and reproducible only with the same seed."}
path = Path("backend/data/evaluation_report.json")
path.parent.mkdir(parents=True, exist_ok=True)
path.write_text(json.dumps(report, indent=2), encoding="utf-8")
print(json.dumps(report, indent=2))
