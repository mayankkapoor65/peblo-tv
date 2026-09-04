import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from app.schemas.episode import EpisodeRead

class SeasonBase(BaseModel):
    season_number: int = Field(..., ge=0, description="0 is reserved for Trailers/Promos, 1..N for regular seasons")
    title: str = Field(default="", max_length=255)
    synopsis: str = ""
    sort_order: int = 0

class SeasonCreate(SeasonBase):
    pass

class SeasonUpdate(BaseModel):
    season_number: Optional[int] = Field(None, ge=0)
    title: Optional[str] = Field(None, max_length=255)
    synopsis: Optional[str] = None
    sort_order: Optional[int] = None

class SeasonRead(SeasonBase):
    id: uuid.UUID
    show_id: uuid.UUID
    created_at: datetime
    episodes: List[EpisodeRead] = []

    model_config = ConfigDict(from_attributes=True)
