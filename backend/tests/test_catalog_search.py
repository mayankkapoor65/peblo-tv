import pytest
from httpx import AsyncClient
from tests.conftest import make_test_image

@pytest.mark.asyncio
async def test_composite_catalog_search(client: AsyncClient, admin_headers: dict):
    # Setup show 1
    poster1_id = (await client.post(
        "/api/admin/artwork/upload?artwork_type=poster",
        headers=admin_headers,
        files={"file": ("p1.jpg", make_test_image(600, 900), "image/jpeg")}
    )).json()["id"]

    show1_id = (await client.post(
        "/api/admin/shows",
        headers=admin_headers,
        json={
            "title": "Interstellar Odyssey",
            "slug": "interstellar-odyssey",
            "category": "Sci-Fi",
            "section": "Trending Now",
            "status": "published",
            "poster_id": poster1_id,
        }
    )).json()["id"]

    s1_id = (await client.post(
        f"/api/admin/shows/{show1_id}/seasons",
        headers=admin_headers,
        json={"season_number": 1, "title": "Season 1"}
    )).json()["id"]

    await client.post(
        f"/api/admin/seasons/{s1_id}/episodes",
        headers=admin_headers,
        json={
            "episode_number": 1,
            "content_group_id": "cg-io-1",
            "language": "en",
            "title": "Wormhole Passage",
            "duration_seconds": 3000,
        }
    )

    # Setup show 2
    show2_id = (await client.post(
        "/api/admin/shows",
        headers=admin_headers,
        json={
            "title": "Tokyo Underground",
            "slug": "tokyo-underground",
            "category": "Crime / Drama",
            "section": "Trending Now",
            "status": "published",
        }
    )).json()["id"]

    s2_id = (await client.post(
        f"/api/admin/shows/{show2_id}/seasons",
        headers=admin_headers,
        json={"season_number": 1, "title": "Season 1"}
    )).json()["id"]

    await client.post(
        f"/api/admin/seasons/{s2_id}/episodes",
        headers=admin_headers,
        json={
            "episode_number": 1,
            "content_group_id": "cg-tu-1",
            "language": "ja",
            "title": "Midnight Alley",
            "duration_seconds": 2700,
        }
    )

    # 1. Search by show title query `q=Interstellar`
    res = await client.get("/catalog/search?q=Interstellar")
    assert res.status_code == 200
    data = res.json()
    assert data["total"] >= 1
    assert any("Interstellar" in r["show_title"] for r in data["results"])

    # 2. Search by episode title query `q=Wormhole`
    res_ep = await client.get("/catalog/search?q=Wormhole")
    assert res_ep.status_code == 200
    data_ep = res_ep.json()
    assert data_ep["total"] >= 1
    assert any("Wormhole Passage" in (r["episode_title"] or "") for r in data_ep["results"])

    # 3. Filter by category `category=Crime`
    res_cat = await client.get("/catalog/search?category=Crime")
    assert res_cat.status_code == 200
    data_cat = res_cat.json()
    assert any("Tokyo Underground" in r["show_title"] for r in data_cat["results"])
    assert not any("Interstellar" in r["show_title"] for r in data_cat["results"])

    # 4. Filter by language `language=ja`
    res_lang = await client.get("/catalog/search?language=ja")
    assert res_lang.status_code == 200
    data_lang = res_lang.json()
    assert any("Tokyo Underground" in r["show_title"] for r in data_lang["results"])
