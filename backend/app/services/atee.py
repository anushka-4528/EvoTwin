import re
from datetime import datetime
from typing import Any, Dict

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import HTTPException

from app.services.memory_service import create_memory


AVOID_PATTERN = re.compile(r"\b(?:i\s+)?(?:do not like|don't like|dislike|avoid|hate|can't stand)\s+(?:doing\s+)?([^.!?;,]+)", re.IGNORECASE)
PREFER_PATTERN = re.compile(r"\b(?:i\s+)?(?:prefer|love|enjoy|(?<!don't )(?<!do not )like)\s+(?:doing\s+)?([^.!?;,]+)", re.IGNORECASE)
TRAILING_FILLERS = re.compile(r"\s+(?:either|too|as well|also)$", re.IGNORECASE)


def classify_activity_feedback(text: str) -> list[dict[str, str]]:
    changes: list[dict[str, str]] = []
    for category, pattern in (("avoided_activities", AVOID_PATTERN), ("preferred_activities", PREFER_PATTERN)):
        for match in pattern.finditer(text):
            activity = TRAILING_FILLERS.sub("", match.group(1).strip(" .\t\n")).strip()
            activity = re.sub(r"^(?:to\s+)?", "", activity).strip()
            if activity:
                activity = activity[:80]
                changes.append({"category": category, "activity": activity[:1].upper() + activity[1:]})
    return changes


async def apply_user_feedback(db: Any, user_id: str, correction: str) -> list[dict[str, str]]:
    try:
        user_object_id = ObjectId(user_id)
    except InvalidId as exc:
        raise HTTPException(status_code=401, detail="Invalid user token") from exc
    user = await db.users.find_one({"_id": user_object_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    changes = classify_activity_feedback(correction)
    if not changes:
        await create_memory(user_id, {
            "category": "current_feedback",
            "content": correction,
            "memory_type": "session",
            "source": "assistant_feedback",
            "confidence": 0.6,
            "importance": 0.5,
        })
        return []

    updates: dict[str, list[str]] = {}
    for change in changes:
        field = change["category"]
        existing = list(user.get(field, []))
        activity = change["activity"]
        if not any(item.casefold() == activity.casefold() for item in existing):
            existing.append(activity)
        updates[field] = existing
    await db.users.update_one({"_id": user_object_id}, {"$set": updates})

    twin = await db.digital_twins.find_one({"user_id": user_id})
    if twin:
        profile = {**twin.get("profile", {}), **updates}
        await db.digital_twins.update_one(
            {"_id": twin["_id"]},
            {"$set": {"profile": profile, "updated_at": datetime.utcnow(), "version": twin.get("version", 1) + 1}},
        )

    for change in changes:
        await create_memory(user_id, {
            "category": change["category"],
            "content": change["activity"],
            "memory_type": "long_term",
            "source": "assistant_feedback",
            "confidence": 0.85,
            "importance": 0.8,
        })
    return changes