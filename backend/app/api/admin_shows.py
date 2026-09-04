import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.show import Show
from app.models.season import Season
from app.models.episode import Episode
from app.models.artwork import Artwork
from app.models.user import User
from app.schemas.show import ShowCreate, ShowUpdate, ShowRead, ShowDetailRead
from app.api.deps import require_role

router = APIRouter(prefix="/admin/shows", tags=["Admin Shows"])

@router.get("", response_model=dict)
async def list_shows(
    q: Optional[str] = Query(None, description="Search by title, synopsis, or category"),
    section: Optional[str] = Query(None, description="Filter by section"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status (draft, published, archived)"),
    category: Optional[str] = Query(None, description="Filter by category"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "editor"])),
):
    query = select(Show).options(
        selectinload(Show.poster),
        selectinload(Show.banner)
    )

    if q:
        search_pattern = f"%{q.strip()}%"
        query = query.where(
            or_(
                Show.title.ilike(search_pattern),
                Show.synopsis.ilike(search_pattern),
                Show.category.ilike(search_pattern),
            )
        )
    if section:
        query = query.where(Show.section == section)
    if status_filter:
        query = query.where(Show.status == status_filter)
    if category:
        query = query.where(Show.category == category)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await db.execute(count_query)
    total = total_result.scalar() or 0

    # Paginate
    query = query.order_by(Show.sort_order.asc(), Show.created_at.desc())
    query = query.offset((page - 1) * page_size).limit(page_size)
    
    result = await db.execute(query)
    shows = result.scalars().all()

    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [ShowRead.model_validate(s) for s in shows]
    }

@router.post("", response_model=ShowRead, status_code=status.HTTP_201_CREATED)
async def create_show(
    payload: ShowCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "editor"])),
):
    # Check slug uniqueness
    existing_slug = await db.execute(select(Show).where(Show.slug == payload.slug))
    if existing_slug.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A show with slug '{payload.slug}' already exists."
        )

    # Validate artwork references if provided
    if payload.poster_id:
        poster = await db.get(Artwork, payload.poster_id)
        if not poster or poster.artwork_type != "poster":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid poster artwork ID or artwork type is not 'poster'."
            )
    if payload.banner_id:
        banner = await db.get(Artwork, payload.banner_id)
        if not banner or banner.artwork_type != "banner":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid banner artwork ID or artwork type is not 'banner'."
            )

    show = Show(
        title=payload.title,
        slug=payload.slug,
        synopsis=payload.synopsis,
        category=payload.category,
        section=payload.section,
        status=payload.status,
        poster_id=payload.poster_id,
        banner_id=payload.banner_id,
        sort_order=payload.sort_order,
    )
    db.add(show)
    await db.commit()
    
    # Reload with relationships
    result = await db.execute(
        select(Show)
        .options(selectinload(Show.poster), selectinload(Show.banner))
        .where(Show.id == show.id)
    )
    return result.scalars().first()

@router.get("/{show_id}", response_model=ShowDetailRead)
async def get_show(
    show_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "editor"])),
):
    result = await db.execute(
        select(Show)
        .options(
            selectinload(Show.poster),
            selectinload(Show.banner),
            selectinload(Show.seasons).selectinload(Season.episodes).selectinload(Episode.thumbnail)
        )
        .where(Show.id == show_id)
    )
    show = result.scalars().first()
    if not show:
        raise HTTPException(status_code=404, detail="Show not found")
    return show

@router.put("/{show_id}", response_model=ShowRead)
async def update_show(
    show_id: uuid.UUID,
    payload: ShowUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "editor"])),
):
    show = await db.get(Show, show_id)
    if not show:
        raise HTTPException(status_code=404, detail="Show not found")

    if payload.slug is not None and payload.slug != show.slug:
        existing = await db.execute(select(Show).where(Show.slug == payload.slug, Show.id != show_id))
        if existing.scalars().first():
            raise HTTPException(status_code=409, detail=f"A show with slug '{payload.slug}' already exists.")
        show.slug = payload.slug

    if payload.poster_id is not None:
        if payload.poster_id != show.poster_id:
            poster = await db.get(Artwork, payload.poster_id)
            if not poster or poster.artwork_type != "poster":
                raise HTTPException(status_code=400, detail="Invalid poster artwork ID.")
        show.poster_id = payload.poster_id

    if payload.banner_id is not None:
        if payload.banner_id != show.banner_id:
            banner = await db.get(Artwork, payload.banner_id)
            if not banner or banner.artwork_type != "banner":
                raise HTTPException(status_code=400, detail="Invalid banner artwork ID.")
        show.banner_id = payload.banner_id

    for field in ["title", "synopsis", "category", "section", "status", "sort_order"]:
        val = getattr(payload, field)
        if val is not None:
            setattr(show, field, val)

    await db.commit()
    
    result = await db.execute(
        select(Show)
        .options(selectinload(Show.poster), selectinload(Show.banner))
        .where(Show.id == show.id)
    )
    return result.scalars().first()

@router.delete("/{show_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_show(
    show_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(require_role(["admin", "editor"])),
):
    show = await db.get(Show, show_id)
    if not show:
        raise HTTPException(status_code=404, detail="Show not found")
    await db.delete(show)
    await db.commit()
    return None
