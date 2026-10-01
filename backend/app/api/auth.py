from datetime import datetime
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from bson import ObjectId
from bson.errors import InvalidId

from app.core.config import get_settings
from app.core.security import create_access_token, get_current_user, hash_password, verify_password
from app.database.connection import get_db
from app.schemas.user import (
    OnboardingComplete,
    PasswordChange,
    TokenResponse,
    UserCreate,
    UserLogin,
    UserOut,
    UserProfileUpdate,
)

router = APIRouter(prefix="/auth", tags=["auth"])


def _user_object_id(user_id: str) -> ObjectId:
    try:
        return ObjectId(user_id)
    except InvalidId as exc:
        raise HTTPException(status_code=401, detail="Invalid user token") from exc


@router.post("/register", response_model=TokenResponse)
async def register_user(payload: UserCreate):
    db = get_db()
    existing = await db.users.find_one({"email": payload.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")

    user_doc = {
        "email": payload.email.lower(),
        "password_hash": hash_password(payload.password),
        "full_name": payload.full_name,
        "age": None,
        "gender": None,
        "occupation": None,
        "activity_level": None,
        "goals": [],
        "dietary_preferences": [],
        "activity_preferences": [],
        "exercise_preferences": [],
        "preferred_activities": [],
        "avoided_activities": [],
        "sleep_hours": None,
        "health_history": None,
        "lifestyle_summary": None,
        "onboarding_completed": False,
        "created_at": datetime.utcnow(),
    }
    result = await db.users.insert_one(user_doc)
    created = await db.users.find_one({"_id": result.inserted_id})

    twin = {
        "user_id": str(created["_id"]),
        "profile": {key: value for key, value in created.items() if key not in {"_id", "password_hash", "created_at"}},
        "goals": [],
        "long_term_memories": [],
        "session_memories": [],
        "derived_wellness": {"status": "new"},
        "version": 1,
        "updated_at": datetime.utcnow(),
        "created_at": datetime.utcnow(),
    }
    await db.digital_twins.insert_one(twin)

    token = create_access_token(str(created["_id"]))
    return TokenResponse(access_token=token, user=UserOut(**{**created, "id": str(created["_id"])}) )


@router.post("/login", response_model=TokenResponse)
async def login_user(payload: UserLogin):
    db = get_db()
    user = await db.users.find_one({"email": payload.email.lower()})
    if not user or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if "onboarding_completed" not in user:
        user["onboarding_completed"] = bool(user.get("age") is not None and user.get("goals"))
    token = create_access_token(str(user["_id"]))
    return TokenResponse(access_token=token, user=UserOut(**{**user, "id": str(user["_id"])}) )


@router.get("/me", response_model=UserOut)
async def get_me(current_user: Dict[str, Any] = Depends(get_current_user)):
    db = get_db()
    user = await db.users.find_one({"_id": _user_object_id(current_user["user_id"])})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserOut(**{**user, "id": str(user["_id"])})


@router.put("/me", response_model=UserOut)
async def update_me(payload: UserProfileUpdate, current_user: Dict[str, Any] = Depends(get_current_user)):
    db = get_db()
    user_id = _user_object_id(current_user["user_id"])
    update_data = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = await db.users.update_one({"_id": user_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    user = await db.users.find_one({"_id": user_id})
    twin = await db.digital_twins.find_one({"user_id": current_user["user_id"]})
    if twin:
        profile = {**twin.get("profile", {}), **{key: value for key, value in update_data.items() if key != "goals"}}
        goals = update_data.get("goals", twin.get("goals", []))
        await db.digital_twins.update_one(
            {"_id": twin["_id"]},
            {"$set": {"profile": profile, "goals": goals, "updated_at": datetime.utcnow(), "version": twin.get("version", 1) + 1}},
        )
        await db.twin_history.insert_one({
            "user_id": current_user["user_id"],
            "event_type": "profile_updated",
            "summary": "Personal wellness profile updated.",
            "created_at": datetime.utcnow(),
        })
    return UserOut(**{**user, "id": str(user["_id"])})


@router.post("/onboarding", response_model=UserOut)
async def complete_onboarding(payload: OnboardingComplete, current_user: Dict[str, Any] = Depends(get_current_user)):
    db = get_db()
    user_id = _user_object_id(current_user["user_id"])
    user_id_text = current_user["user_id"]
    if payload.health_consent != "Yes":
        payload = payload.model_copy(update={
            "health_conditions": [],
            "health_conditions_other": None,
            "health_history": None,
        })
    if payload.health_measurements_consent != "Yes":
        payload = payload.model_copy(update={
            "blood_pressure_systolic": None,
            "blood_pressure_diastolic": None,
            "heart_rate": None,
            "blood_glucose": None,
        })
    if payload.medications_status != "Yes":
        payload = payload.model_copy(update={"medications_details": None})
    if payload.gender != "Female" or payload.women_health_consent != "Yes":
        payload = payload.model_copy(update={
            "menstrual_cycle": None,
            "women_health_conditions": [],
            "women_health_conditions_other": None,
        })
    onboarding_data = payload.model_dump()
    onboarding_data["activity_preferences"] = payload.preferred_activities
    onboarding_data["onboarding_completed"] = True
    result = await db.users.update_one({"_id": user_id}, {"$set": onboarding_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")

    twin = await db.digital_twins.find_one({"user_id": user_id_text})
    if not twin:
        twin = {
            "user_id": user_id_text,
            "created_at": datetime.utcnow(),
            "version": 0,
            "long_term_memories": [],
            "session_memories": [],
        }
        inserted = await db.digital_twins.insert_one(twin)
        twin["_id"] = inserted.inserted_id
    profile = {key: value for key, value in onboarding_data.items() if key not in {"goals", "onboarding_completed"}}
    await db.digital_twins.update_one(
        {"_id": twin["_id"]},
        {"$set": {
            "profile": profile,
            "goals": payload.goals,
            "onboarding_completed": True,
            "updated_at": datetime.utcnow(),
            "version": twin.get("version", 0) + 1,
        }},
    )

    now = datetime.utcnow()
    await db.memories.update_many(
        {"user_id": user_id_text, "source": "onboarding", "active": True},
        {"$set": {"active": False, "updated_at": now}},
    )
    memory_items = [
        {"category": "personal_information", "content": f"Name: {payload.full_name}"},
        {"category": "personal_information", "content": f"Age: {payload.age}"},
        {"category": "personal_information", "content": f"Gender: {payload.gender}"},
    ] + [
        {"category": "goal", "content": goal}
        for goal in payload.goals
    ]
    memory_items.extend(
        {"category": category, "content": value}
        for category, values in (
            ("dietary_preference", payload.dietary_preferences),
            ("exercise_preference", payload.exercise_preferences),
            ("preferred_activity", payload.preferred_activities),
            ("avoided_activity", payload.avoided_activities),
        )
        for value in values
    )
    if payload.diet_type:
        memory_items.append({"category": "dietary_preference", "content": payload.diet_type})
    if payload.activity_level:
        memory_items.append({"category": "activity_level", "content": payload.activity_level})
    if payload.sleep_hours is not None:
        memory_items.append({"category": "sleep_preference", "content": f"Typical sleep: {payload.sleep_hours} hours"})
    if payload.sleep_quality:
        memory_items.append({"category": "sleep_preference", "content": f"Typical sleep quality: {payload.sleep_quality}"})
    if payload.diet_type:
        memory_items.append({"category": "dietary_preference", "content": payload.diet_type})
    memory_items.extend(
        {"category": "health_condition", "content": value}
        for value in payload.health_conditions
        if value not in {"None", "Prefer not to say"}
    )
    if payload.health_conditions_other:
        memory_items.append({"category": "health_condition", "content": payload.health_conditions_other})
    memory_items.extend(
        {"category": "allergy", "content": value}
        for value in payload.allergies
        if value not in {"None", "Prefer not to say"}
    )
    if payload.allergies_other:
        memory_items.append({"category": "allergy", "content": payload.allergies_other})
    if payload.medications_status == "Yes" and payload.medications_details:
        memory_items.append({"category": "medication", "content": payload.medications_details})
    for label, value in (
        ("Systolic blood pressure", payload.blood_pressure_systolic),
        ("Diastolic blood pressure", payload.blood_pressure_diastolic),
        ("Heart rate", payload.heart_rate),
        ("Blood glucose", payload.blood_glucose),
    ):
        if value is not None:
            memory_items.append({"category": "health_measurement", "content": f"{label}: {value}"})
    if payload.menstrual_cycle:
        memory_items.append({"category": "women_health", "content": f"Menstrual cycle: {payload.menstrual_cycle}"})
    memory_items.extend(
        {"category": "women_health", "content": value}
        for value in payload.women_health_conditions
        if value not in {"None", "Prefer not to say"}
    )
    if payload.women_health_conditions_other:
        memory_items.append({"category": "women_health", "content": payload.women_health_conditions_other})
    if payload.lifestyle_summary:
        memory_items.append({"category": "lifestyle", "content": payload.lifestyle_summary})
    await db.memories.insert_many([
        {
            "user_id": user_id_text,
            **item,
            "memory_type": "long_term",
            "source": "onboarding",
            "confidence": 1.0,
            "importance": 0.9,
            "active": True,
            "created_at": now,
            "updated_at": now,
            "expires_at": None,
        }
        for item in memory_items
    ])
    await db.twin_history.insert_one({
        "user_id": user_id_text,
        "event_type": "onboarding_completed",
        "summary": "Your profile and saved preferences were set up.",
        "created_at": datetime.utcnow(),
    })
    user = await db.users.find_one({"_id": user_id})
    return UserOut(**{**user, "id": str(user["_id"])})


@router.post("/change-password")
async def change_password(payload: PasswordChange, current_user: Dict[str, Any] = Depends(get_current_user)):
    db = get_db()
    user_id = _user_object_id(current_user["user_id"])
    user = await db.users.find_one({"_id": user_id})
    if not user or not verify_password(payload.current_password, user["password_hash"]):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    await db.users.update_one({"_id": user_id}, {"$set": {"password_hash": hash_password(payload.new_password)}})
    return {"status": "password_changed"}


@router.delete("/me")
async def delete_me(current_user: Dict[str, Any] = Depends(get_current_user)):
    db = get_db()
    await db.users.delete_one({"_id": _user_object_id(current_user["user_id"])})
    await db.digital_twins.delete_many({"user_id": current_user["user_id"]})
    await db.memories.delete_many({"user_id": current_user["user_id"]})
    await db.health_logs.delete_many({"user_id": current_user["user_id"]})
    await db.chat_sessions.delete_many({"user_id": current_user["user_id"]})
    await db.messages.delete_many({"user_id": current_user["user_id"]})
    await db.feedback.delete_many({"user_id": current_user["user_id"]})
    await db.recommendations.delete_many({"user_id": current_user["user_id"]})
    await db.twin_history.delete_many({"user_id": current_user["user_id"]})
    return {"status": "deleted"}
