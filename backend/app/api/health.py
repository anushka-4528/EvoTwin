from datetime import datetime
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.security import get_current_user
from app.database.connection import get_db
from app.schemas.health import HealthLogCreate, HealthLogOut, WellnessSummary
from app.services.wellness_index import calculate_wellness_index

router = APIRouter(prefix="/health", tags=["health"])


@router.get("/logs", response_model=list[HealthLogOut])
async def list_logs(current_user: Dict[str, Any] = Depends(get_current_user)):
    db = get_db()
    logs = []
    async for doc in db.health_logs.find({"user_id": current_user["user_id"]}).sort("date", -1):
        doc["id"] = str(doc["_id"])
        logs.append(HealthLogOut(**doc))
    return logs


@router.post("/logs", response_model=HealthLogOut)
async def create_log(payload: HealthLogCreate, current_user: Dict[str, Any] = Depends(get_current_user)):
    db = get_db()
    date_value = payload.date or datetime.utcnow().date().isoformat()
    score, completeness = calculate_wellness_index(payload.model_dump(exclude_none=True))
    log_doc = {
        "user_id": current_user["user_id"],
        "date": date_value,
        **payload.model_dump(exclude_none=True),
        "wellness_index": score,
        "completeness": completeness,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    result = await db.health_logs.insert_one(log_doc)
    inserted = await db.health_logs.find_one({"_id": result.inserted_id})
    inserted["id"] = str(inserted["_id"])
    return HealthLogOut(**inserted)


@router.get("/summary", response_model=WellnessSummary)
async def get_summary(current_user: Dict[str, Any] = Depends(get_current_user)):
    db = get_db()
    logs = [doc async for doc in db.health_logs.find({"user_id": current_user["user_id"]}).sort("date", 1)]
    if not logs:
        return WellnessSummary(average_index=0.0, latest_index=0.0, completeness=0.0, domain_summary={})
    indexes = [float(doc.get("wellness_index", 0.0)) for doc in logs]
    summary = {
        "average_index": round(sum(indexes) / len(indexes), 2),
        "latest_index": round(indexes[-1], 2),
        "completeness": round(sum(float(doc.get("completeness", 0.0)) for doc in logs) / len(logs), 2),
        "domain_summary": {
            "sleep_hours": sum(float(doc.get("sleep_hours", 0.0) or 0.0) for doc in logs) / max(1, len(logs)),
            "hydration_liters": sum(float(doc.get("hydration_liters", 0.0) or 0.0) for doc in logs) / max(1, len(logs)),
        },
    }
    return WellnessSummary(**summary)
