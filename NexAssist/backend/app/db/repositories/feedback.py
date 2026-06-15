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


class FeedbackRepository:
    def __init__(self, client: Client) -> None:
        self.client = client

    def create_feedback(self, payload: dict[str, Any]) -> dict[str, Any]:
        try:
            result = self.client.table("feedback").insert(payload).execute()
            return _require_data(result.data, "Feedback not found")[0]
        except (ConflictError, ForbiddenError, NotFoundError):
            raise
        except Exception as exc:
            _raise_domain_error(exc, "Create feedback")

    def get_feedback(self, feedback_id: str) -> dict[str, Any]:
        try:
            result = self.client.table("feedback").select("*").eq("id", feedback_id).limit(1).execute()
            return _require_data(result.data, "Feedback not found")[0]
        except (ConflictError, ForbiddenError, NotFoundError):
            raise
        except Exception as exc:
            _raise_domain_error(exc, "Get feedback")

    def list_by_session(self, session_id: str) -> list[dict[str, Any]]:
        try:
            result = self.client.table("feedback").select("*").eq("session_id", session_id).execute()
            return _require_data(result.data, "Feedback not found")
        except (ConflictError, ForbiddenError, NotFoundError):
            raise
        except Exception as exc:
            _raise_domain_error(exc, "List feedback")
