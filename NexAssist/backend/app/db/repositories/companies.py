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


class CompaniesRepository:
    def __init__(self, client: Client) -> None:
        self.client = client

    def create_company(self, payload: dict[str, Any]) -> dict[str, Any]:
        try:
            result = self.client.table("companies").insert(payload).execute()
            return _require_data(result.data, "Company not found")[0]
        except (ConflictError, ForbiddenError, NotFoundError):
            raise
        except Exception as exc:
            _raise_domain_error(exc, "Create company")

    def get_company(self, company_id: str) -> dict[str, Any]:
        try:
            result = self.client.table("companies").select("*").eq("id", company_id).limit(1).execute()
            return _require_data(result.data, "Company not found")[0]
        except (ConflictError, ForbiddenError, NotFoundError):
            raise
        except Exception as exc:
            _raise_domain_error(exc, "Get company")

    def list_companies(self, user_id: str) -> list[dict[str, Any]]:
        try:
            result = (
                self.client.table("company_memberships")
                .select("id, role, companies(id, name, slug, logo_url)")
                .eq("user_id", user_id)
                .execute()
            )
            return _require_data(result.data, "Companies not found")
        except (ConflictError, ForbiddenError, NotFoundError):
            raise
        except Exception as exc:
            _raise_domain_error(exc, "List companies")

    def update_company(self, company_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        try:
            result = self.client.table("companies").update(payload).eq("id", company_id).execute()
            return _require_data(result.data, "Company not found")[0]
        except (ConflictError, ForbiddenError, NotFoundError):
            raise
        except Exception as exc:
            _raise_domain_error(exc, "Update company")

    def list_members(self, company_id: str) -> list[dict[str, Any]]:
        try:
            result = (
                self.client.table("company_memberships")
                .select("id, user_id, role, created_at, profiles(full_name)")
                .eq("company_id", company_id)
                .execute()
            )
            return _require_data(result.data, "Company members not found")
        except (ConflictError, ForbiddenError, NotFoundError):
            raise
        except Exception as exc:
            _raise_domain_error(exc, "List company members")

    def add_member(self, payload: dict[str, Any]) -> dict[str, Any]:
        try:
            result = self.client.table("company_memberships").insert(payload).execute()
            return _require_data(result.data, "Company member not found")[0]
        except (ConflictError, ForbiddenError, NotFoundError):
            raise
        except Exception as exc:
            _raise_domain_error(exc, "Add company member")
