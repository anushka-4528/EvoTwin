from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from bson import ObjectId
from bson.errors import InvalidId

from app.database.connection import get_db


async def get_twin_for_user(user_id: str) -> Dict[str, Any]:
    db = get_db()
    twin = await db.digital_twins.find_one({"user_id": user_id})
    if not twin:
        return {
            "user_id": user_id,
            "profile": {},
            "goals": [],
            "long_term_memories": [],
            "session_memories": [],
            "derived_wellness": {},
            "version": 1,
            "updated_at": datetime.utcnow(),
        }
    return twin


async def create_memory(user_id: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    db = get_db()
    now = datetime.utcnow()
    memory_type = payload.get("memory_type", "long_term")
    expires_at = payload.get("expires_at")
    if memory_type == "session" and expires_at is None:
        expires_at = now + timedelta(hours=24)
    doc = {
        "user_id": user_id,
        "category": payload["category"],
        "content": payload["content"],
        "memory_type": memory_type,
        "source": payload.get("source", "user_input"),
        "confidence": float(payload.get("confidence", 0.5)),
        "importance": float(payload.get("importance", 0.5)),
        "active": True,
        "created_at": now,
        "updated_at": now,
        "expires_at": expires_at,
    }
    result = await db.memories.insert_one(doc)
    stored = await db.memories.find_one({"_id": result.inserted_id})
    stored["id"] = str(stored["_id"])
    twin = await db.digital_twins.find_one({"user_id": user_id})
    if twin:
        await db.digital_twins.update_one(
            {"_id": twin["_id"]},
            {"$set": {"updated_at": doc["updated_at"], "version": twin.get("version", 1) + 1}},
        )
    await db.twin_history.insert_one({
        "user_id": user_id,
        "event_type": "memory_added",
        "summary": "A note for today was saved." if memory_type == "session" else "A preference was saved for future suggestions.",
        "created_at": doc["created_at"],
    })
    return stored


async def list_memories(user_id: str, memory_type: Optional[str] = None) -> List[Dict[str, Any]]:
    db = get_db()
    query = {"user_id": user_id, "active": True}
    if memory_type:
        query["memory_type"] = memory_type
    records = []
    now = datetime.utcnow()
    async for item in db.memories.find(query):
        expires_at = item.get("expires_at")
        if expires_at is not None and expires_at <= now:
            continue
        record = dict(item)
        record["id"] = str(record.pop("_id"))
        records.append(record)
    return records


async def delete_memory(user_id: str, memory_id: str) -> None:
    db = get_db()
    try:
        object_id = ObjectId(memory_id)
    except InvalidId:
        return
    now = datetime.utcnow()
    result = await db.memories.update_one({"_id": object_id, "user_id": user_id}, {"$set": {"active": False, "updated_at": now}})
    if result.matched_count:
        await _record_twin_change(db, user_id, "memory_archived", "A saved preference was removed.", now)


async def clear_session_memories(user_id: str) -> int:
    db = get_db()
    now = datetime.utcnow()
    result = await db.memories.update_many(
        {"user_id": user_id, "memory_type": "session", "active": True},
        {"$set": {"active": False, "updated_at": now}},
    )
    if result.matched_count:
        await _record_twin_change(db, user_id, "session_memory_cleared", "Notes for today were cleared.", now)
    return result.matched_count


async def _record_twin_change(db: Any, user_id: str, event_type: str, summary: str, timestamp: datetime) -> None:
    twin = await db.digital_twins.find_one({"user_id": user_id})
    if twin:
        await db.digital_twins.update_one(
            {"_id": twin["_id"]},
            {"$set": {"updated_at": timestamp, "version": twin.get("version", 1) + 1}},
        )
    await db.twin_history.insert_one({
        "user_id": user_id,
        "event_type": event_type,
        "summary": summary,
        "created_at": timestamp,
    })


async def approve_memory(user_id: str, memory_id: str) -> Dict[str, Any]:
    db = get_db()
    doc = await db.memories.find_one({"_id": memory_id, "user_id": user_id})
    if doc:
        await db.memories.update_one({"_id": memory_id}, {"$set": {"active": True, "updated_at": datetime.utcnow()}})
        return {"status": "approved"}
    return {"status": "not_found"}
