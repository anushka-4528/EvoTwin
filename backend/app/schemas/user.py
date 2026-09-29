from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    full_name: str = Field(min_length=1)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    age: Optional[int] = Field(default=None, ge=0, le=120)
    occupation: Optional[str] = None
    goals: Optional[List[str]] = None
    dietary_preferences: Optional[List[str]] = None
    activity_preferences: Optional[List[str]] = None
    health_history: Optional[str] = None
    lifestyle_summary: Optional[str] = None


class UserOut(BaseModel):
    id: str
    email: str
    full_name: str
    age: Optional[int] = None
    occupation: Optional[str] = None
    goals: List[str] = []
    dietary_preferences: List[str] = []
    activity_preferences: List[str] = []
    health_history: Optional[str] = None
    lifestyle_summary: Optional[str] = None
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
