import asyncio
from typing import Optional
from app.storage.base import StorageProvider
from app.config import settings

class S3StorageProvider(StorageProvider):
    """
    S3 compatible storage provider (AWS S3, MinIO, Cloudflare R2).
    Swappable with one configuration setting: STORAGE_BACKEND=s3.
    """

    def __init__(
        self,
        endpoint_url: Optional[str] = None,
        access_key: Optional[str] = None,
        secret_key: Optional[str] = None,
        bucket_name: Optional[str] = None,
        region_name: Optional[str] = None,
        public_base_url: Optional[str] = None,
    ):
        self.endpoint_url = endpoint_url or settings.S3_ENDPOINT_URL
        self.access_key = access_key or settings.S3_ACCESS_KEY
        self.secret_key = secret_key or settings.S3_SECRET_KEY
        self.bucket_name = bucket_name or settings.S3_BUCKET_NAME
        self.region_name = region_name or settings.S3_REGION_NAME
        self.public_base_url = public_base_url or settings.S3_PUBLIC_BASE_URL
        self._client = None

    def _get_client(self):
        if self._client is None:
            import boto3
            self._client = boto3.client(
                "s3",
                endpoint_url=self.endpoint_url,
                aws_access_key_id=self.access_key,
                aws_secret_access_key=self.secret_key,
                region_name=self.region_name,
            )
        return self._client

    async def put(self, path: str, content: bytes, content_type: str = "application/octet-stream") -> str:
        clean_key = path.lstrip("/\\").replace("\\", "/")
        loop = asyncio.get_running_loop()
        
        def _upload():
            client = self._get_client()
            client.put_object(
                Bucket=self.bucket_name,
                Key=clean_key,
                Body=content,
                ContentType=content_type,
            )
        
        await loop.run_in_executor(None, _upload)
        return self.get_public_url(path)

    async def get(self, path: str) -> bytes:
        clean_key = path.lstrip("/\\").replace("\\", "/")
        loop = asyncio.get_running_loop()

        def _download():
            client = self._get_client()
            resp = client.get_object(Bucket=self.bucket_name, Key=clean_key)
            return resp["Body"].read()

        return await loop.run_in_executor(None, _download)

    async def atomic_write(self, path: str, content: bytes, content_type: str = "application/octet-stream") -> str:
        # S3 PUT operations are atomic by design
        return await self.put(path, content, content_type)

    async def exists(self, path: str) -> bool:
        clean_key = path.lstrip("/\\").replace("\\", "/")
        loop = asyncio.get_running_loop()

        def _head():
            client = self._get_client()
            try:
                client.head_object(Bucket=self.bucket_name, Key=clean_key)
                return True
            except Exception:
                return False

        return await loop.run_in_executor(None, _head)

    async def delete(self, path: str) -> bool:
        clean_key = path.lstrip("/\\").replace("\\", "/")
        loop = asyncio.get_running_loop()

        def _del():
            client = self._get_client()
            client.delete_object(Bucket=self.bucket_name, Key=clean_key)
            return True

        return await loop.run_in_executor(None, _del)

    def get_public_url(self, path: str) -> str:
        clean_key = path.lstrip("/\\").replace("\\", "/")
        if self.public_base_url:
            return f"{self.public_base_url.rstrip('/')}/{clean_key}"
        return f"https://{self.bucket_name}.s3.{self.region_name}.amazonaws.com/{clean_key}"
