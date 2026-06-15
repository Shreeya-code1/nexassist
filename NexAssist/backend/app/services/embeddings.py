from sentence_transformers import SentenceTransformer

from app.config import get_settings
from app.core.errors import IngestionError


def _load_model() -> SentenceTransformer:
    settings = get_settings()
    try:
        return SentenceTransformer(settings.embeddings.model_name)
    except Exception as exc:
        raise IngestionError("Unable to load embeddings model") from exc


_model: SentenceTransformer = _load_model()


def get_embedding_model() -> SentenceTransformer:
    return _model


def embed_texts(texts: list[str]) -> list[list[float]]:
    try:
        embeddings = _model.encode(texts, convert_to_numpy=True, normalize_embeddings=True)
        return embeddings.tolist()
    except Exception as exc:
        raise IngestionError("Unable to embed texts") from exc


def embed_query(text: str) -> list[float]:
    try:
        return embed_texts([text])[0]
    except Exception as exc:
        raise IngestionError("Unable to embed query") from exc
