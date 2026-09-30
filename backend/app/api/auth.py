from datetime import datetime
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials
from bson import ObjectId
from bson.errors import InvalidId

from app.core.config import get_settings
from app.core.security import create_access_token, get_current_user, hash_password, verify_password
from app.database.connection import get_db
from app.schemas.user import TokenResponse, UserCreate, UserLogin, UserOut, UserProfileUpdate

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
        "occupation": None,
        "goals": [],
        "dietary_preferences": [],
        "activity_preferences": [],
        "health_history": None,
        "lifestyle_summary": None,
        "created_at": datetime.utcnow(),
    }
    result = await db.users.insert_one(user_doc)
    created = await db.users.find_one({"_id": result.inserted_id})

    twin = {
        "user_id": str(created["_id"]),
        "profile": {"email": created["email"], "full_name": created["full_name"]},
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
    return UserOut(**{**user, "id": str(user["_id"])})


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
    return {"status": "deleted"}
