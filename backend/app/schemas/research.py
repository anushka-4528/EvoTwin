from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class ContextRankingItem(BaseModel):
    item_id: str
    content: str
    score: float
    category: str
    source: str
    reason: str


class EvaluationResult(BaseModel):
    name: str
    metrics: Dict[str, Any]
    outputs: List[Dict[str, Any]] = []
