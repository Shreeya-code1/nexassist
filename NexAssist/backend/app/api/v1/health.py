from fastapi import APIRouter

from app.config import get_settings


router = APIRouter()


@router.get("/", response_model=dict[str, str])
def health() -> dict[str, str]:
    settings = get_settings()
    return {"status": "ok", "version": settings.app.version}
