from typing import Any

from pydantic import BaseModel, ConfigDict

from app.schemas.common import UUIDStr


class AgentRunRequest(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    session_id: UUIDStr
    message: str
    media_ids: list[UUIDStr]
    stream: bool


class EvidenceItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    manual_id: UUIDStr
    chunk_id: str
    title: str
    page_start: int | None = None
    page_end: int | None = None
    score: float


class ToolRunItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUIDStr | None = None
    tool_name: str | None = None
    input: dict[str, Any] | None = None
    output: dict[str, Any] | None = None
    status: str | None = None
    error_message: str | None = None
    latency_ms: int | None = None


class AgentDiagnosticState(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    observed_symptoms: list[Any]
    known_context: dict[str, Any]
    hypotheses: list[Any]
    eliminated_causes: list[Any]
    performed_steps: list[Any]
    recommended_next_step: dict[str, Any] | None = None
    confidence: float


class AgentRunResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    session_id: UUIDStr
    assistant_message_id: UUIDStr
    answer: str
    current_phase: str
    diagnostic_state: AgentDiagnosticState
    evidence: list[EvidenceItem]
    tool_runs: list[ToolRunItem]


class AgentStreamRequest(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    session_id: UUIDStr
    message: str
    media_ids: list[UUIDStr]


class AgentStreamResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    type: str
    events: list[str]
