import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.season import Season
from app.models.episode import Episode
from app.models.artwork import Artwork
from app.models.user import User
from app.schemas.episode import EpisodeCreate, EpisodeUpdate, EpisodeRead
from app.api.deps import require_role

router = APIRouter(prefix="/admin", tags=["Admin Episodes"])

@router.post("/seasons/{season_id}/episodes", response_model=EpisodeRead, status_code=status.HTTP_201_CREATED)
async def create_episode(
    season_id: uuid.UUID,
    payload: EpisodeCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "editor"])),
):
    season = await db.get(Season, season_id)
    if not season:
        raise HTTPException(status_code=404, detail="Season not found")

    # Check (content_group_id, language) uniqueness
    existing_variant = await db.execute(
        select(Episode).where(
            Episode.content_group_id == payload.content_group_id,
            Episode.language == payload.language.lower().strip()
        )
    )
    if existing_variant.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An episode variant with content_group '{payload.content_group_id}' and language '{payload.language}' already exists."
        )

    # Validate thumbnail if provided
    if payload.thumbnail_id:
        thumb = await db.get(Artwork, payload.thumbnail_id)
        if not thumb or thumb.artwork_type != "thumbnail":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid thumbnail artwork ID or artwork type is not 'thumbnail'."
            )

    episode = Episode(
        season_id=season_id,
        episode_number=payload.episode_number,
        content_group_id=payload.content_group_id.strip(),
        language=payload.language.lower().strip(),
        title=payload.title,
        synopsis=payload.synopsis,
        duration_seconds=payload.duration_seconds,
        thumbnail_id=payload.thumbnail_id,
        stream_url=payload.stream_url,
        sort_order=payload.sort_order if payload.sort_order != 0 else payload.episode_number,
    )
    db.add(episode)
    await db.commit()
    
    result = await db.execute(
        select(Episode)
        .options(selectinload(Episode.thumbnail))
        .where(Episode.id == episode.id)
    )
    return result.scalars().first()

@router.get("/episodes/{episode_id}", response_model=EpisodeRead)
async def get_episode(
    episode_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "editor"])),
):
    result = await db.execute(
        select(Episode)
        .options(selectinload(Episode.thumbnail))
        .where(Episode.id == episode_id)
    )
    episode = result.scalars().first()
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")
    return episode

@router.put("/episodes/{episode_id}", response_model=EpisodeRead)
async def update_episode(
    episode_id: uuid.UUID,
    payload: EpisodeUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "editor"])),
):
    episode = await db.get(Episode, episode_id)
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")

    new_content_group = payload.content_group_id.strip() if payload.content_group_id else episode.content_group_id
    new_language = payload.language.lower().strip() if payload.language else episode.language

    if (new_content_group != episode.content_group_id) or (new_language != episode.language):
        existing = await db.execute(
            select(Episode).where(
                Episode.content_group_id == new_content_group,
                Episode.language == new_language,
                Episode.id != episode_id,
            )
        )
        if existing.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"An episode variant with content_group '{new_content_group}' and language '{new_language}' already exists."
            )
        episode.content_group_id = new_content_group
        episode.language = new_language

    if payload.thumbnail_id is not None:
        if payload.thumbnail_id != episode.thumbnail_id:
            thumb = await db.get(Artwork, payload.thumbnail_id)
            if not thumb or thumb.artwork_type != "thumbnail":
                raise HTTPException(status_code=400, detail="Invalid thumbnail artwork ID.")
        episode.thumbnail_id = payload.thumbnail_id

    for field in ["episode_number", "title", "synopsis", "duration_seconds", "stream_url", "sort_order"]:
        val = getattr(payload, field)
        if val is not None:
            setattr(episode, field, val)

    await db.commit()
    
    result = await db.execute(
        select(Episode)
        .options(selectinload(Episode.thumbnail))
        .where(Episode.id == episode.id)
    )
    return result.scalars().first()

@router.delete("/episodes/{episode_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_episode(
    episode_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "editor"])),
):
    episode = await db.get(Episode, episode_id)
    if not episode:
        raise HTTPException(status_code=404, detail="Episode not found")
    await db.delete(episode)
    await db.commit()
    return None
