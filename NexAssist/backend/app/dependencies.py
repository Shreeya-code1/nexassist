from typing import Any

from fastapi import Depends, Header

from app.core.auth import verify_token
from app.core.errors import ForbiddenError
from app.db.repositories.companies import CompaniesRepository as CompanyRepository
from app.db.repositories.feedback import FeedbackRepository
from app.db.repositories.manuals import ManualsRepository as ManualRepository
from app.db.repositories.products import ProductsRepository as ProductRepository
from app.db.repositories.sessions import SessionsRepository as SessionRepository
from app.db.supabase import get_service_client


def get_token(authorization: str = Header(...)) -> str:
    if not authorization.startswith("Bearer "):
        raise ForbiddenError("Bearer token required")
    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise ForbiddenError("Bearer token required")
    return token


def get_current_user(token: str = Depends(get_token)) -> dict[str, Any]:
    return verify_token(token)


def get_company_repo() -> CompanyRepository:
    return CompanyRepository(get_service_client())


def get_product_repo() -> ProductRepository:
    return ProductRepository(get_service_client())


def get_manual_repo() -> ManualRepository:
    return ManualRepository(get_service_client())


def get_session_repo() -> SessionRepository:
    return SessionRepository(get_service_client())


def get_feedback_repo() -> FeedbackRepository:
    return FeedbackRepository(get_service_client())
