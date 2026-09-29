from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.security import get_current_user
from app.ml.synthetic_pipeline import train_and_save_model, what_if_prediction

router = APIRouter(prefix="/predict", tags=["predict"])


class ScenarioInput(BaseModel):
    sleep_hours: float
    steps: int
    hydration_liters: float
    stress_level: int
    nutrition_score: int


@router.post("/train")
async def train_model(current_user: Dict[str, Any] = Depends(get_current_user)):
    metrics = train_and_save_model()
    return metrics


@router.get("/latest")
async def latest_model_metrics(current_user: Dict[str, Any] = Depends(get_current_user)):
    model_path = "backend/data/model_metadata.json"
    try:
        import json
        with open(model_path, "r", encoding="utf-8") as file:
            return json.load(file)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Model not trained yet") from exc


@router.post("/what-if")
async def what_if(payload: ScenarioInput, current_user: Dict[str, Any] = Depends(get_current_user)):
    return what_if_prediction(payload.model_dump())
