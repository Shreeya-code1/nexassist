from typing import Any

from fastapi import APIRouter, Depends, status

from app.core.auth import extract_user_id
from app.core.security import require_company_member
from app.db.repositories.feedback import FeedbackRepository
from app.db.repositories.sessions import SessionsRepository
from app.dependencies import get_current_user, get_feedback_repo, get_session_repo
from app.schemas.feedback import FeedbackCreateRequest, FeedbackCreateResponse


router = APIRouter()


@router.post("/", response_model=FeedbackCreateResponse, status_code=status.HTTP_201_CREATED)
def create_feedback(payload: FeedbackCreateRequest, user: dict[str, Any] = Depends(get_current_user), feedback_repo: FeedbackRepository = Depends(get_feedback_repo), session_repo: SessionsRepository = Depends(get_session_repo)) -> dict[str, Any]:
    session = session_repo.get_session(payload.session_id)
    require_company_member(extract_user_id(user), str(session["company_id"]), "viewer")
    return feedback_repo.create_feedback({**payload.model_dump(exclude_none=True), "user_id": extract_user_id(user)})
