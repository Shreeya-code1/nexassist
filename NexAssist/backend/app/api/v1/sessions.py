from typing import Any

from fastapi import APIRouter, Depends, Query, status

from app.core.auth import extract_user_id
from app.core.errors import NotFoundError
from app.core.security import require_company_member
from app.db.repositories.sessions import SessionsRepository
from app.db.supabase import get_service_client
from app.dependencies import get_current_user, get_session_repo
from app.schemas.sessions import SessionCreateRequest, SessionCreateResponse, SessionDetailResponse, SessionEscalateRequest, SessionEscalateResponse, SessionListResponse, SessionResolveRequest, SessionResolveResponse
from app.services.diagnostic_state import load_state
from app.utils.time import utcnow


router = APIRouter()


def _session_list(result: dict[str, Any]) -> dict[str, Any]:
    return {"sessions": [{**row, "product_name": (row.get("products") or {}).get("name")} for row in result["sessions"]], "total": result["total"]}


def _escalate(repo: SessionsRepository, session_id: str, payload: SessionEscalateRequest) -> dict[str, Any]:
    session = repo.get_session(session_id)
    result = get_service_client().table("escalations").insert({"session_id": session_id, "company_id": session["company_id"], "reason": payload.reason, "priority": payload.priority, "status": "open"}).execute()
    repo.update_session_status(session_id, "escalated")
    return {"escalation_id": result.data[0]["id"], "session_id": session_id, "status": "open"}


def _messages(repo: SessionsRepository, session_id: str) -> list[dict[str, Any]]:
    try:
        return repo.get_messages(session_id)
    except NotFoundError:
        return []


@router.post("/", response_model=SessionCreateResponse, status_code=status.HTTP_201_CREATED)
def create_session(payload: SessionCreateRequest, user: dict[str, Any] = Depends(get_current_user), repo: SessionsRepository = Depends(get_session_repo)) -> dict[str, Any]:
    from app.services.agent_engine import run_agent

    require_company_member(extract_user_id(user), payload.company_id, "viewer")
    data = payload.model_dump(exclude={"initial_message"}, exclude_none=True)
    session = repo.create_session({**data, "user_id": extract_user_id(user)})
    if payload.initial_message:
        run_agent(str(session["id"]), payload.initial_message, [])
    return {"session_id": session["id"], "status": session["status"], "current_phase": session["current_phase"]}


@router.get("/", response_model=SessionListResponse)
def list_sessions(company_id: str = Query(...), status_value: str | None = Query(None, alias="status"), product_id: str | None = None, limit: int = 20, offset: int = 0, user: dict[str, Any] = Depends(get_current_user), repo: SessionsRepository = Depends(get_session_repo)) -> dict[str, Any]:
    require_company_member(extract_user_id(user), company_id, "viewer")
    return _session_list(repo.list_sessions(company_id, status_value, product_id, limit, offset))


@router.get("/{session_id}", response_model=SessionDetailResponse)
def get_session(session_id: str, user: dict[str, Any] = Depends(get_current_user), repo: SessionsRepository = Depends(get_session_repo)) -> dict[str, Any]:
    session = repo.get_session(session_id)
    require_company_member(extract_user_id(user), str(session["company_id"]), "viewer")
    return {**session, "messages": _messages(repo, session_id), "diagnostic_state": load_state(session_id) or {}}


@router.post("/{session_id}/resolve", response_model=SessionResolveResponse)
def resolve_session(session_id: str, payload: SessionResolveRequest, user: dict[str, Any] = Depends(get_current_user), repo: SessionsRepository = Depends(get_session_repo)) -> dict[str, Any]:
    session = repo.get_session(session_id)
    require_company_member(extract_user_id(user), str(session["company_id"]), "support_agent")
    repo.add_message({"session_id": session_id, "role": "system", "content": payload.resolution_summary, "content_type": "state_update", "metadata": {"final_cause": payload.final_cause}})
    updated = repo.update_session_status(session_id, "resolved", {"resolved_at": utcnow().isoformat()})
    return {"session_id": session_id, "status": updated["status"], "resolved_at": updated["resolved_at"]}


@router.post("/{session_id}/escalate", response_model=SessionEscalateResponse, status_code=status.HTTP_201_CREATED)
def escalate_session(session_id: str, payload: SessionEscalateRequest, user: dict[str, Any] = Depends(get_current_user), repo: SessionsRepository = Depends(get_session_repo)) -> dict[str, Any]:
    session = repo.get_session(session_id)
    require_company_member(extract_user_id(user), str(session["company_id"]), "viewer")
    return _escalate(repo, session_id, payload)
