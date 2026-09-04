from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_, distinct, func
from sqlalchemy.orm import selectinload

from app.models.show import Show
from app.models.season import Season
from app.models.episode import Episode
from app.models.artwork import Artwork
from app.schemas.catalog import SearchResponse, SearchResultItem

class SearchService:
    @staticmethod
    async def search_catalog(
        db: AsyncSession,
        q: Optional[str] = None,
        category: Optional[str] = None,
        language: Optional[str] = None,
        section: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> SearchResponse:
        """
        Database-level composite search.
        Composes filters at the SQL query level (not in-memory).
        Matches `q` against show title, category, and episode titles.
        """
        # Base query joining published shows, seasons, episodes, and artwork
        query = (
            select(
                Show.id.label("show_id"),
                Show.title.label("show_title"),
                Show.slug.label("show_slug"),
                Show.category.label("category"),
                Show.section.label("section"),
                Show.sort_order.label("sort_order"),
                Episode.id.label("episode_id"),
                Episode.title.label("episode_title"),
                Episode.language.label("language"),
                Season.season_number.label("season_number"),
                Episode.episode_number.label("episode_number"),
            )
            .select_from(Show)
            .outerjoin(Season, Season.show_id == Show.id)
            .outerjoin(Episode, Episode.season_id == Season.id)
            .where(Show.status != "archived")
        )

        conditions = []

        # Filter by Section
        if section and section.strip():
            conditions.append(Show.section == section.strip())

        # Filter by Category
        if category and category.strip():
            conditions.append(Show.category.ilike(f"%{category.strip()}%"))

        # Filter by Language
        if language and language.strip():
            conditions.append(Episode.language == language.strip().lower())

        # Search Query q (matches show title, episode title, category)
        if q and q.strip():
            term = f"%{q.strip()}%"
            conditions.append(
                or_(
                    Show.title.ilike(term),
                    Show.category.ilike(term),
                    Episode.title.ilike(term),
                    Show.synopsis.ilike(term),
                )
            )

        if conditions:
            query = query.where(and_(*conditions))

        # Execute composite query
        result = await db.execute(query.limit(limit).offset(offset))
        rows = result.all()

        # Deduplicate and group results by show with matched metadata
        show_map: Dict[str, Dict[str, Any]] = {}
        
        # Load show posters & banners for matched shows
        show_ids = list({row.show_id for row in rows if row.show_id})
        artwork_map = {}
        if show_ids:
            shows_with_art = await db.execute(
                select(Show)
                .options(selectinload(Show.poster), selectinload(Show.banner))
                .where(Show.id.in_(show_ids))
            )
            for s in shows_with_art.scalars().all():
                artwork_map[s.id] = {
                    "poster_url": s.poster.url if s.poster else None,
                    "banner_url": s.banner.url if s.banner else None,
                }

        results: List[SearchResultItem] = []
        seen_keys = set()

        for row in rows:
            show_id_str = str(row.show_id)
            arts = artwork_map.get(row.show_id, {"poster_url": None, "banner_url": None})
            
            # Determine match reason
            matched_type = "show_title"
            matched_title = row.show_title
            if q and q.strip():
                q_lower = q.strip().lower()
                if row.episode_title and q_lower in row.episode_title.lower():
                    matched_type = "episode_title"
                    matched_title = f"{row.show_title} - S{row.season_number}E{row.episode_number}: {row.episode_title}"
                elif row.category and q_lower in row.category.lower():
                    matched_type = "show_category"
                    matched_title = f"{row.show_title} ({row.category})"

            dedup_key = (show_id_str, row.episode_id)
            if dedup_key in seen_keys:
                continue
            seen_keys.add(dedup_key)

            results.append(SearchResultItem(
                show_id=show_id_str,
                show_title=row.show_title,
                show_slug=row.show_slug,
                category=row.category,
                section=row.section,
                poster_url=arts["poster_url"],
                banner_url=arts["banner_url"],
                matched_type=matched_type,
                matched_title=matched_title,
                episode_title=row.episode_title,
                season_number=row.season_number,
                episode_number=row.episode_number,
                available_languages=[row.language] if row.language else [],
            ))

        return SearchResponse(
            total=len(results),
            query=q or "",
            filters={
                "category": category,
                "language": language,
                "section": section,
            },
            results=results,
        )
