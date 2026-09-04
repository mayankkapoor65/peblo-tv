import io
import json
import uuid
import asyncio
from pathlib import Path
from PIL import Image, ImageDraw
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import AsyncSessionLocal, engine, Base
from app.models import Show, Season, Episode, Artwork, User
from app.api.deps import get_password_hash
from app.storage import get_storage
from app.services.publisher_service import PublisherService

def create_gradient_image(width: int, height: int, title: str, subtitle: str, bg_hex: str) -> bytes:
    image = Image.new("RGB", (width, height), color="#0f172a")
    draw = ImageDraw.Draw(image)

    accent_rgb = tuple(int(bg_hex.lstrip("#")[i:i+2], 16) for i in (0, 2, 4))
    for y in range(height):
        r = int(15 + (accent_rgb[0] - 15) * (y / height) * 0.4)
        g = int(23 + (accent_rgb[1] - 23) * (y / height) * 0.4)
        b = int(42 + (accent_rgb[2] - 42) * (y / height) * 0.4)
        draw.line([(0, y), (width, y)], fill=(r, g, b))

    draw.rectangle([20, 20, width - 20, height - 20], outline=accent_rgb, width=3)
    
    text_main = title[:30]
    draw.text((width // 2, height // 2 - 20), text_main, fill=(255, 255, 255), anchor="mm")
    draw.text((width // 2, height // 2 + 30), subtitle, fill=(148, 163, 184), anchor="mm")

    buf = io.BytesIO()
    image.save(buf, format="JPEG", quality=85, optimize=True)
    return buf.getvalue()

async def create_artwork_record(
    db: AsyncSession,
    artwork_type: str,
    width: int,
    height: int,
    title: str,
    subtitle: str,
    color_hex: str
) -> Artwork:
    storage = get_storage()
    content = create_gradient_image(width, height, title, subtitle, color_hex)
    art_id = uuid.uuid4()
    rel_path = f"artworks/{artwork_type}s/{art_id}.jpg"
    
    url = await storage.put(rel_path, content, content_type="image/jpeg")
    
    artwork = Artwork(
        id=art_id,
        artwork_type=artwork_type,
        storage_path=rel_path,
        url=url,
        width=width,
        height=height,
        aspect_ratio=round(width / height, 3),
        file_size_bytes=len(content),
        mime_type="image/jpeg",
    )
    db.add(artwork)
    await db.flush()
    return artwork

async def run_seed():
    print("[*] Starting Peblo TV Mini Database Seeder...")
    
    # 1. Initialize tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # 2. Seed Users
        admin_user = (await db.execute(select(User).where(User.email == "admin@peblo.tv"))).scalars().first()
        if not admin_user:
            admin_user = User(
                email="admin@peblo.tv",
                full_name="Sarah Administrator",
                role="admin",
                hashed_password=get_password_hash("admin123"),
            )
            db.add(admin_user)
            print("  Created Admin user: admin@peblo.tv / admin123")

        editor_user = (await db.execute(select(User).where(User.email == "editor@peblo.tv"))).scalars().first()
        if not editor_user:
            editor_user = User(
                email="editor@peblo.tv",
                full_name="Alex Content Editor",
                role="editor",
                hashed_password=get_password_hash("editor123"),
            )
            db.add(editor_user)
            print("  Created Editor user: editor@peblo.tv / editor123")

        await db.commit()

        # 3. Load Seed Shows JSON
        seed_file = Path(__file__).parent / "seed_shows.json"
        if not seed_file.exists():
            print(f"  Error: {seed_file} does not exist.")
            return

        with open(seed_file, "r", encoding="utf-8") as f:
            shows_data = json.load(f)

        for s_data in shows_data:
            existing_show = (await db.execute(select(Show).where(Show.slug == s_data["slug"]))).scalars().first()
            if existing_show:
                print(f"  Show '{s_data['title']}' already exists. Skipping.")
                continue

            color = s_data.get("poster_color", "#3b82f6")
            
            # Generate Poster (600x900, 2:3)
            poster = await create_artwork_record(
                db, "poster", 600, 900, s_data["title"], "POSTER 2:3", color
            )
            
            # Generate Banner (1280x720, 16:9)
            banner = await create_artwork_record(
                db, "banner", 1280, 720, s_data["title"], "HERO BANNER 16:9", s_data.get("banner_color", color)
            )

            show = Show(
                title=s_data["title"],
                slug=s_data["slug"],
                synopsis=s_data["synopsis"],
                category=s_data["category"],
                section=s_data.get("section"),
                status=s_data.get("status", "published"),
                sort_order=s_data.get("sort_order", 0),
                poster_id=poster.id,
                banner_id=banner.id,
            )
            db.add(show)
            await db.flush()

            # Process Seasons & Episodes
            for season_data in s_data.get("seasons", []):
                season = Season(
                    show_id=show.id,
                    season_number=season_data["season_number"],
                    title=season_data["title"],
                    synopsis=season_data["synopsis"],
                    sort_order=season_data["season_number"],
                )
                db.add(season)
                await db.flush()

                for ep_data in season_data.get("episodes", []):
                    # For demo draft episode, omit thumbnail if missing_thumbnail is specified
                    thumb_id = None
                    if not ep_data.get("missing_thumbnail"):
                        thumb = await create_artwork_record(
                            db, "thumbnail", 640, 360, ep_data["title"], f"S{season.season_number}E{ep_data['episode_number']}", color
                        )
                        thumb_id = thumb.id

                    episode = Episode(
                        season_id=season.id,
                        episode_number=ep_data["episode_number"],
                        content_group_id=ep_data["content_group_id"],
                        language=ep_data["language"],
                        title=ep_data["title"],
                        synopsis=ep_data["synopsis"],
                        duration_seconds=ep_data["duration_seconds"],
                        thumbnail_id=thumb_id,
                        stream_url=ep_data.get("stream_url"),
                        sort_order=ep_data["episode_number"],
                    )
                    db.add(episode)

            print(f"  Inserted show: {show.title}")

        await db.commit()

        # 4. Trigger initial catalogue publish
        print("[*] Publishing initial catalogue...")
        try:
            publish_res = await PublisherService.publish_catalog(db, admin_user, force=True)
            print(f"  Initial catalogue published successfully: {publish_res.file_path}")
        except Exception as e:
            print(f"  Publish note: {e}")

    print("[+] Seeding complete!")

if __name__ == "__main__":
    asyncio.run(run_seed())
