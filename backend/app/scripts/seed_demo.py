import asyncio
from datetime import datetime

from app.database.connection import get_db


async def seed_demo():
    db = get_db()
    user = {
        "email": "demo@vitatwin.ai",
        "password_hash": "$2b$12$8w82IiEJ0mLvxD4i3Y0gMuz8s0dZ2dE9Gq0/0LwHYzjX3E8uC0l2y",
        "full_name": "Demo User",
        "age": 22,
        "occupation": "Student",
        "goals": ["Improve sleep", "Build sustainable activity routine"],
        "dietary_preferences": ["Balanced meals"],
        "activity_preferences": ["Evening workouts"],
        "health_history": "Student with variable schedule; prefers flexible routines.",
        "lifestyle_summary": "Busy schedule and college commitments.",
        "created_at": datetime.utcnow(),
    }
    existing = await db.users.find_one({"email": user["email"]})
    if not existing:
        await db.users.insert_one(user)

    twin = {
        "user_id": str(user["email"]),
        "profile": {"full_name": user["full_name"], "occupation": user["occupation"]},
        "goals": user["goals"],
        "long_term_memories": [],
        "session_memories": [],
        "derived_wellness": {"status": "demo"},
        "version": 1,
        "updated_at": datetime.utcnow(),
    }
    await db.digital_twins.update_one({"user_id": str(user["email"])}, {"$set": twin}, upsert=True)

    log = {
        "user_id": str(user["email"]),
        "date": datetime.utcnow().date().isoformat(),
        "sleep_hours": 7.0,
        "steps": 8500,
        "hydration_liters": 2.3,
        "nutrition_score": 76,
        "stress_level": 42,
        "notes": "Demo log",
        "wellness_index": 74.5,
        "completeness": 1.0,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    await db.health_logs.update_one({"user_id": str(user["email"]), "date": log["date"]}, {"$set": log}, upsert=True)


if __name__ == "__main__":
    asyncio.run(seed_demo())
    print("Demo dataset seeded.")
