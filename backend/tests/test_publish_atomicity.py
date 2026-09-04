import os
import json
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.publish_run import PublishRun
from app.storage import get_storage
from tests.conftest import make_test_image

async def _seed_single_valid_show(client: AsyncClient, headers: dict):
    # Upload poster
    poster_resp = await client.post(
        "/api/admin/artwork/upload?artwork_type=poster",
        headers=headers,
        files={"file": ("p.jpg", make_test_image(600, 900), "image/jpeg")}
    )
    poster_id = poster_resp.json()["id"]

    # Upload banner
    banner_resp = await client.post(
        "/api/admin/artwork/upload?artwork_type=banner",
        headers=headers,
        files={"file": ("b.jpg", make_test_image(1280, 720), "image/jpeg")}
    )
    banner_id = banner_resp.json()["id"]

    # Upload thumb
    thumb_resp = await client.post(
        "/api/admin/artwork/upload?artwork_type=thumbnail",
        headers=headers,
        files={"file": ("t.jpg", make_test_image(640, 360), "image/jpeg")}
    )
    thumb_id = thumb_resp.json()["id"]

    # Create Show
    show_resp = await client.post(
        "/api/admin/shows",
        headers=headers,
        json={
            "title": "Quantum Leap Test",
            "slug": "quantum-leap-test",
            "synopsis": "A test show.",
            "category": "Sci-Fi",
            "section": "Trending Now",
            "status": "published",
            "poster_id": poster_id,
            "banner_id": banner_id,
        }
    )
    show_id = show_resp.json()["id"]

    # Create Season 1
    season_resp = await client.post(
        f"/api/admin/shows/{show_id}/seasons",
        headers=headers,
        json={"season_number": 1, "title": "Season 1", "synopsis": "First season"}
    )
    season_id = season_resp.json()["id"]

    # Create Episode 1
    await client.post(
        f"/api/admin/seasons/{season_id}/episodes",
        headers=headers,
        json={
            "episode_number": 1,
            "content_group_id": "cg-ql-01",
            "language": "en",
            "title": "Genesis",
            "synopsis": "The pilot episode.",
            "duration_seconds": 3600,
            "thumbnail_id": thumb_id,
            "stream_url": "https://example.com/stream.mp4"
        }
    )
    return show_id

@pytest.mark.asyncio
async def test_publish_atomicity_and_audit_run(client: AsyncClient, admin_headers: dict, db_session: AsyncSession):
    await _seed_single_valid_show(client, admin_headers)

    # Trigger publish
    publish_res = await client.post("/api/admin/catalog/publish", headers=admin_headers)
    assert publish_res.status_code == 200
    pub_data = publish_res.json()
    assert pub_data["success"] is True
    assert pub_data["show_count"] >= 1
    assert pub_data["episode_count"] >= 1
    assert pub_data["file_hash"] is not None

    # Verify atomic file in storage
    storage = get_storage()
    file_bytes = await storage.get(pub_data["file_path"])
    parsed = json.loads(file_bytes.decode("utf-8"))
    assert parsed["version"] == "1.0"
    assert "Trending Now" in parsed["sections"]

    # Verify audit run in DB
    runs_res = await client.get("/api/admin/catalog/publish/runs", headers=admin_headers)
    assert runs_res.status_code == 200
    runs = runs_res.json()
    assert len(runs) >= 1
    latest_run = runs[0]
    assert latest_run["status"] == "success"
    assert latest_run["show_count"] == pub_data["show_count"]
    assert latest_run["file_hash"] == pub_data["file_hash"]

@pytest.mark.asyncio
async def test_publish_idempotency(client: AsyncClient, admin_headers: dict):
    await _seed_single_valid_show(client, admin_headers)

    # Publish twice in a row
    res1 = await client.post("/api/admin/catalog/publish", headers=admin_headers)
    res2 = await client.post("/api/admin/catalog/publish", headers=admin_headers)
    assert res1.status_code == 200
    assert res2.status_code == 200
    
    # Both runs produce identical show & episode counts
    assert res1.json()["show_count"] == res2.json()["show_count"]
    assert res1.json()["episode_count"] == res2.json()["episode_count"]
    assert res1.json()["file_size_bytes"] == res2.json()["file_size_bytes"]

    # Public catalog endpoint serves clean valid catalogue data
    cat_res = await client.get("/catalog")
    assert cat_res.status_code == 200
    cat_data = cat_res.json()
    assert "sections" in cat_data
    assert len(cat_data["all_shows"]) == 1
