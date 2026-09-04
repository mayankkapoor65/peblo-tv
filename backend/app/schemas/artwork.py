import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict

class ArtworkBase(BaseModel):
    artwork_type: str
    width: int
    height: int
    aspect_ratio: float
    file_size_bytes: int
    mime_type: str

class ArtworkRead(ArtworkBase):
    id: uuid.UUID
    storage_path: str
    url: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
