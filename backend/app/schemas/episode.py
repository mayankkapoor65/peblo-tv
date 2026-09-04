import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from typing import Optional
from app.schemas.artwork import ArtworkRead

class EpisodeBase(BaseModel):
    episode_number: int = Field(..., ge=1, description="Episode number (1, 2, ...)")
    content_group_id: str = Field(..., min_length=1, max_length=100, description="Unique content group collapsing key")
    language: str = Field(..., min_length=2, max_length=10, description="Language code e.g. en, es, hi, ja")
    title: str = Field(..., min_length=1, max_length=255)
    synopsis: str = ""
    duration_seconds: int = Field(default=0, ge=0, description="Duration in seconds. Must be >0 to publish.")
    thumbnail_id: Optional[uuid.UUID] = None
    stream_url: Optional[str] = None
    sort_order: int = 0

class EpisodeCreate(EpisodeBase):
    pass

class EpisodeUpdate(BaseModel):
    episode_number: Optional[int] = Field(None, ge=1)
    content_group_id: Optional[str] = Field(None, min_length=1, max_length=100)
    language: Optional[str] = Field(None, min_length=2, max_length=10)
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    synopsis: Optional[str] = None
    duration_seconds: Optional[int] = Field(None, ge=0)
    thumbnail_id: Optional[uuid.UUID] = None
    stream_url: Optional[str] = None
    sort_order: Optional[int] = None

class EpisodeRead(EpisodeBase):
    id: uuid.UUID
    season_id: uuid.UUID
    created_at: datetime
    thumbnail: Optional[ArtworkRead] = None

    model_config = ConfigDict(from_attributes=True)
