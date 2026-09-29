from typing import Any, Dict

from fastapi import APIRouter, Depends

from app.core.security import get_current_user

router = APIRouter(prefix="/research", tags=["research"])


@router.get("/evaluation")
async def evaluation_summary(current_user: Dict[str, Any] = Depends(get_current_user)):
    return {
        "configurations": [
            {"name": "Basic LLM baseline", "description": "Static context without ACCM or memory."},
            {"name": "RPE baseline", "description": "Static prompt with context but no twin evolution."},
            {"name": "EvoHealthTwin", "description": "ACCM + RAG + hierarchical memory + ATEE."},
        ],
        "status": "ready_for_eval",
    }
