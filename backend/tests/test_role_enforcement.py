import pytest
from httpx import AsyncClient
from tests.conftest import make_test_image

@pytest.mark.asyncio
async def test_role_enforcement_admin_vs_editor(client: AsyncClient, admin_headers: dict, editor_headers: dict):
    # 1. Editor can upload artwork (CRUD permitted)
    art_resp = await client.post(
        "/api/admin/artwork/upload?artwork_type=poster",
        headers=editor_headers,
        files={"file": ("poster.jpg", make_test_image(600, 900), "image/jpeg")}
    )
    assert art_resp.status_code == 201

    # 2. Editor can create a show (CRUD permitted)
    show_resp = await client.post(
        "/api/admin/shows",
        headers=editor_headers,
        json={
            "title": "Editor Created Show",
            "slug": "editor-created-show",
            "category": "Drama",
            "section": "Trending Now",
            "status": "draft",
        }
    )
    assert show_resp.status_code == 201

    # 3. Editor attempts to PUBLISH -> MUST FAIL with 403 Forbidden
    publish_editor_resp = await client.post(
        "/api/admin/catalog/publish",
        headers=editor_headers
    )
    assert publish_editor_resp.status_code == 403
    err = publish_editor_resp.json()
    assert err["detail"]["error"] == "PERMISSION_DENIED"
    assert "required role 'admin'" in err["detail"]["message"]

    # 4. Unauthenticated user attempts to publish -> 401 or 403
    unauth_resp = await client.post(
        "/api/admin/catalog/publish",
        headers={"Authorization": "Bearer invalid.token.value"}
    )
    assert unauth_resp.status_code == 401
