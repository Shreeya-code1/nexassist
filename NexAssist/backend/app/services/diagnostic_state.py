from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum
from typing import Any

from app.core.errors import AgentError, NotFoundError
from app.db.repositories.sessions import SessionsRepository
from app.db.supabase import get_service_client


class DiagnosticPhase(StrEnum):
    INTAKE = "intake"
    INVESTIGATION = "investigation"
    HYPOTHESIS = "hypothesis"
    DIAGNOSIS = "diagnosis"
    RESOLVED = "resolved"


@dataclass
class StateSnapshot:
    id: str
    session_id: str
    observed_symptoms: list[Any]
    known_context: dict[str, Any]
    hypotheses: list[Any]
    eliminated_causes: list[Any]
    performed_steps: list[Any]
    recommended_next_step: dict[str, Any] | None
    confidence: float
    state_version: int
    created_at: datetime
    updated_at: datetime


def phase_from_confidence(confidence: float, hypothesis_count: int) -> DiagnosticPhase:
    if confidence < 0.3:
        return DiagnosticPhase.INTAKE
    if confidence < 0.6:
        return DiagnosticPhase.INVESTIGATION
    if confidence < 0.8:
        return DiagnosticPhase.HYPOTHESIS
    return DiagnosticPhase.DIAGNOSIS


def _repository() -> SessionsRepository:
    return SessionsRepository(get_service_client())


def _datetime(value: Any) -> datetime:
    if isinstance(value, datetime):
        return value
    return datetime.fromisoformat(str(value).replace("Z", "+00:00"))


def _snapshot(record: dict[str, Any]) -> StateSnapshot:
    return StateSnapshot(
        id=str(record["id"]),
        session_id=str(record["session_id"]),
        observed_symptoms=list(record.get("observed_symptoms") or []),
        known_context=dict(record.get("known_context") or {}),
        hypotheses=list(record.get("hypotheses") or []),
        eliminated_causes=list(record.get("eliminated_causes") or []),
        performed_steps=list(record.get("performed_steps") or []),
        recommended_next_step=record.get("recommended_next_step"),
        confidence=float(record.get("confidence") or 0),
        state_version=int(record.get("state_version") or 1),
        created_at=_datetime(record["created_at"]),
        updated_at=_datetime(record["updated_at"]),
    )


def load_state(session_id: str) -> StateSnapshot | None:
    try:
        return _snapshot(_repository().get_diagnostic_state(session_id))
    except NotFoundError:
        return None
    except Exception as exc:
        raise AgentError("Unable to load diagnostic state") from exc


def _validated_payload(session_id: str, raw_tool_args: dict[str, Any], state_version: int) -> dict[str, Any]:
    required = [
        "observed_symptoms",
        "hypotheses",
        "eliminated_causes",
        "performed_steps",
        "recommended_next_step",
        "confidence",
    ]
    missing = [key for key in required if key not in raw_tool_args]
    if missing:
        raise AgentError(f"Diagnostic state update missing fields: {', '.join(missing)}")
    return {
        "session_id": session_id,
        "observed_symptoms": raw_tool_args["observed_symptoms"],
        "known_context": raw_tool_args.get("known_context") or {},
        "hypotheses": raw_tool_args["hypotheses"],
        "eliminated_causes": raw_tool_args["eliminated_causes"],
        "performed_steps": raw_tool_args["performed_steps"],
        "recommended_next_step": raw_tool_args["recommended_next_step"],
        "confidence": raw_tool_args["confidence"],
        "state_version": state_version,
    }


def apply_update(session_id: str, raw_tool_args: dict[str, Any]) -> StateSnapshot:
    try:
        current = load_state(session_id)
        next_version = 1 if current is None else current.state_version + 1
        record = _repository().upsert_diagnostic_state(_validated_payload(session_id, raw_tool_args, next_version))
        return _snapshot(record)
    except AgentError:
        raise
    except Exception as exc:
        raise AgentError("Unable to update diagnostic state") from exc
