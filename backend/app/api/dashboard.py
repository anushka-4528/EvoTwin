from typing import Any, Dict

from fastapi import APIRouter, Depends

from app.core.security import get_current_user
from app.database.connection import get_db

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary")
async def dashboard_summary(current_user: Dict[str, Any] = Depends(get_current_user)):
    db = get_db()
    user = await db.users.find_one({"_id": current_user["user_id"]})
    twin = await db.digital_twins.find_one({"user_id": current_user["user_id"]})
    log_count = await db.health_logs.count_documents({"user_id": current_user["user_id"]})
    session_count = await db.chat_sessions.count_documents({"user_id": current_user["user_id"]})
    return {
        "user": {"name": user.get("full_name"), "email": user.get("email")},
        "twin_version": twin.get("version", 1) if twin else 1,
        "log_count": log_count,
        "session_count": session_count,
        "status": "online",
    }
