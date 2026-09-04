import json
import hashlib
from typing import Optional
from fastapi import APIRouter, Depends, Query, Response, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.storage import get_storage
from app.schemas.catalog import SearchResponse
from app.services.search_service import SearchService

router = APIRouter(tags=["Public Catalog"])

@router.get("/catalog")
async def get_published_catalog(response: Response):
    """
    Serves the pre-published catalogue JSON file directly from storage with ETag and Cache-Control headers.
    Ultra-low latency, zero database queries per request.
    """
    storage = get_storage()
    try:
        data_bytes = await storage.get(settings.CATALOG_FILE_PATH)
        data_json = json.loads(data_bytes.decode("utf-8"))
        
        # Calculate ETag
        etag = f'"{hashlib.md5(data_bytes).hexdigest()}"'
        response.headers["ETag"] = etag
        response.headers["Cache-Control"] = "public, max-age=60, stale-while-revalidate=300"
        return data_json
    except FileNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The catalogue has not been published yet. Please publish the catalogue from the Admin CMS."
        )

@router.get("/catalog/search", response_model=SearchResponse)
async def search_catalog(
    q: Optional[str] = Query(None, description="Search query matching show titles, episode titles, or categories"),
    category: Optional[str] = Query(None, description="Filter by genre/category"),
    language: Optional[str] = Query(None, description="Filter by audio/subtitle language (e.g. en, es, hi, ja)"),
    section: Optional[str] = Query(None, description="Filter by section (e.g. Trending Now, Sci-Fi Hits)"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """
    Dynamic composite catalogue search matching show title, episode title, and category.
    All filters compose at the SQL database layer.
    """
    return await SearchService.search_catalog(
        db=db,
        q=q,
        category=category,
        language=language,
        section=section,
        limit=limit,
        offset=offset,
    )
