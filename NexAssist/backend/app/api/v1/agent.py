import json
from collections.abc import AsyncIterator
from dataclasses import asdict, is_dataclass
from typing import Any

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse

from app.core.auth import extract_user_id
from app.core.security import require_company_member
from app.db.repositories.sessions import SessionsRepository
from app.dependencies import get_current_user, get_session_repo
from app.schemas.agent import AgentRunRequest, AgentRunResponse, AgentStreamRequest, AgentStreamResponse


router = APIRouter()


def _jsonable(value: Any) -> Any:
    if is_dataclass(value):
        return _jsonable(asdict(value))
    if isinstance(value, dict):
        return {key: _jsonable(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_jsonable(item) for item in value]
    return value


def _agent_response(response: Any) -> dict[str, Any]:
    return {"session_id": response.session_id, "assistant_message_id": response.assistant_message_id, "answer": response.answer, "current_phase": response.current_phase, "diagnostic_state": _jsonable(response.diagnostic_state) or _empty_state(), "evidence": [_evidence(item) for item in response.evidence], "tool_runs": [_tool_run(item) for item in response.tool_runs]}


def _empty_state() -> dict[str, Any]:
    return {"observed_symptoms": [], "known_context": {}, "hypotheses": [], "eliminated_causes": [], "performed_steps": [], "recommended_next_step": None, "confidence": 0}


def _evidence(item: dict[str, Any]) -> dict[str, Any]:
    return {"manual_id": str(item.get("manual_id") or ""), "chunk_id": str(item.get("chunk_id") or ""), "title": str(item.get("title") or ""), "page_start": item.get("page_start"), "page_end": item.get("page_end"), "score": float(item.get("score") or 0)}


def _tool_run(item: Any) -> dict[str, Any]:
    data = asdict(item)
    return {"tool_name": data["tool_name"], "input": None, "output": data["output"], "status": "completed" if data["success"] else "failed", "error_message": data["error"], "latency_ms": data["latency_ms"]}


def _authorize(session_id: str, user: dict[str, Any], repo: SessionsRepository) -> None:
    session = repo.get_session(session_id)
    require_company_member(extract_user_id(user), str(session["company_id"]), "viewer")


async def _events(session_id: str, message: str, media_ids: list[str]) -> AsyncIterator[str]:
    from app.services.agent_engine import run_agent_stream

    async for event in run_agent_stream(session_id, message, media_ids):
        yield f"data: {json.dumps(event, default=str)}\n\n"
    yield "data: [DONE]\n\n"


@router.post("/run", response_model=AgentRunResponse)
def run_agent_route(payload: AgentRunRequest, user: dict[str, Any] = Depends(get_current_user), repo: SessionsRepository = Depends(get_session_repo)) -> dict[str, Any]:
    from app.services.agent_engine import run_agent

    _authorize(payload.session_id, user, repo)
    return _agent_response(run_agent(payload.session_id, payload.message, payload.media_ids))


@router.post("/stream", response_model=AgentStreamResponse)
def stream_agent_route(payload: AgentStreamRequest, user: dict[str, Any] = Depends(get_current_user), repo: SessionsRepository = Depends(get_session_repo)) -> StreamingResponse:
    _authorize(payload.session_id, user, repo)
    return StreamingResponse(_events(payload.session_id, payload.message, payload.media_ids), media_type="text/event-stream")
