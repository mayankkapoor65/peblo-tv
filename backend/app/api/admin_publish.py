from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.database import get_db
from app.models.user import User
from app.schemas.publish import PublishTriggerResponse, PublishRunRead
from app.services.publisher_service import PublisherService
from app.api.deps import require_role

router = APIRouter(prefix="/admin/catalog", tags=["Admin Catalog Publish"])

@router.post("/publish", response_model=PublishTriggerResponse, status_code=status.HTTP_200_OK)
async def trigger_catalog_publish(
    force: bool = Query(False, description="Force publish ignoring validation warnings"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role("admin")),  # Real role check: admin only!
):
    """
    Builds the catalogue JSON, merges content group language variants,
    writes to storage with atomic swap guarantees, and records the audit run in publish_runs.
    """
    return await PublisherService.publish_catalog(db=db, user=current_user, force=force)

@router.get("/publish/runs", response_model=List[PublishRunRead])
async def get_publish_history(
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "editor"])),
):
    """
    Returns recent publish execution logs and status history.
    """
    runs = await PublisherService.get_publish_runs(db=db, limit=limit)
    return [PublishRunRead.model_validate(r) for r in runs]
