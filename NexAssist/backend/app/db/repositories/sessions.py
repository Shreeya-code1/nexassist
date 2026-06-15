from typing import Any

from supabase import Client

from app.core.errors import ConflictError, ForbiddenError, NotFoundError


def _is_unique_violation(exc: Exception) -> bool:
    text = str(exc).lower()
    code = getattr(exc, "code", None)
    return code == "23505" or "23505" in text or "duplicate key" in text


def _raise_domain_error(exc: Exception, action: str) -> None:
    if _is_unique_violation(exc):
        raise ConflictError(f"{action} conflicts with an existing record") from exc
    text = str(exc).lower()
    if "permission" in text or "rls" in text or "forbidden" in text:
        raise ForbiddenError(f"{action} is forbidden") from exc
    raise ConflictError(f"{action} failed") from exc


def _require_data(data: Any, detail: str) -> Any:
    if data is None or data == []:
        raise NotFoundError(detail)
    return data


class SessionsRepository:
    def __init__(self, client: Client) -> None:
        self.client = client

    def create_session(self, payload: dict[str, Any]) -> dict[str, Any]:
        try:
            result = self.client.table("support_sessions").insert(payload).execute()
            return _require_data(result.data, "Support session not found")[0]
        except (ConflictError, ForbiddenError, NotFoundError):
            raise
        except Exception as exc:
            _raise_domain_error(exc, "Create support session")

    def get_session(self, session_id: str) -> dict[str, Any]:
        try:
            result = self.client.table("support_sessions").select("*").eq("id", session_id).limit(1).execute()
            return _require_data(result.data, "Support session not found")[0]
        except (ConflictError, ForbiddenError, NotFoundError):
            raise
        except Exception as exc:
            _raise_domain_error(exc, "Get support session")

    def list_sessions(
        self,
        company_id: str,
        status: str | None = None,
        product_id: str | None = None,
        limit: int = 20,
        offset: int = 0,
    ) -> dict[str, Any]:
        try:
            query = (
                self.client.table("support_sessions")
                .select("*, products(name)", count="exact")
                .eq("company_id", company_id)
                .range(offset, offset + limit - 1)
            )
            if status is not None:
                query = query.eq("status", status)
            if product_id is not None:
                query = query.eq("product_id", product_id)
            result = query.execute()
            sessions = _require_data(result.data, "Support sessions not found")
            return {"sessions": sessions, "total": result.count or len(sessions)}
        except (ConflictError, ForbiddenError, NotFoundError):
            raise
        except Exception as exc:
            _raise_domain_error(exc, "List support sessions")

    def update_session_status(
        self,
        session_id: str,
        status: str,
        payload: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        update_payload = dict(payload or {})
        update_payload["status"] = status
        try:
            result = self.client.table("support_sessions").update(update_payload).eq("id", session_id).execute()
            return _require_data(result.data, "Support session not found")[0]
        except (ConflictError, ForbiddenError, NotFoundError):
            raise
        except Exception as exc:
            _raise_domain_error(exc, "Update support session status")

    def add_message(self, payload: dict[str, Any]) -> dict[str, Any]:
        try:
            result = self.client.table("session_messages").insert(payload).execute()
            return _require_data(result.data, "Session message not found")[0]
        except (ConflictError, ForbiddenError, NotFoundError):
            raise
        except Exception as exc:
            _raise_domain_error(exc, "Add session message")

    def get_messages(self, session_id: str) -> list[dict[str, Any]]:
        try:
            result = (
                self.client.table("session_messages")
                .select("*")
                .eq("session_id", session_id)
                .order("created_at")
                .execute()
            )
            return _require_data(result.data, "Session messages not found")
        except (ConflictError, ForbiddenError, NotFoundError):
            raise
        except Exception as exc:
            _raise_domain_error(exc, "Get session messages")

    def upsert_diagnostic_state(self, payload: dict[str, Any]) -> dict[str, Any]:
        try:
            result = self.client.table("diagnostic_states").upsert(payload, on_conflict="session_id").execute()
            return _require_data(result.data, "Diagnostic state not found")[0]
        except (ConflictError, ForbiddenError, NotFoundError):
            raise
        except Exception as exc:
            _raise_domain_error(exc, "Upsert diagnostic state")

    def get_diagnostic_state(self, session_id: str) -> dict[str, Any]:
        try:
            result = self.client.table("diagnostic_states").select("*").eq("session_id", session_id).limit(1).execute()
            return _require_data(result.data, "Diagnostic state not found")[0]
        except (ConflictError, ForbiddenError, NotFoundError):
            raise
        except Exception as exc:
            _raise_domain_error(exc, "Get diagnostic state")
