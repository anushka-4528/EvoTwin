from datetime import datetime
from typing import Any, Dict, List, Optional

from bson import ObjectId

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
    doc = {
        "user_id": user_id,
        "category": payload["category"],
        "content": payload["content"],
        "memory_type": payload.get("memory_type", "long_term"),
        "source": payload.get("source", "user_input"),
        "confidence": float(payload.get("confidence", 0.5)),
        "importance": float(payload.get("importance", 0.5)),
        "active": True,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "expires_at": payload.get("expires_at"),
    }
    result = await db.memories.insert_one(doc)
    stored = await db.memories.find_one({"_id": result.inserted_id})
    stored["id"] = str(stored["_id"])
    return stored


async def list_memories(user_id: str, memory_type: Optional[str] = None) -> List[Dict[str, Any]]:
    db = get_db()
    query = {"user_id": user_id, "active": True}
    if memory_type:
        query["memory_type"] = memory_type
    records = []
    async for item in db.memories.find(query):
        item["id"] = str(item["_id"])
        records.append(item)
    return records


async def delete_memory(user_id: str, memory_id: str) -> None:
    db = get_db()
    await db.memories.update_one({"_id": ObjectId(memory_id), "user_id": user_id}, {"$set": {"active": False, "updated_at": datetime.utcnow()}})


async def approve_memory(user_id: str, memory_id: str) -> Dict[str, Any]:
    db = get_db()
    doc = await db.memories.find_one({"_id": memory_id, "user_id": user_id})
    if doc:
        await db.memories.update_one({"_id": memory_id}, {"$set": {"active": True, "updated_at": datetime.utcnow()}})
        return {"status": "approved"}
    return {"status": "not_found"}
