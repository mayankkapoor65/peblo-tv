import os
import tempfile
import aiofiles
from pathlib import Path
from app.storage.base import StorageProvider
from app.config import settings

class LocalStorageProvider(StorageProvider):
    """
    Local filesystem storage with guaranteed atomic writes via temporary files and os.replace().
    """

    def __init__(self, base_dir: str | None = None, public_url_prefix: str | None = None):
        self.base_dir = Path(base_dir or settings.STORAGE_LOCAL_DIR).resolve()
        self.public_url_prefix = (public_url_prefix or settings.STORAGE_PUBLIC_URL_PREFIX).rstrip("/")
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def _resolve_path(self, relative_path: str) -> Path:
        clean_path = relative_path.lstrip("/\\")
        target = (self.base_dir / clean_path).resolve()
        # Prevent directory traversal attacks
        if not str(target).startswith(str(self.base_dir)):
            raise ValueError(f"Access denied: path traversal attempt for '{relative_path}'")
        return target

    async def put(self, path: str, content: bytes, content_type: str = "application/octet-stream") -> str:
        target = self._resolve_path(path)
        target.parent.mkdir(parents=True, exist_ok=True)
        
        async with aiofiles.open(target, "wb") as f:
            await f.write(content)
            
        return self.get_public_url(path)

    async def get(self, path: str) -> bytes:
        target = self._resolve_path(path)
        if not target.exists() or not target.is_file():
            raise FileNotFoundError(f"File not found: {path}")
        
        async with aiofiles.open(target, "rb") as f:
            return await f.read()

    async def atomic_write(self, path: str, content: bytes, content_type: str = "application/octet-stream") -> str:
        """
        Guaranteed atomic write on local disk.
        Creates a temporary file in the same directory, writes fully, and atomically replaces target.
        """
        target = self._resolve_path(path)
        target.parent.mkdir(parents=True, exist_ok=True)
        
        # We must create the temp file in target.parent so it's on the identical disk mount / filesystem
        temp_fd, temp_path_str = tempfile.mkstemp(
            dir=str(target.parent),
            prefix=f".{target.name}.tmp_",
            suffix=".tmp"
        )
        
        try:
            with os.fdopen(temp_fd, "wb") as f:
                f.write(content)
                f.flush()
                os.fsync(f.fileno())  # Ensure data is flushed to physical storage
            
            # Atomic swap
            os.replace(temp_path_str, str(target))
        except Exception:
            if os.path.exists(temp_path_str):
                try:
                    os.remove(temp_path_str)
                except OSError:
                    pass
            raise
            
        return self.get_public_url(path)

    async def exists(self, path: str) -> bool:
        target = self._resolve_path(path)
        return target.exists() and target.is_file()

    async def delete(self, path: str) -> bool:
        target = self._resolve_path(path)
        if target.exists() and target.is_file():
            target.unlink()
            return True
        return False

    def get_public_url(self, path: str) -> str:
        clean_path = path.lstrip("/\\").replace("\\", "/")
        return f"{self.public_url_prefix}/{clean_path}"
