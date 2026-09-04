import json
import hashlib
import time
import uuid
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from sqlalchemy.orm import selectinload
from fastapi import HTTPException, status

from app.config import settings
from app.models.show import Show
from app.models.season import Season
from app.models.episode import Episode
from app.models.publish_run import PublishRun
from app.models.user import User
from app.storage import get_storage
from app.services.validation_service import ValidationService
from app.schemas.publish import PublishTriggerResponse

class PublisherService:
    @staticmethod
    async def publish_catalog(
        db: AsyncSession,
        user: User,
        force: bool = False
    ) -> PublishTriggerResponse:
        start_time = time.perf_counter()
        now = datetime.now(timezone.utc)
        storage = get_storage()

        # 1. Run Pre-flight Validation Report
        report = await ValidationService.generate_validation_report(db)
        if not report.can_publish and not force:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail={
                    "error": "PUBLISH_BLOCKED_BY_VALIDATION",
                    "message": f"Cannot publish catalogue: {report.summary.total_issues} blocking issue(s) found across {report.summary.blocked_shows} show(s).",
                    "report": report.model_dump()
                }
            )

        # 2. Create audit run record (pending)
        run_record = PublishRun(
            published_by=user.email or user.full_name or "admin",
            started_at=now,
            status="in_progress",
            target_path=settings.CATALOG_FILE_PATH,
        )
        db.add(run_record)
        await db.commit()
        await db.refresh(run_record)

        try:
            # 3. Load all publishable shows with complete hierarchy
            stmt = (
                select(Show)
                .options(
                    selectinload(Show.poster),
                    selectinload(Show.banner),
                    selectinload(Show.seasons).selectinload(Season.episodes).selectinload(Episode.thumbnail)
                )
                .where(Show.status == "published", Show.section.isnot(None))
                .order_by(Show.section.asc(), Show.sort_order.asc(), Show.title.asc())
            )
            result = await db.execute(stmt)
            shows = result.scalars().all()

            sections_dict: dict[str, list[dict]] = {}
            all_shows_list: list[dict] = []
            total_episodes_count = 0

            for show in shows:
                # Process Season 0 Trailers vs Regular Seasons
                trailers_list: list[dict] = []
                seasons_list: list[dict] = []

                for season in sorted(show.seasons, key=lambda s: s.season_number):
                    if season.season_number == 0:
                        # Season 0 is trailers/promos
                        for ep in season.episodes:
                            trailers_list.append({
                                "id": str(ep.id),
                                "title": ep.title,
                                "synopsis": ep.synopsis,
                                "duration_seconds": ep.duration_seconds,
                                "thumbnail_url": ep.thumbnail.url if ep.thumbnail else None,
                                "stream_url": ep.stream_url,
                                "language": ep.language,
                            })
                    else:
                        # Collapse content_group variants into one entry with languages[]
                        content_groups: dict[str, list[Episode]] = {}
                        for ep in season.episodes:
                            cg_id = ep.content_group_id
                            if cg_id not in content_groups:
                                content_groups[cg_id] = []
                            content_groups[cg_id].append(ep)

                        collapsed_episodes: list[dict] = []
                        for cg_id, ep_variants in content_groups.items():
                            total_episodes_count += 1
                            # Primary/canonical episode representation
                            canonical = ep_variants[0]
                            languages = sorted(list({v.language for v in ep_variants}))
                            audio_streams = {
                                v.language: v.stream_url
                                for v in ep_variants
                                if v.stream_url
                            }
                            variants_data = [
                                {
                                    "id": str(v.id),
                                    "language": v.language,
                                    "title": v.title,
                                    "synopsis": v.synopsis,
                                    "duration_seconds": v.duration_seconds,
                                    "stream_url": v.stream_url,
                                }
                                for v in ep_variants
                            ]

                            collapsed_episodes.append({
                                "content_group_id": cg_id,
                                "episode_number": canonical.episode_number,
                                "title": canonical.title,
                                "synopsis": canonical.synopsis,
                                "duration_seconds": canonical.duration_seconds,
                                "thumbnail_url": canonical.thumbnail.url if canonical.thumbnail else None,
                                "languages": languages,
                                "audio_streams": audio_streams,
                                "variants": variants_data,
                            })

                        # Sort episodes deterministically by episode number
                        collapsed_episodes.sort(key=lambda e: e["episode_number"])

                        seasons_list.append({
                            "season_number": season.season_number,
                            "title": season.title or f"Season {season.season_number}",
                            "synopsis": season.synopsis,
                            "episodes": collapsed_episodes,
                        })

                show_dict = {
                    "id": str(show.id),
                    "title": show.title,
                    "slug": show.slug,
                    "synopsis": show.synopsis,
                    "category": show.category,
                    "section": show.section or "General",
                    "poster_url": show.poster.url if show.poster else None,
                    "banner_url": show.banner.url if show.banner else None,
                    "sort_order": show.sort_order,
                    "trailers": trailers_list,
                    "seasons": seasons_list,
                }

                all_shows_list.append(show_dict)
                sec_name = show_dict["section"]
                if sec_name not in sections_dict:
                    sections_dict[sec_name] = []
                sections_dict[sec_name].append(show_dict)

            # Pick featured hero show (first show with banner)
            featured_show = next((s for s in all_shows_list if s.get("banner_url")), None)
            if not featured_show and all_shows_list:
                featured_show = all_shows_list[0]

            catalog_payload = {
                "generated_at": now.isoformat(),
                "version": "1.0",
                "total_shows": len(all_shows_list),
                "total_episodes": total_episodes_count,
                "featured": featured_show,
                "sections": sections_dict,
                "all_shows": all_shows_list,
            }

            # 4. Serialize to deterministic JSON
            json_bytes = json.dumps(catalog_payload, indent=2, ensure_ascii=False).encode("utf-8")
            file_hash = hashlib.sha256(json_bytes).hexdigest()
            file_size = len(json_bytes)

            # 5. ATOMIC STORAGE WRITE
            # Writes to temp file then performs atomic rename/swap
            public_url = await storage.atomic_write(
                path=settings.CATALOG_FILE_PATH,
                content=json_bytes,
                content_type="application/json"
            )

            # 6. Update publish run audit record (success)
            completed_now = datetime.now(timezone.utc)
            run_record.status = "success"
            run_record.completed_at = completed_now
            run_record.show_count = len(all_shows_list)
            run_record.episode_count = total_episodes_count
            run_record.file_hash = file_hash
            run_record.file_size_bytes = file_size
            await db.commit()

            duration_ms = round((time.perf_counter() - start_time) * 1000, 2)

            return PublishTriggerResponse(
                success=True,
                message=f"Catalogue successfully published ({len(all_shows_list)} shows, {total_episodes_count} episodes).",
                run_id=run_record.id,
                file_path=settings.CATALOG_FILE_PATH,
                file_url=public_url,
                file_hash=file_hash,
                file_size_bytes=file_size,
                show_count=len(all_shows_list),
                episode_count=total_episodes_count,
                duration_ms=duration_ms,
            )

        except Exception as exc:
            run_record.status = "failed"
            run_record.completed_at = datetime.now(timezone.utc)
            run_record.error_message = str(exc)
            await db.commit()
            if isinstance(exc, HTTPException):
                raise exc
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Publish process encountered an unexpected error: {str(exc)}"
            )

    @staticmethod
    async def get_publish_runs(db: AsyncSession, limit: int = 20) -> list[PublishRun]:
        stmt = select(PublishRun).order_by(desc(PublishRun.started_at)).limit(limit)
        result = await db.execute(stmt)
        return list(result.scalars().all())
