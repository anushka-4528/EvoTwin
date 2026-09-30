from datetime import datetime
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


class ChatMessageCreate(BaseModel):
    content: str = Field(min_length=1)


class ChatFeedbackCreate(BaseModel):
    rating: Literal["helpful", "not_helpful"]
    correction: Optional[str] = None


class ChatSessionCreate(BaseModel):
    title: Optional[str] = None


class ChatMessageOut(BaseModel):
    id: str
    role: str
    content: str
    created_at: datetime
    evidence: List[Dict[str, Any]] = []
    context_used: List[Dict[str, Any]] = []


class ChatSessionOut(BaseModel):
    id: str
    user_id: str
    title: str
    created_at: datetime
    updated_at: datetime


class ChatResponse(BaseModel):
    message: ChatMessageOut
    response_text: str
    personalized_observations: List[str] = []
    recommendations: List[str] = []
    rationale: str
    evidence_sources: List[Dict[str, Any]] = []
    uncertainty: str
    safety_notice: str
    follow_up_question: Optional[str] = None
    context_used: List[Dict[str, Any]] = []
