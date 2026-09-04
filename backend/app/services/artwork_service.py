import io
import uuid
from PIL import Image
from fastapi import UploadFile, HTTPException, status
from app.models.artwork import Artwork
from app.storage import get_storage

MAX_FILE_SIZE_BYTES = 200 * 1024  # 200 KB ceiling

ARTWORK_SPECS = {
    "poster": {
        "target_aspect": 2.0 / 3.0,  # 0.6667
        "aspect_tolerance": 0.08,
        "target_desc": "2:3 portrait (recommended ~600x900 px)",
        "min_width": 200,
        "min_height": 300,
    },
    "banner": {
        "target_aspect": 16.0 / 9.0,  # 1.7778
        "aspect_tolerance": 0.12,
        "target_desc": "16:9 landscape (recommended ~1280x720 px)",
        "min_width": 400,
        "min_height": 225,
    },
    "thumbnail": {
        "target_aspect": 16.0 / 9.0,  # 1.7778
        "aspect_tolerance": 0.12,
        "target_desc": "16:9 landscape (recommended ~640x360 px)",
        "min_width": 200,
        "min_height": 112,
    },
}

class ArtworkValidationError(HTTPException):
    def __init__(self, message: str):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            detail={"error": "ARTWORK_VALIDATION_FAILED", "message": message}
        )

class ArtworkService:
    @staticmethod
    async def process_and_save_artwork(
        file: UploadFile,
        artwork_type: str
    ) -> Artwork:
        artwork_type = artwork_type.lower().strip()
        if artwork_type not in ARTWORK_SPECS:
            raise ArtworkValidationError(
                f"Unsupported artwork slot '{artwork_type}'. Please choose one of: poster, banner, or thumbnail."
            )

        # Read file into memory
        content = await file.read()
        file_size = len(content)

        # 1. Size ceiling check
        if file_size > MAX_FILE_SIZE_BYTES:
            size_kb = round(file_size / 1024, 1)
            raise ArtworkValidationError(
                f"The uploaded image is too large ({size_kb} KB). Maximum allowed file size is 200 KB. "
                f"Please compress your image before uploading."
            )

        if file_size == 0:
            raise ArtworkValidationError("The uploaded file is empty. Please select a valid image.")

        # 2. Image decoding & format validation
        try:
            image = Image.open(io.BytesIO(content))
            image.verify()  # verify integrity
            # Reopen because verify() closes the stream or invalidates image state
            image = Image.open(io.BytesIO(content))
        except Exception:
            raise ArtworkValidationError(
                "Unable to read this file as an image. Please ensure you are uploading a valid PNG, JPEG, or WebP file."
            )

        img_format = (image.format or "").upper()
        if img_format not in ["JPEG", "PNG", "WEBP", "JPG"]:
            raise ArtworkValidationError(
                f"Image format '{img_format}' is not supported. Please upload a JPEG, PNG, or WebP image."
            )

        width, height = image.size
        spec = ARTWORK_SPECS[artwork_type]

        # 3. Minimum dimensions check
        if width < spec["min_width"] or height < spec["min_height"]:
            raise ArtworkValidationError(
                f"Image resolution is too low ({width}x{height} px). "
                f"Minimum required dimensions for a {artwork_type} are {spec['min_width']}x{spec['min_height']} px."
            )

        # 4. Aspect ratio validation
        actual_aspect = width / height
        target_aspect = spec["target_aspect"]
        diff = abs(actual_aspect - target_aspect)

        if diff > spec["aspect_tolerance"]:
            orientation = "landscape/wide" if actual_aspect > 1 else "portrait/vertical"
            raise ArtworkValidationError(
                f"Invalid image shape ({width}x{height} px, {orientation}). "
                f"A {artwork_type} must have a {spec['target_desc']} aspect ratio."
            )

        # 5. Determine mime type and file extension
        ext = "jpg" if img_format in ["JPEG", "JPG"] else img_format.lower()
        mime_type = file.content_type or f"image/{ext}"
        
        # 6. Save via storage abstraction
        storage = get_storage()
        artwork_id = uuid.uuid4()
        storage_rel_path = f"artworks/{artwork_type}s/{artwork_id}.{ext}"
        public_url = await storage.put(storage_rel_path, content, content_type=mime_type)

        artwork = Artwork(
            id=artwork_id,
            artwork_type=artwork_type,
            storage_path=storage_rel_path,
            url=public_url,
            width=width,
            height=height,
            aspect_ratio=round(actual_aspect, 3),
            file_size_bytes=file_size,
            mime_type=mime_type,
        )

        return artwork
