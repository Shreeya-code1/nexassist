from datetime import datetime
from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict


UUIDStr = str

T = TypeVar("T")


class TimestampMixin(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    created_at: datetime
    updated_at: datetime


class PaginatedResponse(BaseModel, Generic[T]):
    model_config = ConfigDict(from_attributes=True)

    items: list[T]
    total: int
    limit: int
    offset: int


class ErrorResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    detail: str
