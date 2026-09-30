from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from bson.errors import InvalidId

from app.core.security import get_current_user
from app.database.connection import get_db
from app.schemas.chat import ChatFeedbackCreate, ChatMessageCreate, ChatResponse, ChatSessionCreate, ChatSessionOut
from app.services.atee import apply_user_feedback
from app.services.ai_demo import demo_chat_response
from app.services.context_builder import build_relevant_context
from app.services.memory_service import list_memories

router = APIRouter(prefix="/chat", tags=["chat"])


def _session_object_id(session_id: str) -> ObjectId:
    try:
        return ObjectId(session_id)
    except InvalidId as exc:
        raise HTTPException(status_code=404, detail="Session not found") from exc


@router.get("/sessions", response_model=list[ChatSessionOut])
async def list_sessions(current_user: Dict[str, Any] = Depends(get_current_user)):
    db = get_db()
    result = []
    async for session in db.chat_sessions.find({"user_id": current_user["user_id"]}).sort("updated_at", -1):
        session["id"] = str(session["_id"])
        result.append(ChatSessionOut(**session))
    return result


@router.post("/sessions", response_model=ChatSessionOut)
async def create_session(payload: ChatSessionCreate, current_user: Dict[str, Any] = Depends(get_current_user)):
    db = get_db()
    session = {
        "user_id": current_user["user_id"],
        "title": payload.title or "New conversation",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    result = await db.chat_sessions.insert_one(session)
    session["id"] = str(result.inserted_id)
    return ChatSessionOut(**session)


@router.get("/sessions/{session_id}")
async def get_session(session_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    db = get_db()
    session_doc = await db.chat_sessions.find_one({"_id": _session_object_id(session_id), "user_id": current_user["user_id"]})
    if not session_doc:
        raise HTTPException(status_code=404, detail="Session not found")
    session = {"id": str(session_doc["_id"]), **{key: value for key, value in session_doc.items() if key != "_id"}}
    messages = []
    async for msg in db.messages.find({"session_id": session_id, "user_id": current_user["user_id"]}).sort("created_at", 1):
        messages.append({"id": str(msg["_id"]), **{key: value for key, value in msg.items() if key != "_id"}})
    return {"session": session, "messages": messages}


@router.post("/sessions/{session_id}/messages", response_model=ChatResponse)
async def send_message(session_id: str, payload: ChatMessageCreate, current_user: Dict[str, Any] = Depends(get_current_user)):
    db = get_db()
    session_object_id = _session_object_id(session_id)
    session = await db.chat_sessions.find_one({"_id": session_object_id, "user_id": current_user["user_id"]})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    try:
        user_object_id = ObjectId(current_user["user_id"])
    except InvalidId as exc:
        raise HTTPException(status_code=401, detail="Invalid user token") from exc
    user = await db.users.find_one({"_id": user_object_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    latest_log = None
    async for log in db.health_logs.find({"user_id": current_user["user_id"]}).sort("date", -1):
        latest_log = log
        break
    recent_conversation = []
    async for message in db.messages.find({"session_id": session_id, "user_id": current_user["user_id"]}).sort("created_at", -1):
        recent_conversation.append({"category": f"conversation_{message.get('role', 'message')}", "content": message.get("content", "")})
        if len(recent_conversation) == 4:
            break
    recent_conversation.reverse()
    context_used = build_relevant_context(
        payload.content,
        user,
        latest_log,
        await list_memories(current_user["user_id"], "long_term"),
        [*await list_memories(current_user["user_id"], "session"), *recent_conversation],
    )
    user_message = {
        "user_id": current_user["user_id"],
        "session_id": session_id,
        "role": "user",
        "content": payload.content,
        "created_at": datetime.utcnow(),
        "evidence": [],
    }
    await db.messages.insert_one(user_message)
    response = demo_chat_response(payload.content, context_used)
    assistant_created_at = datetime.utcnow()
    assistant_message = {
        "user_id": current_user["user_id"],
        "session_id": session_id,
        "role": "assistant",
        "content": response["response_text"],
        "created_at": assistant_created_at,
        "evidence": response["evidence_sources"],
        "context_used": context_used,
    }
    assistant_result = await db.messages.insert_one(assistant_message)
    await db.chat_sessions.update_one({"_id": session_object_id, "user_id": current_user["user_id"]}, {"$set": {"updated_at": datetime.utcnow()}})
    return ChatResponse(**{
        "message": {"id": str(assistant_result.inserted_id), "role": "assistant", "content": response["response_text"], "created_at": assistant_created_at, "evidence": response["evidence_sources"], "context_used": context_used},
        "response_text": response["response_text"],
        "personalized_observations": response["personalized_observations"],
        "recommendations": response["recommendations"],
        "rationale": response["rationale"],
        "evidence_sources": response["evidence_sources"],
        "uncertainty": response["uncertainty"],
        "safety_notice": response["safety_notice"],
        "follow_up_question": response.get("follow_up_question"),
        "context_used": context_used,
    })


@router.post("/sessions/{session_id}/feedback")
async def submit_feedback(
    session_id: str,
    payload: ChatFeedbackCreate,
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    db = get_db()
    session_object_id = _session_object_id(session_id)
    session = await db.chat_sessions.find_one({"_id": session_object_id, "user_id": current_user["user_id"]})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    correction = (payload.correction or "").strip()
    await db.feedback.insert_one({
        "user_id": current_user["user_id"],
        "session_id": session_id,
        "rating": payload.rating,
        "correction": correction or None,
        "created_at": datetime.utcnow(),
    })
    changes = await apply_user_feedback(db, current_user["user_id"], correction) if correction else []
    if not correction:
        await db.twin_history.insert_one({
            "user_id": current_user["user_id"],
            "event_type": "response_feedback",
            "summary": f"Assistant response marked {payload.rating.replace('_', ' ')}.",
            "created_at": datetime.utcnow(),
        })
    return {
        "status": "recorded",
        "applied_changes": changes,
        "memory_type": "long_term" if changes else "session" if correction else None,
    }
