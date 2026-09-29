from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException

from app.core.security import get_current_user
from app.database.connection import get_db
from app.schemas.chat import ChatMessageCreate, ChatResponse, ChatSessionCreate, ChatSessionOut
from app.services.ai_demo import demo_chat_response

router = APIRouter(prefix="/chat", tags=["chat"])


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
    session = await db.chat_sessions.find_one({"_id": session_id, "user_id": current_user["user_id"]})
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    messages = []
    async for msg in db.messages.find({"session_id": session_id, "user_id": current_user["user_id"]}).sort("created_at", 1):
        messages.append({"id": str(msg["_id"]), **msg})
    return {"session": session, "messages": messages}


@router.post("/sessions/{session_id}/messages", response_model=ChatResponse)
async def send_message(session_id: str, payload: ChatMessageCreate, current_user: Dict[str, Any] = Depends(get_current_user)):
    db = get_db()
    user_message = {
        "user_id": current_user["user_id"],
        "session_id": session_id,
        "role": "user",
        "content": payload.content,
        "created_at": datetime.utcnow(),
        "evidence": [],
    }
    await db.messages.insert_one(user_message)
    response = demo_chat_response(payload.content)
    assistant_message = {
        "user_id": current_user["user_id"],
        "session_id": session_id,
        "role": "assistant",
        "content": response["response_text"],
        "created_at": datetime.utcnow(),
        "evidence": response["evidence_sources"],
    }
    await db.messages.insert_one(assistant_message)
    await db.chat_sessions.update_one({"_id": session_id, "user_id": current_user["user_id"]}, {"$set": {"updated_at": datetime.utcnow()}})
    return ChatResponse(**{
        "message": {"id": "assistant-msg", "role": "assistant", "content": response["response_text"], "created_at": datetime.utcnow(), "evidence": response["evidence_sources"]},
        "response_text": response["response_text"],
        "personalized_observations": response["personalized_observations"],
        "recommendations": response["recommendations"],
        "rationale": response["rationale"],
        "evidence_sources": response["evidence_sources"],
        "uncertainty": response["uncertainty"],
        "safety_notice": response["safety_notice"],
        "follow_up_question": response.get("follow_up_question"),
    })
