from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.common import UUIDStr


class CompanyListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUIDStr
    name: str
    slug: str
    logo_url: str | None = None
    role: str


class CompanyListResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    companies: list[CompanyListItem]


class CompanyCreateRequest(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str
    slug: str
    website_url: str | None = None


class CompanyCreateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUIDStr
    name: str
    slug: str
    website_url: str | None = None


class CompanyDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUIDStr
    name: str
    slug: str
    logo_url: str | None = None
    website_url: str | None = None
    owner_id: UUIDStr
    created_at: datetime
    updated_at: datetime


class CompanyUpdateRequest(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str | None = None
    logo_url: str | None = None
    website_url: str | None = None


class CompanyUpdateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUIDStr
    name: str
    slug: str
    logo_url: str | None = None
    website_url: str | None = None
    updated_at: datetime


class CompanyMemberResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUIDStr
    user_id: UUIDStr
    full_name: str
    email: str
    role: str
    created_at: datetime


class CompanyMembersResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    members: list[CompanyMemberResponse]


class CompanyMemberCreateRequest(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    email: str
    role: str


class CompanyMemberCreateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUIDStr
    company_id: UUIDStr
    user_id: UUIDStr
    role: str
