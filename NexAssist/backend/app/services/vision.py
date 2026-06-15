import json
from typing import Any

from app.core.errors import AgentError
from app.services.groq_client import analyze_image as groq_analyze_image


PROMPT_INSTRUCTIONS: dict[str, str] = {
    "identify_visible_issue": "Identify what is visibly wrong",
    "read_error_code": "Read any error codes or indicator lights visible",
    "inspect_part_condition": "Assess the physical condition of the part",
    "summarize_media": "Provide a general diagnostic summary",
}


def _prompt(analysis_goal: str, focus_areas: list[str]) -> str:
    instruction = PROMPT_INSTRUCTIONS.get(analysis_goal)
    if instruction is None:
        raise AgentError("Unsupported image analysis goal")
    focus = ", ".join(focus_areas) if focus_areas else "none"
    return (
        f"{instruction}. Focus areas: {focus}. "
        "Return strict JSON with keys component, condition, likely_issue, confidence."
    )


def analyze_image(media_id: str, image_b64: str, analysis_goal: str, focus_areas: list[str]) -> dict[str, Any]:
    try:
        raw_text = groq_analyze_image(image_b64, _prompt(analysis_goal, focus_areas))
        try:
            parsed = json.loads(raw_text)
        except json.JSONDecodeError:
            parsed = {}
        return {
            "component": parsed.get("component"),
            "condition": parsed.get("condition"),
            "likely_issue": parsed.get("likely_issue"),
            "confidence": parsed.get("confidence"),
            "raw_text": raw_text,
        }
    except AgentError:
        raise
    except Exception as exc:
        raise AgentError(f"Image analysis failed for media {media_id}") from exc
