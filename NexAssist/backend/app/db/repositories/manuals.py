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


class ManualsRepository:
    def __init__(self, client: Client) -> None:
        self.client = client

    def create_manual(self, payload: dict[str, Any]) -> dict[str, Any]:
        try:
            result = self.client.table("manuals").insert(payload).execute()
            return _require_data(result.data, "Manual not found")[0]
        except (ConflictError, ForbiddenError, NotFoundError):
            raise
        except Exception as exc:
            _raise_domain_error(exc, "Create manual")

    def get_manual(self, manual_id: str) -> dict[str, Any]:
        try:
            result = self.client.table("manuals").select("*").eq("id", manual_id).limit(1).execute()
            return _require_data(result.data, "Manual not found")[0]
        except (ConflictError, ForbiddenError, NotFoundError):
            raise
        except Exception as exc:
            _raise_domain_error(exc, "Get manual")

    def list_by_product(self, product_id: str) -> list[dict[str, Any]]:
        try:
            result = self.client.table("manuals").select("*").eq("product_id", product_id).execute()
            return _require_data(result.data, "Manuals not found")
        except (ConflictError, ForbiddenError, NotFoundError):
            raise
        except Exception as exc:
            _raise_domain_error(exc, "List manuals")

    def update_status(self, manual_id: str, status: str) -> dict[str, Any]:
        try:
            result = self.client.table("manuals").update({"status": status}).eq("id", manual_id).execute()
            return _require_data(result.data, "Manual not found")[0]
        except (ConflictError, ForbiddenError, NotFoundError):
            raise
        except Exception as exc:
            _raise_domain_error(exc, "Update manual status")

    def update_chunk_count(self, manual_id: str, chunk_count: int) -> dict[str, Any]:
        try:
            result = self.client.table("manuals").update({"chunk_count": chunk_count}).eq("id", manual_id).execute()
            return _require_data(result.data, "Manual not found")[0]
        except (ConflictError, ForbiddenError, NotFoundError):
            raise
        except Exception as exc:
            _raise_domain_error(exc, "Update manual chunk count")

    def delete_manual(self, manual_id: str) -> dict[str, Any]:
        try:
            result = self.client.table("manuals").delete().eq("id", manual_id).execute()
            deleted = _require_data(result.data, "Manual not found")[0]
            return {"deleted": True, "manual_id": deleted["id"]}
        except (ConflictError, ForbiddenError, NotFoundError):
            raise
        except Exception as exc:
            _raise_domain_error(exc, "Delete manual")

    def create_ingestion_job(self, payload: dict[str, Any]) -> dict[str, Any]:
        try:
            result = self.client.table("ingestion_jobs").insert(payload).execute()
            return _require_data(result.data, "Ingestion job not found")[0]
        except (ConflictError, ForbiddenError, NotFoundError):
            raise
        except Exception as exc:
            _raise_domain_error(exc, "Create ingestion job")

    def update_ingestion_job(self, job_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        try:
            result = self.client.table("ingestion_jobs").update(payload).eq("id", job_id).execute()
            return _require_data(result.data, "Ingestion job not found")[0]
        except (ConflictError, ForbiddenError, NotFoundError):
            raise
        except Exception as exc:
            _raise_domain_error(exc, "Update ingestion job")

    def get_ingestion_job(self, job_id: str) -> dict[str, Any]:
        try:
            result = self.client.table("ingestion_jobs").select("*").eq("id", job_id).limit(1).execute()
            return _require_data(result.data, "Ingestion job not found")[0]
        except (ConflictError, ForbiddenError, NotFoundError):
            raise
        except Exception as exc:
            _raise_domain_error(exc, "Get ingestion job")
