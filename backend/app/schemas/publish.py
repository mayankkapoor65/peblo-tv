import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict
from app.schemas.validation import ValidationIssue

class PublishTriggerResponse(BaseModel):
    success: bool
    message: str
    run_id: uuid.UUID
    file_path: str
    file_url: str
    file_hash: str
    file_size_bytes: int
    show_count: int
    episode_count: int
    duration_ms: float

class PublishRunRead(BaseModel):
    id: uuid.UUID
    published_by: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    status: str
    show_count: int
    episode_count: int
    error_message: Optional[str] = None
    file_hash: Optional[str] = None
    file_size_bytes: Optional[int] = None
    target_path: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)
