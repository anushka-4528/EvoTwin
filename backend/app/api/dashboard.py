from typing import Any, Dict

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException

from app.core.security import get_current_user
from app.database.connection import get_db

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary")
async def dashboard_summary(current_user: Dict[str, Any] = Depends(get_current_user)):
    db = get_db()
    try:
        user_id = ObjectId(current_user["user_id"])
    except InvalidId as exc:
        raise HTTPException(status_code=401, detail="Invalid user token") from exc
    user = await db.users.find_one({"_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    twin = await db.digital_twins.find_one({"user_id": current_user["user_id"]})
    log_count = await db.health_logs.count_documents({"user_id": current_user["user_id"]})
    session_count = await db.chat_sessions.count_documents({"user_id": current_user["user_id"]})
    latest_log = None
    async for log in db.health_logs.find({"user_id": current_user["user_id"]}).sort("date", -1):
        latest_log = {
            "date": log.get("date"),
            "wellness_index": log.get("wellness_index"),
            "sleep_hours": log.get("sleep_hours"),
            "steps": log.get("steps"),
            "hydration_liters": log.get("hydration_liters"),
            "stress_level": log.get("stress_level"),
        }
        break
    recent_updates = []
    async for event in db.twin_history.find({"user_id": current_user["user_id"]}).sort("created_at", -1):
        recent_updates.append({"id": str(event.get("_id", "")), "summary": event.get("summary", "Twin updated."), "created_at": event.get("created_at")})
        if len(recent_updates) == 5:
            break
    return {
        "user": {"name": user.get("full_name"), "email": user.get("email")},
        "onboarding_completed": user.get("onboarding_completed", False),
        "goals": user.get("goals", []),
        "twin_version": twin.get("version", 1) if twin else 1,
        "log_count": log_count,
        "session_count": session_count,
        "latest_log": latest_log,
        "recent_updates": recent_updates,
        "status": "online",
    }
