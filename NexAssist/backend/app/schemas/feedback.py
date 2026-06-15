from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.common import UUIDStr


class FeedbackCreateRequest(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    session_id: UUIDStr
    rating: int | None = None
    resolved: bool | None = None
    comment: str | None = None


class FeedbackCreateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUIDStr
    session_id: UUIDStr
    created_at: datetime
