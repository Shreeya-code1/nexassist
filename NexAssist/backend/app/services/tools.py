import base64
import time
from collections.abc import Callable
from dataclasses import asdict, dataclass
from typing import Any

from app.core.errors import AgentError, NotFoundError
from app.db.repositories.sessions import SessionsRepository
from app.db.supabase import get_service_client
from app.services.chroma import query_chunks
from app.services.diagnostic_state import apply_update
from app.services.embeddings import embed_query
from app.services.vision import analyze_image
from app.services.voice import transcribe
from app.utils.storage import download_file


@dataclass
class ToolResult:
    tool_name: str
    success: bool
    output: dict[str, Any] | list[dict[str, Any]] | str | None
    error: str | None
    latency_ms: int


ToolHandler = Callable[[dict[str, Any], str], ToolResult]


def _elapsed_ms(start: float) -> int:
    return int((time.perf_counter() - start) * 1000)


def _success(tool_name: str, output: dict[str, Any] | list[dict[str, Any]] | str, start: float) -> ToolResult:
    return ToolResult(tool_name=tool_name, success=True, output=output, error=None, latency_ms=_elapsed_ms(start))


def _failure(tool_name: str, exc: Exception, start: float) -> ToolResult:
    return ToolResult(tool_name=tool_name, success=False, output=None, error=str(exc), latency_ms=_elapsed_ms(start))


def _media_record(media_id: str) -> dict[str, Any]:
    result = get_service_client().table("session_media").select("*").eq("id", media_id).limit(1).execute()
    if not result.data:
        raise NotFoundError("Session media not found")
    return result.data[0]


def _escalation(args: dict[str, Any], session_id: str) -> dict[str, Any]:
    client = get_service_client()
    session_repository = SessionsRepository(client)
    session = session_repository.get_session(session_id)
    result = (
        client.table("escalations")
        .insert(
            {
                "session_id": session_id,
                "company_id": session["company_id"],
                "reason": args["reason"],
                "priority": args["priority"],
                "status": "open",
            }
        )
        .execute()
    )
    if not result.data:
        raise AgentError("Escalation was not created")
    session_repository.update_session_status(session_id, "escalated")
    return {"escalation_id": result.data[0]["id"], "session_id": session_id, "status": "open"}


def handle_search_manual_evidence(args: dict[str, Any], session_id: str) -> ToolResult:
    start = time.perf_counter()
    tool_name = "search_manual_evidence"
    try:
        filters = {key: value for key, value in dict(args.get("filters") or {}).items() if value is not None}
        query_embedding = embed_query(str(args["query"]))
        matches = query_chunks(query_embedding, filters, int(args["top_k"]))
        evidence = [
            {
                "chunk_id": match["metadata"].get("chunk_id"),
                "title": match["metadata"].get("manual_title"),
                "page_start": match["metadata"].get("page_start"),
                "page_end": match["metadata"].get("page_end"),
                "score": match.get("distance"),
                "text_preview": str(match.get("document") or "")[:300],
            }
            for match in matches
        ]
        return _success(tool_name, evidence, start)
    except Exception as exc:
        return _failure(tool_name, exc, start)


def handle_inspect_uploaded_media(args: dict[str, Any], session_id: str) -> ToolResult:
    start = time.perf_counter()
    tool_name = "inspect_uploaded_media"
    try:
        media = _media_record(str(args["media_id"]))
        data = download_file(str(media["storage_bucket"]), str(media["storage_path"]))
        media_type = str(media.get("media_type") or args.get("media_type"))
        if media_type == "image":
            output = analyze_image(
                str(args["media_id"]),
                base64.b64encode(data).decode("ascii"),
                str(args["analysis_goal"]),
                list(args.get("focus_areas") or []),
            )
            return _success(tool_name, output, start)
        if media_type == "audio":
            transcript = transcribe(str(args["media_id"]), data, str(media["storage_path"]).split("/")[-1], "en")
            return _success(tool_name, {"media_id": args["media_id"], "transcript": transcript}, start)
        raise AgentError("Unsupported media type")
    except Exception as exc:
        return _failure(tool_name, exc, start)


def handle_update_diagnostic_state(args: dict[str, Any], session_id: str) -> ToolResult:
    start = time.perf_counter()
    tool_name = "update_diagnostic_state"
    try:
        return _success(tool_name, asdict(apply_update(session_id, args)), start)
    except Exception as exc:
        return _failure(tool_name, exc, start)


def handle_escalate_to_human_support(args: dict[str, Any], session_id: str) -> ToolResult:
    start = time.perf_counter()
    tool_name = "escalate_to_human_support"
    try:
        return _success(tool_name, _escalation(args, session_id), start)
    except Exception as exc:
        return _failure(tool_name, exc, start)


TOOL_DISPATCH: dict[str, ToolHandler] = {
    "search_manual_evidence": handle_search_manual_evidence,
    "inspect_uploaded_media": handle_inspect_uploaded_media,
    "update_diagnostic_state": handle_update_diagnostic_state,
    "escalate_to_human_support": handle_escalate_to_human_support,
}
