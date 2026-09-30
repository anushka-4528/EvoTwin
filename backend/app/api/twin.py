from typing import Any, Dict

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException

from app.core.security import get_current_user
from app.database.connection import get_db
from app.services.memory_service import list_memories

router = APIRouter(prefix="/twin", tags=["twin"])


@router.get("")
async def get_twin(current_user: Dict[str, Any] = Depends(get_current_user)):
    db = get_db()
    try:
        user_id = ObjectId(current_user["user_id"])
    except InvalidId as exc:
        raise HTTPException(status_code=401, detail="Invalid user token") from exc
    user = await db.users.find_one({"_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    twin = await db.digital_twins.find_one({"user_id": current_user["user_id"]})
    if not twin:
        twin = {"user_id": current_user["user_id"], "derived_wellness": {}, "version": 1}
    else:
        twin = dict(twin)
    twin["id"] = str(twin.pop("_id", ""))
    twin["profile"] = {key: value for key, value in user.items() if key not in {"_id", "password_hash", "created_at"}}
    twin["goals"] = user.get("goals", [])
    twin["onboarding_completed"] = user.get("onboarding_completed", False)
    twin["long_term_memories"] = await list_memories(current_user["user_id"], "long_term")
    twin["session_memories"] = await list_memories(current_user["user_id"], "session")
    return twin


@router.get("/history")
async def twin_history(current_user: Dict[str, Any] = Depends(get_current_user)):
    db = get_db()
    events = []
    async for event in db.twin_history.find({"user_id": current_user["user_id"]}).sort("created_at", -1):
        event["id"] = str(event.pop("_id"))
        events.append(event)
    return events
