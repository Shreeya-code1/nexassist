import json
from collections.abc import AsyncGenerator
from dataclasses import asdict, dataclass, is_dataclass
from datetime import date, datetime
from typing import Any

from app.core.errors import AgentError, NotFoundError
from app.db.repositories.products import ProductsRepository
from app.db.repositories.sessions import SessionsRepository
from app.db.supabase import get_service_client
from app.services.diagnostic_state import StateSnapshot, load_state, phase_from_confidence
from app.services.groq_client import chat_completion
from app.services.tools import TOOL_DISPATCH, ToolResult


MAX_AGENT_ITERATIONS: int = 6

GROQ_TOOLS: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "search_manual_evidence",
            "description": "Search indexed product manuals for specific diagnostic evidence, procedures, warnings, error codes, specifications, or troubleshooting steps.",
            "parameters": {
                "type": "object",
                "additionalProperties": False,
                "required": ["company_id", "query", "top_k"],
                "properties": {
                    "company_id": {"type": "string", "format": "uuid"},
                    "product_id": {"type": ["string", "null"], "format": "uuid"},
                    "product_model_id": {"type": ["string", "null"], "format": "uuid"},
                    "query": {"type": "string", "minLength": 3},
                    "filters": {
                        "type": "object",
                        "additionalProperties": False,
                        "properties": {
                            "manual_id": {"type": ["string", "null"], "format": "uuid"},
                            "chunk_type": {
                                "type": ["string", "null"],
                                "enum": [
                                    "text",
                                    "table",
                                    "warning",
                                    "procedure",
                                    "troubleshooting",
                                    "specification",
                                    "diagram_caption",
                                    None,
                                ],
                            },
                            "contains_warning": {"type": ["boolean", "null"]},
                            "contains_error_code": {"type": ["boolean", "null"]},
                            "error_code": {"type": ["string", "null"]},
                        },
                    },
                    "top_k": {"type": "integer", "minimum": 1, "maximum": 12},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "inspect_uploaded_media",
            "description": "Analyze uploaded session media using the correct Groq model for image or audio inputs and return diagnostic observations.",
            "parameters": {
                "type": "object",
                "additionalProperties": False,
                "required": ["session_id", "media_id", "analysis_goal"],
                "properties": {
                    "session_id": {"type": "string", "format": "uuid"},
                    "media_id": {"type": "string", "format": "uuid"},
                    "media_type": {"type": "string", "enum": ["image", "audio"]},
                    "analysis_goal": {
                        "type": "string",
                        "enum": [
                            "identify_visible_issue",
                            "read_error_code",
                            "inspect_part_condition",
                            "transcribe_user_description",
                            "summarize_media",
                        ],
                    },
                    "focus_areas": {"type": "array", "items": {"type": "string"}, "default": []},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "update_diagnostic_state",
            "description": "Persist the current state of the diagnostic investigation, including symptoms, hypotheses, eliminated causes, completed steps, and next action.",
            "parameters": {
                "type": "object",
                "additionalProperties": False,
                "required": [
                    "session_id",
                    "observed_symptoms",
                    "hypotheses",
                    "eliminated_causes",
                    "performed_steps",
                    "recommended_next_step",
                    "confidence",
                ],
                "properties": {
                    "session_id": {"type": "string", "format": "uuid"},
                    "observed_symptoms": {"type": "array", "items": {"type": "string"}},
                    "known_context": {"type": "object", "additionalProperties": True},
                    "hypotheses": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "additionalProperties": False,
                            "required": ["cause", "likelihood", "evidence"],
                            "properties": {
                                "cause": {"type": "string"},
                                "likelihood": {"type": "string", "enum": ["low", "medium", "high"]},
                                "evidence": {"type": "array", "items": {"type": "string"}},
                            },
                        },
                    },
                    "eliminated_causes": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "additionalProperties": False,
                            "required": ["cause", "reason"],
                            "properties": {"cause": {"type": "string"}, "reason": {"type": "string"}},
                        },
                    },
                    "performed_steps": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "additionalProperties": False,
                            "required": ["step", "result"],
                            "properties": {
                                "step": {"type": "string"},
                                "result": {"type": "string"},
                                "timestamp": {"type": "string", "format": "date-time"},
                            },
                        },
                    },
                    "recommended_next_step": {
                        "type": "object",
                        "additionalProperties": False,
                        "required": ["instruction", "reason", "risk_level"],
                        "properties": {
                            "instruction": {"type": "string"},
                            "reason": {"type": "string"},
                            "risk_level": {"type": "string", "enum": ["low", "medium", "high"]},
                        },
                    },
                    "confidence": {"type": "number", "minimum": 0, "maximum": 1},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "escalate_to_human_support",
            "description": "Create a human support escalation when the diagnostic path is unsafe, blocked, low-confidence, or requires authorized service.",
            "parameters": {
                "type": "object",
                "additionalProperties": False,
                "required": ["session_id", "reason", "priority", "summary"],
                "properties": {
                    "session_id": {"type": "string", "format": "uuid"},
                    "reason": {
                        "type": "string",
                        "enum": [
                            "safety_risk",
                            "requires_authorized_service",
                            "insufficient_information",
                            "repeated_failed_steps",
                            "user_requested_human",
                            "critical_severity",
                        ],
                    },
                    "priority": {"type": "string", "enum": ["low", "medium", "high", "critical"]},
                    "summary": {"type": "string"},
                    "evidence_chunk_ids": {"type": "array", "items": {"type": "string"}, "default": []},
                },
            },
        },
    },
]

SYSTEM_PROMPT_TEMPLATE: str = """You are an expert diagnostic technician for {product_name}.
Session context (use these exact values as tool arguments, never invent your own ids):
- session_id: {session_id}
- company_id: {company_id}
- product_id: {product_id}
- product_model_id: {product_model_id}
Current diagnostic state: {state_json}
RULES:
1. Ask exactly ONE targeted question per turn until confidence >= 0.80.
2. Never state a diagnosis until confidence reaches 0.80.
3. Every technical claim must cite: manual title, section, page number.
4. Call update_diagnostic_state after every turn.
5. Call escalate_to_human_support if safety risk or 3+ failed attempts.
6. Be concise. No lists of possible causes — investigate, then conclude."""


@dataclass
class AgentResponse:
    session_id: str
    assistant_message_id: str
    answer: str
    current_phase: str
    diagnostic_state: StateSnapshot | None
    evidence: list[dict[str, Any]]
    tool_runs: list[ToolResult]
    error: str | None


def _jsonable(value: Any) -> Any:
    if is_dataclass(value):
        return _jsonable(asdict(value))
    if isinstance(value, dict):
        return {str(key): _jsonable(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_jsonable(item) for item in value]
    if isinstance(value, datetime | date):
        return value.isoformat()
    return value


def build_system_prompt(product_name: str, state: StateSnapshot | None, session: dict[str, Any]) -> str:
    state_json = json.dumps(_jsonable(state), separators=(",", ":"))
    return SYSTEM_PROMPT_TEMPLATE.format(
        product_name=product_name,
        state_json=state_json,
        session_id=session.get("id"),
        company_id=session.get("company_id"),
        product_id=session.get("product_id") or "null",
        product_model_id=session.get("product_model_id") or "null",
    )


def _repositories() -> tuple[SessionsRepository, ProductsRepository]:
    client = get_service_client()
    return SessionsRepository(client), ProductsRepository(client)


def _product_name(product_id: str | None, products_repository: ProductsRepository) -> str:
    if product_id is None:
        return "this product"
    try:
        return str(products_repository.get_product(product_id).get("name") or "this product")
    except NotFoundError:
        return "this product"


def _history(repository: SessionsRepository, session_id: str) -> list[dict[str, Any]]:
    try:
        records = repository.get_messages(session_id)[-20:]
    except NotFoundError:
        records = []
    return [{"role": record["role"], "content": record["content"]} for record in records if record["role"] in {"user", "assistant", "system"}]


def _tool_call_id(tool_call: Any) -> str:
    return str(getattr(tool_call, "id", ""))


def _tool_name(tool_call: Any) -> str:
    function = getattr(tool_call, "function", None)
    return str(getattr(function, "name", ""))


def _tool_args(tool_call: Any) -> dict[str, Any]:
    function = getattr(tool_call, "function", None)
    arguments = getattr(function, "arguments", "{}")
    parsed = json.loads(arguments or "{}")
    if not isinstance(parsed, dict):
        raise AgentError("Tool arguments must be an object")
    return parsed


def _tool_call_message(message: Any) -> dict[str, Any]:
    tool_calls = getattr(message, "tool_calls", None) or []
    return {
        "role": "assistant",
        "content": getattr(message, "content", None) or "",
        "tool_calls": [
            tool_call.model_dump() if hasattr(tool_call, "model_dump") else tool_call
            for tool_call in tool_calls
        ],
    }


def _extract_answer(message: Any) -> str:
    return str(getattr(message, "content", None) or "")


def _dispatch_tool(tool_name: str, args: dict[str, Any], session_id: str) -> ToolResult:
    handler = TOOL_DISPATCH.get(tool_name)
    if handler is None:
        return ToolResult(tool_name=tool_name, success=False, output=None, error="Unknown tool", latency_ms=0)
    return handler(args, session_id)


def _append_tool_result(messages: list[dict[str, Any]], tool_call_id: str, tool_name: str, result: ToolResult) -> None:
    messages.append(
        {
            "role": "tool",
            "tool_call_id": tool_call_id,
            "name": tool_name,
            "content": json.dumps(_jsonable(result), separators=(",", ":")),
        }
    )


def _evidence(tool_runs: list[ToolResult]) -> list[dict[str, Any]]:
    evidence: list[dict[str, Any]] = []
    for tool_run in tool_runs:
        if tool_run.tool_name == "search_manual_evidence" and isinstance(tool_run.output, list):
            evidence.extend(tool_run.output)
    return evidence


def _save_assistant_message(repository: SessionsRepository, session_id: str, answer: str) -> dict[str, Any]:
    return repository.add_message(
        {
            "session_id": session_id,
            "role": "assistant",
            "content": answer,
            "content_type": "text",
            "metadata": {},
        }
    )


def _save_tool_runs(session_id: str, assistant_message_id: str, tool_inputs: list[dict[str, Any]], tool_runs: list[ToolResult]) -> None:
    client = get_service_client()
    for index, tool_run in enumerate(tool_runs):
        client.table("tool_runs").insert(
            {
                "session_id": session_id,
                "message_id": assistant_message_id,
                "tool_name": tool_run.tool_name,
                "input": tool_inputs[index] if index < len(tool_inputs) else {},
                "output": _jsonable(tool_run.output),
                "status": "completed" if tool_run.success else "failed",
                "error_message": tool_run.error,
                "latency_ms": tool_run.latency_ms,
            }
        ).execute()


def _phase(state: StateSnapshot | None) -> str:
    if state is None:
        return "intake"
    return phase_from_confidence(state.confidence, len(state.hypotheses)).value


def _initial_messages(system_prompt: str, history: list[dict[str, Any]], user_message: str, media_ids: list[str]) -> list[dict[str, Any]]:
    media_context = f"\nAttached media IDs: {', '.join(media_ids)}" if media_ids else ""
    return [{"role": "system", "content": system_prompt}, *history, {"role": "user", "content": f"{user_message}{media_context}"}]


def _run_loop(messages: list[dict[str, Any]], session_id: str) -> tuple[str, list[ToolResult], list[dict[str, Any]]]:
    answer = ""
    tool_runs: list[ToolResult] = []
    tool_inputs: list[dict[str, Any]] = []
    for iteration in range(MAX_AGENT_ITERATIONS):
        response = chat_completion(messages, tools=GROQ_TOOLS, tool_choice="auto", stream=False)
        message = response.choices[0].message
        tool_calls = getattr(message, "tool_calls", None) or []
        if not tool_calls:
            answer = _extract_answer(message)
            break
        messages.append(_tool_call_message(message))
        for tool_call in tool_calls:
            tool_name = _tool_name(tool_call)
            args = _tool_args(tool_call)
            result = _dispatch_tool(tool_name, args, session_id)
            tool_inputs.append(args)
            tool_runs.append(result)
            _append_tool_result(messages, _tool_call_id(tool_call), tool_name, result)
    if not answer:
        answer = "I need one more detail to continue the diagnosis."
    return answer, tool_runs, tool_inputs


def run_agent(session_id: str, user_message: str, media_ids: list[str]) -> AgentResponse:
    try:
        sessions_repository, products_repository = _repositories()
        session = sessions_repository.get_session(session_id)
        state = load_state(session_id)
        product_name = _product_name(session.get("product_id"), products_repository)
        messages = _initial_messages(build_system_prompt(product_name, state, session), _history(sessions_repository, session_id), user_message, media_ids)
        answer, tool_runs, tool_inputs = _run_loop(messages, session_id)
        assistant_message = _save_assistant_message(sessions_repository, session_id, answer)
        _save_tool_runs(session_id, str(assistant_message["id"]), tool_inputs, tool_runs)
        updated_state = load_state(session_id)
        return AgentResponse(
            session_id=session_id,
            assistant_message_id=str(assistant_message["id"]),
            answer=answer,
            current_phase=_phase(updated_state),
            diagnostic_state=updated_state,
            evidence=_evidence(tool_runs),
            tool_runs=tool_runs,
            error=None,
        )
    except AgentError:
        raise
    except Exception as exc:
        raise AgentError("Agent run failed") from exc


async def run_agent_stream(session_id: str, user_message: str, media_ids: list[str]) -> AsyncGenerator[dict[str, Any], None]:
    try:
        sessions_repository, products_repository = _repositories()
        session = sessions_repository.get_session(session_id)
        state = load_state(session_id)
        product_name = _product_name(session.get("product_id"), products_repository)
        messages = _initial_messages(build_system_prompt(product_name, state, session), _history(sessions_repository, session_id), user_message, media_ids)
        answer = ""
        tool_runs: list[ToolResult] = []
        tool_inputs: list[dict[str, Any]] = []
        for iteration in range(MAX_AGENT_ITERATIONS):
            response = chat_completion(messages, tools=GROQ_TOOLS, tool_choice="auto", stream=False)
            message = response.choices[0].message
            tool_calls = getattr(message, "tool_calls", None) or []
            if not tool_calls:
                answer = _extract_answer(message)
                yield {"type": "message.delta", "delta": answer}
                break
            messages.append(_tool_call_message(message))
            for tool_call in tool_calls:
                tool_name = _tool_name(tool_call)
                args = _tool_args(tool_call)
                yield {"type": "tool.started", "tool_name": tool_name, "input": args}
                result = _dispatch_tool(tool_name, args, session_id)
                tool_inputs.append(args)
                tool_runs.append(result)
                _append_tool_result(messages, _tool_call_id(tool_call), tool_name, result)
                yield {
                    "type": "tool.completed",
                    "tool_name": tool_name,
                    "output": _jsonable(result.output),
                    "latency_ms": result.latency_ms,
                }
                updated_state = load_state(session_id)
                yield {
                    "type": "state.updated",
                    "diagnostic_state": _jsonable(updated_state),
                    "current_phase": _phase(updated_state),
                }
        if not answer:
            answer = "I need one more detail to continue the diagnosis."
            yield {"type": "message.delta", "delta": answer}
        assistant_message = _save_assistant_message(sessions_repository, session_id, answer)
        _save_tool_runs(session_id, str(assistant_message["id"]), tool_inputs, tool_runs)
        yield {"type": "message.completed", "answer": answer, "evidence": _evidence(tool_runs)}
    except Exception as exc:
        yield {"type": "error", "detail": str(exc)}
