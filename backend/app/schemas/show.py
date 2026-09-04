import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field
from typing import Optional, List
from app.schemas.artwork import ArtworkRead
from app.schemas.season import SeasonRead

class ShowBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    slug: str = Field(..., min_length=1, max_length=255)
    synopsis: str = ""
    category: str = Field(default="General", max_length=100)
    section: Optional[str] = Field(None, max_length=100, description="Catalogue section (e.g. Trending Now, New Releases). Required for publish.")
    status: str = Field(default="draft", description="'draft', 'published', 'archived'")
    poster_id: Optional[uuid.UUID] = None
    banner_id: Optional[uuid.UUID] = None
    sort_order: int = 0

class ShowCreate(ShowBase):
    pass

class ShowUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=255)
    slug: Optional[str] = Field(None, min_length=1, max_length=255)
    synopsis: Optional[str] = None
    category: Optional[str] = None
    section: Optional[str] = None
    status: Optional[str] = None
    poster_id: Optional[uuid.UUID] = None
    banner_id: Optional[uuid.UUID] = None
    sort_order: Optional[int] = None

class ShowRead(ShowBase):
    id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    poster: Optional[ArtworkRead] = None
    banner: Optional[ArtworkRead] = None

    model_config = ConfigDict(from_attributes=True)

class ShowDetailRead(ShowRead):
    seasons: List[SeasonRead] = []

    model_config = ConfigDict(from_attributes=True)
