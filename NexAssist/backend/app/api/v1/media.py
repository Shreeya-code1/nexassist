import base64
from typing import Any

from fastapi import APIRouter, Depends, File, Form, UploadFile, status

from app.core.auth import extract_user_id
from app.core.errors import NotFoundError
from app.core.security import require_company_member
from app.db.repositories.sessions import SessionsRepository
from app.db.supabase import get_service_client
from app.dependencies import get_current_user, get_session_repo
from app.schemas.media import ImageAnalyzeRequest, ImageAnalyzeResponse, MediaTranscriptionResponse, MediaUploadResponse
from app.services.vision import analyze_image
from app.services.voice import transcribe
from app.utils.ids import generate_uuid
from app.utils.storage import download_file, upload_file


router = APIRouter()


def _media(media_id: str) -> dict[str, Any]:
    result = get_service_client().table("session_media").select("*").eq("id", media_id).limit(1).execute()
    if not result.data:
        raise NotFoundError("Session media not found")
    return result.data[0]


def _authorize_session(session_id: str, user: dict[str, Any], repo: SessionsRepository) -> None:
    session = repo.get_session(session_id)
    require_company_member(extract_user_id(user), str(session["company_id"]), "viewer")


def _authorize_media(media: dict[str, Any], user: dict[str, Any], repo: SessionsRepository) -> None:
    _authorize_session(str(media["session_id"]), user, repo)


@router.post("/upload", response_model=MediaUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_media(session_id: str = Form(...), media_type: str = Form(...), file: UploadFile = File(...), user: dict[str, Any] = Depends(get_current_user), repo: SessionsRepository = Depends(get_session_repo)) -> dict[str, Any]:
    _authorize_session(session_id, user, repo)
    data = await file.read()
    path = f"{session_id}/{generate_uuid()}_{file.filename or 'media'}"
    upload_file("session-media", path, data, file.content_type or "application/octet-stream")
    result = get_service_client().table("session_media").insert({"session_id": session_id, "storage_bucket": "session-media", "storage_path": path, "media_type": media_type, "mime_type": file.content_type or "application/octet-stream", "file_size_bytes": len(data), "metadata": {}}).execute()
    return {"media_id": result.data[0]["id"], "storage_path": path, "media_type": media_type, "mime_type": file.content_type or "application/octet-stream"}


@router.post("/{media_id}/transcribe", response_model=MediaTranscriptionResponse)
def transcribe_media(media_id: str, user: dict[str, Any] = Depends(get_current_user), repo: SessionsRepository = Depends(get_session_repo)) -> dict[str, Any]:
    media = _media(media_id)
    _authorize_media(media, user, repo)
    transcript = transcribe(media_id, download_file(str(media["storage_bucket"]), str(media["storage_path"])), str(media["storage_path"]).split("/")[-1], "en")
    get_service_client().table("session_media").update({"transcript": transcript}).eq("id", media_id).execute()
    return {"media_id": media_id, "transcript": transcript}


@router.post("/{media_id}/analyze-image", response_model=ImageAnalyzeResponse)
def analyze_media_image(media_id: str, payload: ImageAnalyzeRequest, user: dict[str, Any] = Depends(get_current_user), repo: SessionsRepository = Depends(get_session_repo)) -> dict[str, Any]:
    media = _media(media_id)
    _authorize_media(media, user, repo)
    data = download_file(str(media["storage_bucket"]), str(media["storage_path"]))
    result = analyze_image(media_id, base64.b64encode(data).decode("ascii"), "summarize_media", [payload.prompt] if payload.prompt else [])
    get_service_client().table("session_media").update({"vision_summary": result["raw_text"]}).eq("id", media_id).execute()
    return {"media_id": media_id, "vision_summary": result["raw_text"], "detected_labels": []}
