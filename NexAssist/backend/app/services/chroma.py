from functools import lru_cache
from typing import Any

import chromadb
from chromadb.api import ClientAPI
from chromadb.api.models.Collection import Collection

from app.config import get_settings
from app.core.errors import IngestionError


@lru_cache(maxsize=1)
def get_chroma_client() -> ClientAPI:
    settings = get_settings()
    try:
        return chromadb.PersistentClient(path=settings.chroma.persist_dir)
    except Exception as exc:
        raise IngestionError("Unable to initialize ChromaDB client") from exc


def initialize_chroma() -> None:
    settings = get_settings()
    get_collection(settings.chroma.collection_manual)
    get_collection(settings.chroma.collection_cases)


def cleanup_chroma() -> None:
    get_chroma_client.cache_clear()


def get_collection(name: str) -> Collection:
    try:
        return get_chroma_client().get_or_create_collection(name=name)
    except Exception as exc:
        raise IngestionError("Unable to initialize ChromaDB collection") from exc


def upsert_chunks(chunks: list[dict[str, Any]]) -> None:
    if not chunks:
        return

    settings = get_settings()
    try:
        collection = get_collection(settings.chroma.collection_manual)
        ids = [str(chunk["id"]) for chunk in chunks]
        documents = [str(chunk["document"]) for chunk in chunks]
        embeddings = [chunk["embedding"] for chunk in chunks]
        metadatas = [chunk["metadata"] for chunk in chunks]
        collection.upsert(ids=ids, documents=documents, embeddings=embeddings, metadatas=metadatas)
    except Exception as exc:
        raise IngestionError("Unable to upsert ChromaDB chunks") from exc


def query_chunks(
    query_embedding: list[float],
    filters: dict[str, Any] | None = None,
    top_k: int = 5,
) -> list[dict[str, Any]]:
    settings = get_settings()
    try:
        collection = get_collection(settings.chroma.collection_manual)
        result = collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k,
            where=filters or None,
            include=["documents", "metadatas", "distances"],
        )
        ids = result.get("ids", [[]])[0]
        documents = result.get("documents", [[]])[0]
        metadatas = result.get("metadatas", [[]])[0]
        distances = result.get("distances", [[]])[0]
        return [
            {
                "id": ids[index],
                "document": documents[index],
                "metadata": metadatas[index],
                "distance": distances[index],
            }
            for index in range(len(ids))
        ]
    except Exception as exc:
        raise IngestionError("Unable to query ChromaDB chunks") from exc
