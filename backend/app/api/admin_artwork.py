from fastapi import APIRouter, UploadFile, File, Query, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.models.user import User
from app.schemas.artwork import ArtworkRead
from app.services.artwork_service import ArtworkService
from app.api.deps import require_role

router = APIRouter(prefix="/admin/artwork", tags=["Admin Artwork"])

@router.post("/upload", response_model=ArtworkRead, status_code=status.HTTP_201_CREATED)
async def upload_artwork(
    file: UploadFile = File(..., description="Image file (PNG, JPEG, WebP, max 200KB)"),
    artwork_type: str = Query(..., description="'poster' (2:3), 'banner' (16:9), or 'thumbnail' (16:9)"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "editor"])),
):
    """
    Upload and validate artwork with strict dimension, aspect-ratio, and 200KB file-size checks.
    Returns human-friendly, non-technical error messages when validation fails.
    """
    artwork = await ArtworkService.process_and_save_artwork(file, artwork_type)
    db.add(artwork)
    await db.commit()
    await db.refresh(artwork)
    return artwork
