import hashlib
from typing import Any

from fastapi import APIRouter, Depends, File, Form, UploadFile, status

from app.core.auth import extract_user_id
from app.core.security import require_company_member
from app.db.repositories.manuals import ManualsRepository
from app.dependencies import get_current_user, get_manual_repo
from app.schemas.manuals import ManualDeleteResponse, ManualDetailResponse, ManualUploadResponse
from app.schemas.products import ProductManualsResponse
from app.utils.ids import generate_uuid
from app.utils.storage import upload_file


router = APIRouter()


def _filename(file: UploadFile) -> str:
    return file.filename or "manual.pdf"


def _path(company_id: str, product_id: str, filename: str) -> str:
    return f"{company_id}/{product_id}/{generate_uuid()}_{filename}"


@router.post("/upload", response_model=ManualUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_manual(company_id: str = Form(...), product_id: str = Form(...), product_model_id: str | None = Form(None), title: str = Form(...), version: str | None = Form(None), language: str = Form("en"), file: UploadFile = File(...), user: dict[str, Any] = Depends(get_current_user), repo: ManualsRepository = Depends(get_manual_repo)) -> dict[str, Any]:
    require_company_member(extract_user_id(user), company_id, "admin")
    data = await file.read()
    path = _path(company_id, product_id, _filename(file))
    upload_file("manuals", path, data, file.content_type or "application/pdf")
    manual = repo.create_manual({"company_id": company_id, "product_id": product_id, "product_model_id": product_model_id, "title": title, "version": version, "language": language, "file_name": _filename(file), "file_type": file.content_type or "application/pdf", "file_size_bytes": len(data), "storage_bucket": "manuals", "storage_path": path, "checksum_sha256": hashlib.sha256(data).hexdigest(), "uploaded_by": extract_user_id(user)})
    job = repo.create_ingestion_job({"manual_id": manual["id"], "company_id": company_id, "status": "queued"})
    return {"manual_id": manual["id"], "ingestion_job_id": job["id"], "status": manual["status"]}


@router.get("/products/{product_id}/manuals", response_model=ProductManualsResponse)
def list_manuals(product_id: str, user: dict[str, Any] = Depends(get_current_user), repo: ManualsRepository = Depends(get_manual_repo)) -> dict[str, Any]:
    manuals = repo.list_by_product(product_id)
    require_company_member(extract_user_id(user), str(manuals[0]["company_id"]), "viewer")
    return {"manuals": manuals}


@router.get("/{manual_id}", response_model=ManualDetailResponse)
def get_manual(manual_id: str, user: dict[str, Any] = Depends(get_current_user), repo: ManualsRepository = Depends(get_manual_repo)) -> dict[str, Any]:
    manual = repo.get_manual(manual_id)
    require_company_member(extract_user_id(user), str(manual["company_id"]), "viewer")
    return manual


@router.delete("/{manual_id}", response_model=ManualDeleteResponse)
def delete_manual(manual_id: str, user: dict[str, Any] = Depends(get_current_user), repo: ManualsRepository = Depends(get_manual_repo)) -> dict[str, Any]:
    manual = repo.get_manual(manual_id)
    require_company_member(extract_user_id(user), str(manual["company_id"]), "admin")
    repo.update_status(manual_id, "archived")
    return {"deleted": True, "manual_id": manual_id}
