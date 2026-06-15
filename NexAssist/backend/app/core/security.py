from app.core.errors import ForbiddenError
from app.db.supabase import get_service_client


ROLE_RANKS: dict[str, int] = {
    "viewer": 0,
    "support_agent": 1,
    "admin": 2,
    "owner": 3,
}


def require_company_member(user_id: str, company_id: str, min_role: str) -> None:
    result = (
        get_service_client()
        .table("company_memberships")
        .select("role")
        .eq("user_id", user_id)
        .eq("company_id", company_id)
        .limit(1)
        .execute()
    )
    if not result.data:
        raise ForbiddenError("Company membership required")
    role = str(result.data[0]["role"])
    if ROLE_RANKS.get(role, -1) < ROLE_RANKS[min_role]:
        raise ForbiddenError("Insufficient company role")
