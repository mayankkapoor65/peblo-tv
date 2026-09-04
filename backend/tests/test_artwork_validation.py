import pytest
from httpx import AsyncClient
from tests.conftest import make_test_image

@pytest.mark.asyncio
async def test_upload_valid_poster(client: AsyncClient, admin_headers: dict):
    image_bytes = make_test_image(600, 900)  # 2:3 aspect ratio
    files = {"file": ("poster.jpg", image_bytes, "image/jpeg")}
    response = await client.post(
        "/api/admin/artwork/upload?artwork_type=poster",
        headers=admin_headers,
        files=files
    )
    assert response.status_code == 201
    data = response.json()
    assert data["artwork_type"] == "poster"
    assert data["width"] == 600
    assert data["height"] == 900
    assert "url" in data
    assert data["file_size_bytes"] == len(image_bytes)

@pytest.mark.asyncio
async def test_upload_valid_banner(client: AsyncClient, admin_headers: dict):
    image_bytes = make_test_image(1280, 720)  # 16:9 aspect ratio
    files = {"file": ("banner.jpg", image_bytes, "image/jpeg")}
    response = await client.post(
        "/api/admin/artwork/upload?artwork_type=banner",
        headers=admin_headers,
        files=files
    )
    assert response.status_code == 201
    data = response.json()
    assert data["artwork_type"] == "banner"
    assert data["width"] == 1280
    assert data["height"] == 720

@pytest.mark.asyncio
async def test_upload_valid_thumbnail(client: AsyncClient, admin_headers: dict):
    image_bytes = make_test_image(640, 360)  # 16:9 aspect ratio
    files = {"file": ("thumb.jpg", image_bytes, "image/jpeg")}
    response = await client.post(
        "/api/admin/artwork/upload?artwork_type=thumbnail",
        headers=admin_headers,
        files=files
    )
    assert response.status_code == 201
    data = response.json()
    assert data["artwork_type"] == "thumbnail"

@pytest.mark.asyncio
async def test_poster_wrong_aspect_ratio_rejected(client: AsyncClient, admin_headers: dict):
    # Upload horizontal/landscape image for poster (requires 2:3 vertical)
    image_bytes = make_test_image(800, 400)
    files = {"file": ("landscape_poster.jpg", image_bytes, "image/jpeg")}
    response = await client.post(
        "/api/admin/artwork/upload?artwork_type=poster",
        headers=admin_headers,
        files=files
    )
    assert response.status_code == 422
    err = response.json()
    assert "Invalid image shape" in str(err)
    assert "2:3" in str(err)

@pytest.mark.asyncio
async def test_artwork_exceeding_200kb_ceiling_rejected(client: AsyncClient, admin_headers: dict):
    # Create fake uncompressed image byte stream > 200KB (e.g. 250KB)
    large_payload = b"\xff\xd8\xff" + b"X" * (250 * 1024)
    files = {"file": ("heavy_image.jpg", large_payload, "image/jpeg")}
    response = await client.post(
        "/api/admin/artwork/upload?artwork_type=poster",
        headers=admin_headers,
        files=files
    )
    assert response.status_code == 422
    err = response.json()
    assert "too large" in str(err).lower()
    assert "200 kb" in str(err).lower()

@pytest.mark.asyncio
async def test_corrupted_image_rejected(client: AsyncClient, admin_headers: dict):
    garbage_bytes = b"NOT_A_REAL_IMAGE_CORRUPTED_BYTES"
    files = {"file": ("corrupt.jpg", garbage_bytes, "image/jpeg")}
    response = await client.post(
        "/api/admin/artwork/upload?artwork_type=banner",
        headers=admin_headers,
        files=files
    )
    assert response.status_code == 422
    err = response.json()
    assert "unable to read" in str(err).lower() or "valid" in str(err).lower()
