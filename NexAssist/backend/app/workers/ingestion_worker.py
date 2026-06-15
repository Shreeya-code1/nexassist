from app.core.errors import IngestionError
from app.db.repositories.manuals import ManualsRepository
from app.db.supabase import get_service_client
from app.services.ingestion import IngestResult, run_ingestion
from app.utils.time import utcnow


def _repository() -> ManualsRepository:
    return ManualsRepository(get_service_client())


def process_job(job_id: str) -> None:
    repository = _repository()
    job = repository.get_ingestion_job(job_id)
    if job["status"] != "queued":
        raise IngestionError("Ingestion job is not queued")

    repository.update_ingestion_job(
        job_id,
        {
            "status": "processing",
            "started_at": utcnow().isoformat(),
            "current_step": "downloading",
        },
    )

    result: IngestResult = run_ingestion(str(job["manual_id"]), False)

    if result.success:
        repository.update_ingestion_job(
            job_id,
            {
                "status": "completed",
                "completed_at": utcnow().isoformat(),
                "chunks_created": result.chunks_created,
                "current_step": "indexing",
            },
        )
        return

    repository.update_ingestion_job(
        job_id,
        {
            "status": "failed",
            "error_message": result.error,
            "completed_at": utcnow().isoformat(),
        },
    )
