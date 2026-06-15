from collections.abc import Iterator
from functools import lru_cache
from typing import Any

from groq import Groq
from groq.types.chat import ChatCompletion, ChatCompletionChunk

from app.config import get_settings
from app.core.errors import AgentError


@lru_cache(maxsize=1)
def get_groq_client() -> Groq:
    settings = get_settings()
    try:
        return Groq(api_key=settings.groq.api_key)
    except Exception as exc:
        raise AgentError("Unable to initialize Groq client") from exc


def verify_groq_connection() -> None:
    try:
        get_groq_client().models.list()
    except Exception as exc:
        raise AgentError("Unable to verify Groq connection") from exc


def chat_completion(
    messages: list[dict[str, Any]],
    tools: list[dict[str, Any]] | None = None,
    tool_choice: str | dict[str, Any] | None = None,
    stream: bool = False,
) -> ChatCompletion | Iterator[ChatCompletionChunk]:
    settings = get_settings()
    try:
        return get_groq_client().chat.completions.create(
            model=settings.groq.chat_model,
            messages=messages,
            tools=tools,
            tool_choice=tool_choice,
            stream=stream,
        )
    except Exception as exc:
        raise AgentError("Groq chat completion failed") from exc


def transcribe_audio(file_bytes: bytes, filename: str, language: str | None = None) -> str:
    settings = get_settings()
    try:
        transcription = get_groq_client().audio.transcriptions.create(
            file=(filename, file_bytes),
            model=settings.groq.whisper_model,
            language=language,
        )
        return transcription.text
    except Exception as exc:
        raise AgentError("Groq audio transcription failed") from exc


def analyze_image(image_b64: str, prompt: str) -> str:
    settings = get_settings()
    try:
        completion = get_groq_client().chat.completions.create(
            model=settings.groq.vision_model,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{image_b64}",
                            },
                        },
                    ],
                }
            ],
        )
        content = completion.choices[0].message.content
        if content is None:
            raise AgentError("Groq image analysis returned empty content")
        return content
    except AgentError:
        raise
    except Exception as exc:
        raise AgentError("Groq image analysis failed") from exc
