from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.models.show import Show
from app.models.season import Season
from app.models.episode import Episode
from app.schemas.validation import ValidationIssue, ValidationSummary, ValidationReport

class ValidationService:
    @staticmethod
    async def generate_validation_report(db: AsyncSession) -> ValidationReport:
        # Load all shows with seasons and episodes
        stmt = (
            select(Show)
            .options(
                selectinload(Show.poster),
                selectinload(Show.banner),
                selectinload(Show.seasons).selectinload(Season.episodes).selectinload(Episode.thumbnail)
            )
            .where(Show.status != "archived")
            .order_by(Show.title.asc())
        )
        result = await db.execute(stmt)
        shows = result.scalars().all()

        issues_by_category: dict[str, list[ValidationIssue]] = {}
        all_issues: list[ValidationIssue] = []
        blocked_show_ids = set()

        def add_issue(issue: ValidationIssue):
            all_issues.append(issue)
            if issue.issue_type not in issues_by_category:
                issues_by_category[issue.issue_type] = []
            issues_by_category[issue.issue_type].append(issue)
            if issue.show_id and issue.severity == "blocking":
                blocked_show_ids.add(issue.show_id)

        for show in shows:
            # 1. Section Check
            if not show.section or not show.section.strip():
                add_issue(ValidationIssue(
                    issue_type="MISSING_SHOW_SECTION",
                    severity="blocking",
                    show_id=show.id,
                    show_title=show.title,
                    message=f"Show '{show.title}' has no section assigned. A section (e.g. 'Trending Now', 'New Releases') is required before publishing."
                ))

            # 2. Poster Check
            if not show.poster_id or not show.poster:
                add_issue(ValidationIssue(
                    issue_type="MISSING_SHOW_POSTER",
                    severity="blocking",
                    show_id=show.id,
                    show_title=show.title,
                    message=f"Show '{show.title}' is missing a 2:3 vertical poster artwork."
                ))

            # 3. Banner Check
            if not show.banner_id or not show.banner:
                add_issue(ValidationIssue(
                    issue_type="MISSING_SHOW_BANNER",
                    severity="blocking",
                    show_id=show.id,
                    show_title=show.title,
                    message=f"Show '{show.title}' is missing a 16:9 hero banner artwork."
                ))

            # 4. Seasons Check
            regular_seasons = [s for s in show.seasons if s.season_number > 0]
            if not regular_seasons:
                add_issue(ValidationIssue(
                    issue_type="EMPTY_SHOW_NO_SEASONS",
                    severity="blocking",
                    show_id=show.id,
                    show_title=show.title,
                    message=f"Show '{show.title}' has no regular numbered seasons (Season 1, 2, ...)."
                ))

            for season in show.seasons:
                if not season.episodes:
                    season_label = "Season 0 (Trailers)" if season.season_number == 0 else f"Season {season.season_number}"
                    add_issue(ValidationIssue(
                        issue_type="EMPTY_SEASON_NO_EPISODES",
                        severity="blocking",
                        show_id=show.id,
                        show_title=show.title,
                        season_id=season.id,
                        season_number=season.season_number,
                        message=f"Show '{show.title}' - {season_label} has no episodes or video clips."
                    ))

                # Check each episode in season
                seen_lang_cg = set()
                for ep in season.episodes:
                    # Enforce artwork
                    if not ep.thumbnail_id or not ep.thumbnail:
                        add_issue(ValidationIssue(
                            issue_type="MISSING_EPISODE_ARTWORK",
                            severity="blocking",
                            show_id=show.id,
                            show_title=show.title,
                            season_id=season.id,
                            season_number=season.season_number,
                            episode_id=ep.id,
                            episode_number=ep.episode_number,
                            content_group_id=ep.content_group_id,
                            message=f"Episode {ep.episode_number} '{ep.title}' in Season {season.season_number} is missing 16:9 thumbnail artwork."
                        ))

                    # Enforce duration
                    if not ep.duration_seconds or ep.duration_seconds <= 0:
                        add_issue(ValidationIssue(
                            issue_type="MISSING_EPISODE_DURATION",
                            severity="blocking",
                            show_id=show.id,
                            show_title=show.title,
                            season_id=season.id,
                            season_number=season.season_number,
                            episode_id=ep.id,
                            episode_number=ep.episode_number,
                            content_group_id=ep.content_group_id,
                            message=f"Episode {ep.episode_number} '{ep.title}' in Season {season.season_number} has no valid playback duration (duration is 0s)."
                        ))

                    # Duplicate language variant check
                    pair = (ep.content_group_id, ep.language.lower())
                    if pair in seen_lang_cg:
                        add_issue(ValidationIssue(
                            issue_type="DUPLICATE_LANGUAGE_VARIANT",
                            severity="blocking",
                            show_id=show.id,
                            show_title=show.title,
                            season_id=season.id,
                            season_number=season.season_number,
                            episode_id=ep.id,
                            episode_number=ep.episode_number,
                            content_group_id=ep.content_group_id,
                            message=f"Duplicate language '{ep.language}' detected in content group '{ep.content_group_id}' for Episode {ep.episode_number}."
                        ))
                    else:
                        seen_lang_cg.add(pair)

        total_shows = len(shows)
        blocked_shows = len(blocked_show_ids)
        ready_shows = total_shows - blocked_shows

        return ValidationReport(
            can_publish=(len(all_issues) == 0 and total_shows > 0),
            summary=ValidationSummary(
                total_shows=total_shows,
                ready_shows=ready_shows,
                blocked_shows=blocked_shows,
                total_issues=len(all_issues)
            ),
            issues_by_category=issues_by_category,
            all_issues=all_issues
        )
