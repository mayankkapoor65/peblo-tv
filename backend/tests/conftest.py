import io
import pytest
import pytest_asyncio
import tempfile
import os
from typing import AsyncGenerator
from PIL import Image
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.pool import StaticPool

from app.config import settings
from app.database import Base, get_db
from app.main import app
from app.models.user import User
from app.storage.local import LocalStorageProvider
from app.storage import get_storage
import app.storage as storage_module
from app.api.deps import create_access_token, get_password_hash

# Use in-memory SQLite for high-speed isolated tests
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"

test_engine = create_async_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestingSessionLocal = async_sessionmaker(
    bind=test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

@pytest_asyncio.fixture(scope="function")
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    async with TestingSessionLocal() as session:
        yield session

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

@pytest.fixture(scope="function")
def temp_storage_dir():
    with tempfile.TemporaryDirectory() as tmpdir:
        provider = LocalStorageProvider(base_dir=tmpdir, public_url_prefix="/storage")
        storage_module._storage_instance = provider
        yield tmpdir
        storage_module._storage_instance = None

@pytest_asyncio.fixture(scope="function")
async def client(db_session: AsyncSession, temp_storage_dir) -> AsyncGenerator[AsyncClient, None]:
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac

    app.dependency_overrides.clear()

@pytest_asyncio.fixture(scope="function")
async def admin_user(db_session: AsyncSession) -> User:
    user = User(
        email="admin@test.com",
        full_name="Admin Test",
        role="admin",
        hashed_password=get_password_hash("testpass"),
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user

@pytest_asyncio.fixture(scope="function")
async def editor_user(db_session: AsyncSession) -> User:
    user = User(
        email="editor@test.com",
        full_name="Editor Test",
        role="editor",
        hashed_password=get_password_hash("testpass"),
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)
    return user

@pytest.fixture
def admin_headers(admin_user: User) -> dict:
    token = create_access_token({"sub": str(admin_user.id), "role": admin_user.role, "email": admin_user.email})
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def editor_headers(editor_user: User) -> dict:
    token = create_access_token({"sub": str(editor_user.id), "role": editor_user.role, "email": editor_user.email})
    return {"Authorization": f"Bearer {token}"}

def make_test_image(width: int, height: int, format: str = "JPEG", color=(50, 100, 200)) -> bytes:
    img = Image.new("RGB", (width, height), color=color)
    buf = io.BytesIO()
    img.save(buf, format=format)
    return buf.getvalue()
