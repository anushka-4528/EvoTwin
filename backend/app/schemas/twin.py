from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class MemoryCreate(BaseModel):
    category: str
    content: str
    memory_type: str = "long_term"
    source: str = "user_input"
    confidence: float = Field(default=0.5, ge=0, le=1)
    importance: float = Field(default=0.5, ge=0, le=1)
    expires_at: Optional[datetime] = None


class MemoryOut(BaseModel):
    id: str
    user_id: str
    category: str
    content: str
    memory_type: str
    source: str
    confidence: float
    importance: float
    created_at: datetime
    updated_at: datetime
    expires_at: Optional[datetime] = None
    active: bool = True


class TwinOut(BaseModel):
    id: str
    user_id: str
    profile: Dict[str, Any]
    goals: List[str]
    long_term_memories: List[MemoryOut]
    session_memories: List[MemoryOut]
    derived_wellness: Dict[str, Any]
    version: int
    updated_at: datetime
