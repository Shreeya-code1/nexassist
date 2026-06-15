from typing import Any

from fastapi import APIRouter, Depends, status

from app.core.auth import extract_user_id
from app.core.security import require_company_member
from app.db.repositories.companies import CompaniesRepository
from app.db.supabase import get_service_client
from app.dependencies import get_company_repo, get_current_user
from app.schemas.companies import CompanyCreateRequest, CompanyCreateResponse, CompanyDetailResponse, CompanyListResponse, CompanyMemberCreateRequest, CompanyMemberCreateResponse, CompanyMembersResponse, CompanyUpdateRequest, CompanyUpdateResponse


router = APIRouter()


def _company_list(rows: list[dict[str, Any]]) -> dict[str, Any]:
    return {"companies": [{**row["companies"], "role": row["role"]} for row in rows]}


def _members(rows: list[dict[str, Any]]) -> dict[str, Any]:
    return {"members": [{**row, "full_name": (row.get("profiles") or {}).get("full_name") or "", "email": row.get("email") or ""} for row in rows]}


def _invite_user(email: str) -> str:
    response = get_service_client().auth.admin.invite_user_by_email(email)
    user = getattr(response, "user", response)
    data = user.model_dump() if hasattr(user, "model_dump") else user
    return str(data["id"])


@router.get("/", response_model=CompanyListResponse)
def list_companies(user: dict[str, Any] = Depends(get_current_user), repo: CompaniesRepository = Depends(get_company_repo)) -> dict[str, Any]:
    return _company_list(repo.list_companies(extract_user_id(user)))


@router.post("/", response_model=CompanyCreateResponse, status_code=status.HTTP_201_CREATED)
def create_company(payload: CompanyCreateRequest, user: dict[str, Any] = Depends(get_current_user), repo: CompaniesRepository = Depends(get_company_repo)) -> dict[str, Any]:
    owner_id = extract_user_id(user)
    company = repo.create_company({**payload.model_dump(), "owner_id": owner_id})
    repo.add_member({"company_id": company["id"], "user_id": owner_id, "role": "owner"})
    return company


@router.get("/{company_id}", response_model=CompanyDetailResponse)
def get_company(company_id: str, user: dict[str, Any] = Depends(get_current_user), repo: CompaniesRepository = Depends(get_company_repo)) -> dict[str, Any]:
    require_company_member(extract_user_id(user), company_id, "viewer")
    return repo.get_company(company_id)


@router.patch("/{company_id}", response_model=CompanyUpdateResponse)
def update_company(company_id: str, payload: CompanyUpdateRequest, user: dict[str, Any] = Depends(get_current_user), repo: CompaniesRepository = Depends(get_company_repo)) -> dict[str, Any]:
    require_company_member(extract_user_id(user), company_id, "admin")
    return repo.update_company(company_id, payload.model_dump(exclude_none=True))


@router.get("/{company_id}/members", response_model=CompanyMembersResponse)
def list_members(company_id: str, user: dict[str, Any] = Depends(get_current_user), repo: CompaniesRepository = Depends(get_company_repo)) -> dict[str, Any]:
    require_company_member(extract_user_id(user), company_id, "viewer")
    return _members(repo.list_members(company_id))


@router.post("/{company_id}/members", response_model=CompanyMemberCreateResponse, status_code=status.HTTP_201_CREATED)
def add_member(company_id: str, payload: CompanyMemberCreateRequest, user: dict[str, Any] = Depends(get_current_user), repo: CompaniesRepository = Depends(get_company_repo)) -> dict[str, Any]:
    require_company_member(extract_user_id(user), company_id, "admin")
    return repo.add_member({"company_id": company_id, "user_id": _invite_user(payload.email), "role": payload.role})
