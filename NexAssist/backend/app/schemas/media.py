from pydantic import BaseModel, ConfigDict

from app.schemas.common import UUIDStr


class MediaUploadResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    media_id: UUIDStr
    storage_path: str
    media_type: str
    mime_type: str


class MediaTranscriptionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    media_id: UUIDStr
    transcript: str


class ImageAnalyzeRequest(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    prompt: str | None = None


class ImageAnalyzeResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    media_id: UUIDStr
    vision_summary: str
    detected_labels: list[str]
