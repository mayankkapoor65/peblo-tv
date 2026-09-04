from abc import ABC, abstractmethod
from typing import Optional

class StorageProvider(ABC):
    """
    Unified Storage Interface.
    Implemented by LocalStorageProvider and S3StorageProvider (AWS S3, MinIO, Cloudflare R2).
    """

    @abstractmethod
    async def put(self, path: str, content: bytes, content_type: str = "application/octet-stream") -> str:
        """
        Store bytes at `path` and return the publicly accessible URL.
        """
        pass

    @abstractmethod
    async def get(self, path: str) -> bytes:
        """
        Retrieve file content as bytes from `path`.
        Raises FileNotFoundError if missing.
        """
        pass

    @abstractmethod
    async def atomic_write(self, path: str, content: bytes, content_type: str = "application/octet-stream") -> str:
        """
        Atomically write `content` to `path`.
        Ensures a reader never sees a partial or corrupted file by writing to
        a temporary location first and performing an atomic rename/swap.
        """
        pass

    @abstractmethod
    async def exists(self, path: str) -> bool:
        """
        Check if file exists at `path`.
        """
        pass

    @abstractmethod
    async def delete(self, path: str) -> bool:
        """
        Delete file at `path`. Returns True if deleted, False otherwise.
        """
        pass

    @abstractmethod
    def get_public_url(self, path: str) -> str:
        """
        Convert relative storage path to a client-accessible URL.
        """
        pass
