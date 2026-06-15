from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.common import UUIDStr


class ProductListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUIDStr
    name: str
    slug: str
    category: str | None = None
    description: str | None = None
    image_url: str | None = None
    status: str
    model_count: int
    manual_count: int


class ProductListResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    products: list[ProductListItem]


class ProductCreateRequest(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str
    slug: str
    category: str | None = None
    description: str | None = None
    image_url: str | None = None


class ProductCreateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUIDStr
    company_id: UUIDStr
    name: str
    slug: str
    status: str


class ProductModelResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUIDStr
    product_id: UUIDStr
    model_number: str
    display_name: str | None = None
    release_year: int | None = None


class ProductManualSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUIDStr
    title: str
    version: str | None = None
    language: str
    status: str
    page_count: int | None = None
    chunk_count: int
    created_at: datetime


class ProductDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUIDStr
    company_id: UUIDStr
    name: str
    slug: str
    category: str | None = None
    description: str | None = None
    image_url: str | None = None
    status: str
    models: list[ProductModelResponse]
    manuals: list[ProductManualSummary]


class ProductUpdateRequest(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str | None = None
    category: str | None = None
    description: str | None = None
    image_url: str | None = None
    status: str | None = None


class ProductUpdateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUIDStr
    updated_at: datetime


class ProductModelCreateRequest(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    model_number: str
    display_name: str | None = None
    release_year: int | None = None


class ProductModelCreateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUIDStr
    product_id: UUIDStr
    model_number: str
    display_name: str | None = None
    release_year: int | None = None


class ProductManualsResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    manuals: list[ProductManualSummary]
