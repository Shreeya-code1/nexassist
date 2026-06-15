from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.schemas.common import UUIDStr


class ManualUploadResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    manual_id: UUIDStr
    ingestion_job_id: UUIDStr
    status: str


class ManualCreate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    company_id: UUIDStr
    product_id: UUIDStr
    product_model_id: UUIDStr | None = None
    title: str
    version: str | None = None
    language: str
    file_name: str
    file_type: str
    file_size_bytes: int
    storage_bucket: str
    storage_path: str
    checksum_sha256: str
    uploaded_by: UUIDStr


class ManualDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUIDStr
    company_id: UUIDStr
    product_id: UUIDStr
    product_model_id: UUIDStr | None = None
    title: str
    version: str | None = None
    language: str
    file_name: str
    file_type: str
    file_size_bytes: int
    status: str
    page_count: int | None = None
    chunk_count: int
    created_at: datetime
    updated_at: datetime


class ManualDeleteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    deleted: bool
    manual_id: UUIDStr


class IngestionRunRequest(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    force_reindex: bool


class IngestionRunResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    ingestion_job_id: UUIDStr
    manual_id: UUIDStr
    status: str


class IngestionJobResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUIDStr
    manual_id: UUIDStr
    status: str
    current_step: str | None = None
    chunks_created: int
    error_message: str | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
