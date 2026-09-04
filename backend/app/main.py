import os
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

from app.config import settings
from app.database import get_db, engine, Base
from app.storage import get_storage
from app.api import auth, admin_shows, admin_seasons, admin_episodes, admin_artwork, admin_publish, admin_validation, catalog

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Ensure local storage directory exists
    try:
        storage_path = Path(settings.STORAGE_LOCAL_DIR)
        storage_path.mkdir(parents=True, exist_ok=True)
    except Exception as e:
        print(f"Notice: Storage directory setup: {e}")
    
    # Auto-create tables if needed
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception as e:
        print(f"Notice: Database metadata sync: {e}")
        
    yield
    # Shutdown
    try:
        await engine.dispose()
    except Exception:
        pass

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all for development & docker environments
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static file serving for local storage provider
if settings.STORAGE_BACKEND.lower() == "local":
    try:
        local_dir = Path(settings.STORAGE_LOCAL_DIR)
        local_dir.mkdir(parents=True, exist_ok=True)
        app.mount(
            settings.STORAGE_PUBLIC_URL_PREFIX,
            StaticFiles(directory=str(local_dir), html=False),
            name="storage"
        )
    except Exception as e:
        print(f"Notice: Static storage mount skipped: {e}")

# Include Routers
app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
app.include_router(admin_shows.router, prefix=settings.API_V1_PREFIX)
app.include_router(admin_seasons.router, prefix=settings.API_V1_PREFIX)
app.include_router(admin_episodes.router, prefix=settings.API_V1_PREFIX)
app.include_router(admin_artwork.router, prefix=settings.API_V1_PREFIX)
app.include_router(admin_publish.router, prefix=settings.API_V1_PREFIX)
app.include_router(admin_validation.router, prefix=settings.API_V1_PREFIX)

# Also support direct /admin paths for backwards/spec compatibility
app.include_router(admin_shows.router)
app.include_router(admin_seasons.router)
app.include_router(admin_episodes.router)
app.include_router(admin_artwork.router)
app.include_router(admin_publish.router)
app.include_router(admin_validation.router)

# Public catalog endpoints (mounted at root `/catalog` and `/catalog/search` per spec)
app.include_router(catalog.router)
app.include_router(catalog.router, prefix=settings.API_V1_PREFIX)

@app.get("/", tags=["Root"])
async def root():
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs": "/docs",
        "health": "/health",
        "catalog": "/catalog",
    }

@app.get("/health", tags=["Health & Monitoring"])
async def health_check(db: AsyncSession = Depends(get_db)):
    """
    Production healthcheck endpoint.
    Verifies database connectivity and catalogue storage availability.
    """
    health_status = {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "database": "unknown",
        "storage": "unknown",
        "catalog_published": False,
    }

    # 1. Test database query
    try:
        await db.execute(text("SELECT 1"))
        health_status["database"] = "connected"
    except Exception as e:
        health_status["database"] = f"error: {str(e)}"
        health_status["status"] = "degraded"

    # 2. Test storage access
    try:
        storage = get_storage()
        health_status["catalog_published"] = await storage.exists(settings.CATALOG_FILE_PATH)
        health_status["storage"] = "accessible"
    except Exception as e:
        health_status["storage"] = f"error: {str(e)}"
        health_status["status"] = "degraded"

    return health_status
