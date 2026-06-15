from typing import Any

from fastapi import APIRouter, Depends, status

from app.core.auth import extract_user_id
from app.core.security import require_company_member
from app.db.repositories.products import ProductsRepository
from app.dependencies import get_current_user, get_product_repo
from app.schemas.products import ProductCreateRequest, ProductCreateResponse, ProductDetailResponse, ProductListResponse, ProductModelCreateRequest, ProductModelCreateResponse, ProductUpdateRequest, ProductUpdateResponse


router = APIRouter()


def _product_list(rows: list[dict[str, Any]]) -> dict[str, Any]:
    return {"products": [{**row, "model_count": len(row.get("product_models") or []), "manual_count": len(row.get("manuals") or [])} for row in rows]}


def _product_detail(row: dict[str, Any]) -> dict[str, Any]:
    return {**row, "models": row.get("product_models") or [], "manuals": row.get("manuals") or []}


def _company_id(product_id: str, repo: ProductsRepository) -> str:
    return str(repo.get_product(product_id)["company_id"])


@router.get("/companies/{company_id}/products", response_model=ProductListResponse)
def list_products(company_id: str, user: dict[str, Any] = Depends(get_current_user), repo: ProductsRepository = Depends(get_product_repo)) -> dict[str, Any]:
    require_company_member(extract_user_id(user), company_id, "viewer")
    return _product_list(repo.list_by_company(company_id))


@router.post("/companies/{company_id}/products", response_model=ProductCreateResponse, status_code=status.HTTP_201_CREATED)
def create_product(company_id: str, payload: ProductCreateRequest, user: dict[str, Any] = Depends(get_current_user), repo: ProductsRepository = Depends(get_product_repo)) -> dict[str, Any]:
    require_company_member(extract_user_id(user), company_id, "admin")
    return repo.create_product({**payload.model_dump(), "company_id": company_id})


@router.get("/{product_id}", response_model=ProductDetailResponse)
def get_product(product_id: str, user: dict[str, Any] = Depends(get_current_user), repo: ProductsRepository = Depends(get_product_repo)) -> dict[str, Any]:
    product = repo.get_product(product_id)
    require_company_member(extract_user_id(user), str(product["company_id"]), "viewer")
    return _product_detail(product)


@router.patch("/{product_id}", response_model=ProductUpdateResponse)
def update_product(product_id: str, payload: ProductUpdateRequest, user: dict[str, Any] = Depends(get_current_user), repo: ProductsRepository = Depends(get_product_repo)) -> dict[str, Any]:
    require_company_member(extract_user_id(user), _company_id(product_id, repo), "admin")
    return repo.update_product(product_id, payload.model_dump(exclude_none=True))


@router.post("/{product_id}/models", response_model=ProductModelCreateResponse, status_code=status.HTTP_201_CREATED)
def create_model(product_id: str, payload: ProductModelCreateRequest, user: dict[str, Any] = Depends(get_current_user), repo: ProductsRepository = Depends(get_product_repo)) -> dict[str, Any]:
    require_company_member(extract_user_id(user), _company_id(product_id, repo), "admin")
    return repo.create_model({**payload.model_dump(), "product_id": product_id})
