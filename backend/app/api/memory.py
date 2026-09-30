from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.security import get_current_user
from app.database.connection import get_db
from app.schemas.twin import MemoryCreate, MemoryOut
from app.services.memory_service import clear_session_memories, create_memory, delete_memory, list_memories

router = APIRouter(prefix="/memory", tags=["memory"])


@router.get("", response_model=list[MemoryOut])
async def get_memories(
    memory_type: Optional[str] = Query(default=None, pattern="^(long_term|session)$"),
    current_user: Dict[str, Any] = Depends(get_current_user),
):
    records = await list_memories(current_user["user_id"], memory_type)
    return [MemoryOut(**record) for record in records]


@router.post("", response_model=MemoryOut)
async def add_memory(payload: MemoryCreate, current_user: Dict[str, Any] = Depends(get_current_user)):
    record = await create_memory(current_user["user_id"], payload.model_dump())
    return MemoryOut(**record)


@router.delete("/session")
async def clear_session_memory(current_user: Dict[str, Any] = Depends(get_current_user)):
    cleared = await clear_session_memories(current_user["user_id"])
    return {"status": "cleared", "count": cleared}


@router.delete("/{memory_id}")
async def remove_memory(memory_id: str, current_user: Dict[str, Any] = Depends(get_current_user)):
    await delete_memory(current_user["user_id"], memory_id)
    return {"status": "deleted"}
