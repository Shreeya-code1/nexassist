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


class ProductsRepository:
    def __init__(self, client: Client) -> None:
        self.client = client

    def create_product(self, payload: dict[str, Any]) -> dict[str, Any]:
        try:
            result = self.client.table("products").insert(payload).execute()
            return _require_data(result.data, "Product not found")[0]
        except (ConflictError, ForbiddenError, NotFoundError):
            raise
        except Exception as exc:
            _raise_domain_error(exc, "Create product")

    def get_product(self, product_id: str) -> dict[str, Any]:
        try:
            result = (
                self.client.table("products")
                .select("*, product_models(*), manuals(*)")
                .eq("id", product_id)
                .limit(1)
                .execute()
            )
            return _require_data(result.data, "Product not found")[0]
        except (ConflictError, ForbiddenError, NotFoundError):
            raise
        except Exception as exc:
            _raise_domain_error(exc, "Get product")

    def list_by_company(self, company_id: str) -> list[dict[str, Any]]:
        try:
            result = self.client.table("products").select("*").eq("company_id", company_id).execute()
            return _require_data(result.data, "Products not found")
        except (ConflictError, ForbiddenError, NotFoundError):
            raise
        except Exception as exc:
            _raise_domain_error(exc, "List products")

    def update_product(self, product_id: str, payload: dict[str, Any]) -> dict[str, Any]:
        try:
            result = self.client.table("products").update(payload).eq("id", product_id).execute()
            return _require_data(result.data, "Product not found")[0]
        except (ConflictError, ForbiddenError, NotFoundError):
            raise
        except Exception as exc:
            _raise_domain_error(exc, "Update product")

    def create_model(self, payload: dict[str, Any]) -> dict[str, Any]:
        try:
            result = self.client.table("product_models").insert(payload).execute()
            return _require_data(result.data, "Product model not found")[0]
        except (ConflictError, ForbiddenError, NotFoundError):
            raise
        except Exception as exc:
            _raise_domain_error(exc, "Create product model")

    def list_models(self, product_id: str) -> list[dict[str, Any]]:
        try:
            result = self.client.table("product_models").select("*").eq("product_id", product_id).execute()
            return _require_data(result.data, "Product models not found")
        except (ConflictError, ForbiddenError, NotFoundError):
            raise
        except Exception as exc:
            _raise_domain_error(exc, "List product models")
