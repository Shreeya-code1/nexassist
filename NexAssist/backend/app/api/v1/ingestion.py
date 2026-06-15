from typing import Any

from fastapi import APIRouter, BackgroundTasks, Depends, status

from app.core.auth import extract_user_id
from app.core.security import require_company_member
from app.db.repositories.manuals import ManualsRepository
from app.dependencies import get_current_user, get_manual_repo
from app.schemas.manuals import IngestionJobResponse, IngestionRunRequest, IngestionRunResponse


router = APIRouter()


@router.post("/{manual_id}/run", response_model=IngestionRunResponse, status_code=status.HTTP_202_ACCEPTED)
def run_ingestion(manual_id: str, payload: IngestionRunRequest, background_tasks: BackgroundTasks, user: dict[str, Any] = Depends(get_current_user), repo: ManualsRepository = Depends(get_manual_repo)) -> dict[str, Any]:
    from app.workers.ingestion_worker import process_job

    manual = repo.get_manual(manual_id)
    require_company_member(extract_user_id(user), str(manual["company_id"]), "admin")
    job = repo.create_ingestion_job({"manual_id": manual_id, "company_id": manual["company_id"], "status": "queued", "current_step": "queued"})
    background_tasks.add_task(process_job, job["id"])
    return {"ingestion_job_id": job["id"], "manual_id": manual_id, "status": job["status"]}


@router.get("/jobs/{job_id}", response_model=IngestionJobResponse)
def get_ingestion_job(job_id: str, user: dict[str, Any] = Depends(get_current_user), repo: ManualsRepository = Depends(get_manual_repo)) -> dict[str, Any]:
    job = repo.get_ingestion_job(job_id)
    require_company_member(extract_user_id(user), str(job["company_id"]), "viewer")
    return job
