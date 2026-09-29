from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class HealthLogCreate(BaseModel):
    date: Optional[str] = None
    sleep_hours: Optional[float] = Field(default=None, ge=0, le=24)
    steps: Optional[int] = Field(default=None, ge=0, le=50000)
    hydration_liters: Optional[float] = Field(default=None, ge=0, le=15)
    nutrition_score: Optional[int] = Field(default=None, ge=0, le=100)
    stress_level: Optional[int] = Field(default=None, ge=0, le=100)
    notes: Optional[str] = None


class HealthLogOut(HealthLogCreate):
    id: str
    user_id: str
    created_at: datetime
    updated_at: datetime
    wellness_index: Optional[float] = None
    completeness: Optional[float] = None


class WellnessSummary(BaseModel):
    average_index: float
    latest_index: float
    completeness: float
    domain_summary: dict
