from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict

from app.schemas.common import UUIDStr


class SessionCreateRequest(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    company_id: UUIDStr
    product_id: UUIDStr | None = None
    product_model_id: UUIDStr | None = None
    external_user_label: str | None = None
    initial_message: str | None = None


class SessionCreateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    session_id: UUIDStr
    status: str
    current_phase: str


class SessionListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUIDStr
    title: str | None = None
    status: str
    severity: str
    current_phase: str
    product_name: str | None = None
    created_at: datetime
    updated_at: datetime


class SessionListResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    sessions: list[SessionListItem]
    total: int


class SessionMessageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUIDStr
    session_id: UUIDStr
    role: str
    content: str
    content_type: str
    metadata: dict[str, Any]
    created_at: datetime


class DiagnosticStateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    observed_symptoms: list[Any]
    known_context: dict[str, Any]
    hypotheses: list[Any]
    eliminated_causes: list[Any]
    performed_steps: list[Any]
    recommended_next_step: dict[str, Any] | None = None
    confidence: float


class SessionDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUIDStr
    company_id: UUIDStr
    product_id: UUIDStr | None = None
    product_model_id: UUIDStr | None = None
    status: str
    severity: str
    current_phase: str
    messages: list[SessionMessageResponse]
    diagnostic_state: DiagnosticStateResponse | dict[str, Any]


class MessageCreateRequest(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    content: str
    content_type: str
    media_ids: list[UUIDStr]


class MessageCreateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    message_id: UUIDStr
    session_id: UUIDStr
    created_at: datetime


class SessionResolveRequest(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    resolution_summary: str
    final_cause: str | None = None


class SessionResolveResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    session_id: UUIDStr
    status: str
    resolved_at: datetime


class SessionEscalateRequest(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    reason: str
    priority: str


class SessionEscalateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    escalation_id: UUIDStr
    session_id: UUIDStr
    status: str
