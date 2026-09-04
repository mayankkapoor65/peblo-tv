import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.show import Show
from app.models.season import Season
from app.models.episode import Episode
from app.models.user import User
from app.schemas.season import SeasonCreate, SeasonUpdate, SeasonRead
from app.api.deps import require_role

router = APIRouter(prefix="/admin", tags=["Admin Seasons"])

@router.post("/shows/{show_id}/seasons", response_model=SeasonRead, status_code=status.HTTP_201_CREATED)
async def create_season(
    show_id: uuid.UUID,
    payload: SeasonCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "editor"])),
):
    show = await db.get(Show, show_id)
    if not show:
        raise HTTPException(status_code=404, detail="Show not found")

    # Check unique season_number per show
    existing = await db.execute(
        select(Season).where(
            Season.show_id == show_id,
            Season.season_number == payload.season_number
        )
    )
    if existing.scalars().first():
        season_label = "Season 0 (Trailers & Extras)" if payload.season_number == 0 else f"Season {payload.season_number}"
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"{season_label} already exists for this show."
        )

    title = payload.title
    if not title:
        title = "Trailers & Extras" if payload.season_number == 0 else f"Season {payload.season_number}"

    season = Season(
        show_id=show_id,
        season_number=payload.season_number,
        title=title,
        synopsis=payload.synopsis,
        sort_order=payload.sort_order if payload.sort_order != 0 else payload.season_number,
    )
    db.add(season)
    await db.commit()
    await db.refresh(season)
    
    result = await db.execute(
        select(Season)
        .options(selectinload(Season.episodes).selectinload(Episode.thumbnail))
        .where(Season.id == season.id)
    )
    return result.scalars().first()

@router.get("/seasons/{season_id}", response_model=SeasonRead)
async def get_season(
    season_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "editor"])),
):
    result = await db.execute(
        select(Season)
        .options(selectinload(Season.episodes).selectinload(Episode.thumbnail))
        .where(Season.id == season_id)
    )
    season = result.scalars().first()
    if not season:
        raise HTTPException(status_code=404, detail="Season not found")
    return season

@router.put("/seasons/{season_id}", response_model=SeasonRead)
async def update_season(
    season_id: uuid.UUID,
    payload: SeasonUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "editor"])),
):
    season = await db.get(Season, season_id)
    if not season:
        raise HTTPException(status_code=404, detail="Season not found")

    if payload.season_number is not None and payload.season_number != season.season_number:
        existing = await db.execute(
            select(Season).where(
                Season.show_id == season.show_id,
                Season.season_number == payload.season_number,
                Season.id != season_id,
            )
        )
        if existing.scalars().first():
            raise HTTPException(
                status_code=409,
                detail=f"Season number {payload.season_number} already exists for this show."
            )
        season.season_number = payload.season_number

    if payload.title is not None:
        season.title = payload.title
    if payload.synopsis is not None:
        season.synopsis = payload.synopsis
    if payload.sort_order is not None:
        season.sort_order = payload.sort_order

    await db.commit()
    
    result = await db.execute(
        select(Season)
        .options(selectinload(Season.episodes).selectinload(Episode.thumbnail))
        .where(Season.id == season.id)
    )
    return result.scalars().first()

@router.delete("/seasons/{season_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_season(
    season_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "editor"])),
):
    season = await db.get(Season, season_id)
    if not season:
        raise HTTPException(status_code=404, detail="Season not found")
    await db.delete(season)
    await db.commit()
    return None
