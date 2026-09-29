from typing import Any, Dict

from fastapi import APIRouter, Depends

from app.core.security import get_current_user
from app.database.connection import get_db

router = APIRouter(prefix="/twin", tags=["twin"])


@router.get("")
async def get_twin(current_user: Dict[str, Any] = Depends(get_current_user)):
    db = get_db()
    twin = await db.digital_twins.find_one({"user_id": current_user["user_id"]})
    if not twin:
        return {"user_id": current_user["user_id"], "profile": {}, "goals": [], "long_term_memories": [], "session_memories": [], "derived_wellness": {}, "version": 1}
    twin["id"] = str(twin["_id"])
    return twin


@router.get("/history")
async def twin_history(current_user: Dict[str, Any] = Depends(get_current_user)):
    db = get_db()
    events = []
    async for event in db.twin_history.find({"user_id": current_user["user_id"]}).sort("created_at", -1):
        event["id"] = str(event["_id"])
        events.append(event)
    return events
