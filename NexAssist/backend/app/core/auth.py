from typing import Any

from app.core.errors import ForbiddenError
from app.db.supabase import get_service_client


def _user_dict(user: Any) -> dict[str, Any]:
    if hasattr(user, "model_dump"):
        data = user.model_dump()
        return data.get("user", data)
    if isinstance(user, dict):
        return user.get("user", user)
    data = {
        "id": getattr(user, "id", None),
        "email": getattr(user, "email", None),
    }
    if data["id"] is None:
        raise ForbiddenError("Invalid token")
    return data


def verify_token(token: str) -> dict[str, Any]:
    try:
        response = get_service_client().auth.get_user(token)
        user = getattr(response, "user", response)
        return _user_dict(user)
    except ForbiddenError:
        raise
    except Exception as exc:
        raise ForbiddenError("Invalid or expired token") from exc


def extract_user_id(user: dict[str, Any]) -> str:
    return str(user["id"])
