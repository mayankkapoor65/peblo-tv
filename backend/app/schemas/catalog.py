import uuid
from typing import List, Dict, Optional, Any
from datetime import datetime
from pydantic import BaseModel

class CatalogTrailer(BaseModel):
    id: str
    title: str
    synopsis: str
    duration_seconds: int
    thumbnail_url: Optional[str] = None
    stream_url: Optional[str] = None
    language: str = "en"

class CatalogEpisodeCollapsed(BaseModel):
    content_group_id: str
    episode_number: int
    title: str
    synopsis: str
    duration_seconds: int
    thumbnail_url: Optional[str] = None
    languages: List[str]
    audio_streams: Dict[str, str] = {}
    variants: List[Dict[str, Any]] = []

class CatalogSeason(BaseModel):
    season_number: int
    title: str
    synopsis: str
    episodes: List[CatalogEpisodeCollapsed]

class CatalogShow(BaseModel):
    id: str
    title: str
    slug: str
    synopsis: str
    category: str
    section: str
    poster_url: Optional[str] = None
    banner_url: Optional[str] = None
    sort_order: int = 0
    trailers: List[CatalogTrailer] = []
    seasons: List[CatalogSeason] = []

class CatalogPayload(BaseModel):
    generated_at: str
    version: str
    total_shows: int
    total_episodes: int
    sections: Dict[str, List[CatalogShow]]
    featured: Optional[CatalogShow] = None
    all_shows: List[CatalogShow] = []

class SearchResultItem(BaseModel):
    show_id: str
    show_title: str
    show_slug: str
    category: str
    section: Optional[str] = None
    poster_url: Optional[str] = None
    banner_url: Optional[str] = None
    matched_type: str  # 'show_title' | 'show_category' | 'episode_title'
    matched_title: str
    episode_title: Optional[str] = None
    season_number: Optional[int] = None
    episode_number: Optional[int] = None
    available_languages: List[str] = []

class SearchResponse(BaseModel):
    total: int
    query: str
    filters: Dict[str, Optional[str]]
    results: List[SearchResultItem]
