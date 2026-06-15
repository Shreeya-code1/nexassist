from dataclasses import dataclass
from typing import Any

from app.core.errors import IngestionError
from app.db.repositories.manuals import ManualsRepository
from app.db.supabase import get_service_client
from app.services.chunker import Chunk, chunk_document
from app.services.chroma import upsert_chunks
from app.services.document_parser import ParsedDocument, parse_pdf
from app.services.embeddings import embed_texts
from app.utils.storage import download_file


@dataclass
class IngestResult:
    manual_id: str
    chunks_created: int
    page_count: int
    success: bool
    error: str | None


def _manual_repository() -> ManualsRepository:
    return ManualsRepository(get_service_client())


def _active_job_id(repository: ManualsRepository, manual_id: str) -> str | None:
    try:
        result = (
            repository.client.table("ingestion_jobs")
            .select("id")
            .eq("manual_id", manual_id)
            .in_("status", ["queued", "processing"])
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if result.data:
            return str(result.data[0]["id"])
        return None
    except Exception as exc:
        raise IngestionError("Unable to find ingestion job") from exc


def _update_job_step(repository: ManualsRepository, job_id: str | None, current_step: str) -> None:
    if job_id is not None:
        repository.update_ingestion_job(job_id, {"current_step": current_step})


def _update_job_failure(repository: ManualsRepository, job_id: str | None, error_message: str) -> None:
    if job_id is not None:
        repository.update_ingestion_job(job_id, {"status": "failed", "error_message": error_message})


def _chunk_record(chunk: Chunk, embedding: list[float]) -> dict[str, Any]:
    metadata: dict[str, Any] = {
        "company_id": chunk.company_id,
        "product_id": chunk.product_id,
        "product_model_id": chunk.product_model_id,
        "manual_id": chunk.manual_id,
        "manual_title": chunk.manual_title,
        "manual_version": chunk.manual_version,
        "manual_language": chunk.manual_language,
        "file_name": chunk.file_name,
        "file_type": chunk.file_type,
        "chunk_id": chunk.chunk_id,
        "chunk_index": chunk.chunk_index,
        "chunk_type": chunk.chunk_type,
        "section_title": chunk.section_title,
        "heading_path": chunk.heading_path,
        "page_start": chunk.page_start,
        "page_end": chunk.page_end,
        "char_start": chunk.char_start,
        "char_end": chunk.char_end,
        "token_count": chunk.token_count,
        "contains_warning": chunk.contains_warning,
        "contains_error_code": chunk.contains_error_code,
        "error_codes": chunk.error_codes,
        "keywords": chunk.keywords,
        "created_at": chunk.created_at,
    }
    return {"id": chunk.id, "document": chunk.document, "embedding": embedding, "metadata": metadata}


def run_ingestion(manual_id: str, force_reindex: bool) -> IngestResult:
    repository = _manual_repository()
    job_id: str | None = None
    try:
        job_id = _active_job_id(repository, manual_id)
        manual = repository.get_manual(manual_id)
        _update_job_step(repository, job_id, "downloading")
        pdf_bytes = download_file(str(manual["storage_bucket"]), str(manual["storage_path"]))
        _update_job_step(repository, job_id, "parsing")
        parsed: ParsedDocument = parse_pdf(pdf_bytes, manual_id)
        _update_job_step(repository, job_id, "chunking")
        chunks = chunk_document(parsed, manual)
        _update_job_step(repository, job_id, "embedding")
        embeddings = embed_texts([chunk.document for chunk in chunks])
        _update_job_step(repository, job_id, "indexing")
        upsert_chunks([_chunk_record(chunk, embeddings[index]) for index, chunk in enumerate(chunks)])
        repository.update_chunk_count(manual_id, len(chunks))
        repository.update_status(manual_id, "ready")
        return IngestResult(
            manual_id=manual_id,
            chunks_created=len(chunks),
            page_count=parsed.page_count,
            success=True,
            error=None,
        )
    except Exception as exc:
        error_message = str(exc)
        try:
            repository.update_status(manual_id, "failed")
            _update_job_failure(repository, job_id, error_message)
        except Exception:
            pass
        return IngestResult(
            manual_id=manual_id,
            chunks_created=0,
            page_count=0,
            success=False,
            error=error_message,
        )
