from app.core.errors import AgentError
from app.services.groq_client import transcribe_audio


def transcribe(media_id: str, audio_bytes: bytes, filename: str, language: str) -> str:
    try:
        return transcribe_audio(audio_bytes, filename, language).strip()
    except AgentError:
        raise
    except Exception as exc:
        raise AgentError(f"Audio transcription failed for media {media_id}") from exc
