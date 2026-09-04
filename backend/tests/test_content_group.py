import pytest
from httpx import AsyncClient
from tests.conftest import make_test_image

@pytest.mark.asyncio
async def test_content_group_collapsing_and_season0(client: AsyncClient, admin_headers: dict):
    # 1. Upload artworks
    poster_id = (await client.post(
        "/api/admin/artwork/upload?artwork_type=poster",
        headers=admin_headers,
        files={"file": ("p.jpg", make_test_image(600, 900), "image/jpeg")}
    )).json()["id"]

    banner_id = (await client.post(
        "/api/admin/artwork/upload?artwork_type=banner",
        headers=admin_headers,
        files={"file": ("b.jpg", make_test_image(1280, 720), "image/jpeg")}
    )).json()["id"]

    thumb_id = (await client.post(
        "/api/admin/artwork/upload?artwork_type=thumbnail",
        headers=admin_headers,
        files={"file": ("t.jpg", make_test_image(640, 360), "image/jpeg")}
    )).json()["id"]

    # 2. Create Show
    show_id = (await client.post(
        "/api/admin/shows",
        headers=admin_headers,
        json={
            "title": "Babel Universe",
            "slug": "babel-universe",
            "synopsis": "Multi-language sci-fi drama.",
            "category": "Sci-Fi",
            "section": "Trending Now",
            "status": "published",
            "poster_id": poster_id,
            "banner_id": banner_id,
        }
    )).json()["id"]

    # 3. Create Season 0 (Trailers)
    season0_id = (await client.post(
        f"/api/admin/shows/{show_id}/seasons",
        headers=admin_headers,
        json={"season_number": 0, "title": "Trailers", "synopsis": "Promo clips"}
    )).json()["id"]

    # Create trailer episode in Season 0
    await client.post(
        f"/api/admin/seasons/{season0_id}/episodes",
        headers=admin_headers,
        json={
            "episode_number": 1,
            "content_group_id": "cg-babel-promo-1",
            "language": "en",
            "title": "Official Teaser",
            "synopsis": "Teaser trailer",
            "duration_seconds": 90,
            "thumbnail_id": thumb_id,
            "stream_url": "https://example.com/teaser.mp4"
        }
    )

    # 4. Create Season 1 (Regular season)
    season1_id = (await client.post(
        f"/api/admin/shows/{show_id}/seasons",
        headers=admin_headers,
        json={"season_number": 1, "title": "Season 1", "synopsis": "First season"}
    )).json()["id"]

    # 5. Add 3 language variants for Episode 1 under the SAME content_group_id
    shared_cg = "cg-babel-s01e01"
    
    # Variant 1: English
    ep_en = await client.post(
        f"/api/admin/seasons/{season1_id}/episodes",
        headers=admin_headers,
        json={
            "episode_number": 1,
            "content_group_id": shared_cg,
            "language": "en",
            "title": "Arrival",
            "synopsis": "The first encounter.",
            "duration_seconds": 3200,
            "thumbnail_id": thumb_id,
            "stream_url": "https://example.com/stream-en.mp4"
        }
    )
    assert ep_en.status_code == 201

    # Variant 2: Spanish
    ep_es = await client.post(
        f"/api/admin/seasons/{season1_id}/episodes",
        headers=admin_headers,
        json={
            "episode_number": 1,
            "content_group_id": shared_cg,
            "language": "es",
            "title": "Llegada",
            "synopsis": "El primer encuentro.",
            "duration_seconds": 3200,
            "thumbnail_id": thumb_id,
            "stream_url": "https://example.com/stream-es.mp4"
        }
    )
    assert ep_es.status_code == 201

    # Variant 3: Japanese
    ep_ja = await client.post(
        f"/api/admin/seasons/{season1_id}/episodes",
        headers=admin_headers,
        json={
            "episode_number": 1,
            "content_group_id": shared_cg,
            "language": "ja",
            "title": "到着",
            "synopsis": "最初の遭遇。",
            "duration_seconds": 3200,
            "thumbnail_id": thumb_id,
            "stream_url": "https://example.com/stream-ja.mp4"
        }
    )
    assert ep_ja.status_code == 201

    # 6. Attempt duplicate (content_group, language) -> MUST FAIL with 409 Conflict
    ep_dup = await client.post(
        f"/api/admin/seasons/{season1_id}/episodes",
        headers=admin_headers,
        json={
            "episode_number": 1,
            "content_group_id": shared_cg,
            "language": "en",  # Duplicate!
            "title": "Arrival Duplicate",
            "duration_seconds": 3200,
            "thumbnail_id": thumb_id,
        }
    )
    assert ep_dup.status_code == 409

    # 7. Trigger Publish and verify collapsed catalogue structure
    publish_res = await client.post("/api/admin/catalog/publish", headers=admin_headers)
    assert publish_res.status_code == 200

    catalog_res = await client.get("/catalog")
    assert catalog_res.status_code == 200
    catalog = catalog_res.json()

    # Find the show in catalogue
    target_show = next(s for s in catalog["all_shows"] if s["id"] == show_id)
    
    # Verify Season 0 trailers are separated into show.trailers[]
    assert len(target_show["trailers"]) == 1
    assert target_show["trailers"][0]["title"] == "Official Teaser"

    # Verify normal seasons list has Season 1 (and does NOT contain Season 0)
    assert len(target_show["seasons"]) == 1
    season_1_entry = target_show["seasons"][0]
    assert season_1_entry["season_number"] == 1

    # Verify Episode 1 collapsed from 3 rows into 1 single catalogue entry with languages[]
    assert len(season_1_entry["episodes"]) == 1
    collapsed_ep = season_1_entry["episodes"][0]
    assert collapsed_ep["content_group_id"] == shared_cg
    assert sorted(collapsed_ep["languages"]) == ["en", "es", "ja"]
    assert "en" in collapsed_ep["audio_streams"]
    assert "es" in collapsed_ep["audio_streams"]
    assert "ja" in collapsed_ep["audio_streams"]
    assert len(collapsed_ep["variants"]) == 3
