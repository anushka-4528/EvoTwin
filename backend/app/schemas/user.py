from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    full_name: str = Field(min_length=1)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class OnboardingComplete(BaseModel):
    full_name: str = Field(min_length=1)
    age: int = Field(ge=0, le=120)
    gender: str = Field(min_length=1)
    goals: List[str] = Field(min_length=1)
    activity_level: str = Field(min_length=1)
    lifestyle_summary: str = Field(min_length=1)
    dietary_preferences: List[str]
    sleep_hours: float = Field(ge=0, le=24)
    exercise_preferences: List[str]
    preferred_activities: List[str]
    avoided_activities: List[str]


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)


class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    age: Optional[int] = Field(default=None, ge=0, le=120)
    gender: Optional[str] = None
    occupation: Optional[str] = None
    activity_level: Optional[str] = None
    goals: Optional[List[str]] = None
    dietary_preferences: Optional[List[str]] = None
    activity_preferences: Optional[List[str]] = None
    exercise_preferences: Optional[List[str]] = None
    preferred_activities: Optional[List[str]] = None
    avoided_activities: Optional[List[str]] = None
    sleep_hours: Optional[float] = Field(default=None, ge=0, le=24)
    health_history: Optional[str] = None
    lifestyle_summary: Optional[str] = None


class UserOut(BaseModel):
    id: str
    email: str
    full_name: str
    age: Optional[int] = None
    gender: Optional[str] = None
    occupation: Optional[str] = None
    activity_level: Optional[str] = None
    goals: List[str] = []
    dietary_preferences: List[str] = []
    activity_preferences: List[str] = []
    exercise_preferences: List[str] = []
    preferred_activities: List[str] = []
    avoided_activities: List[str] = []
    sleep_hours: Optional[float] = None
    health_history: Optional[str] = None
    lifestyle_summary: Optional[str] = None
    onboarding_completed: bool = False
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
