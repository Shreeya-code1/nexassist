from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from importlib import import_module
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings
from app.core.errors import register_exception_handlers
from app.core.logging import get_logger
from app.services.chroma import cleanup_chroma, initialize_chroma
from app.services.groq_client import verify_groq_connection


logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    from app.services.embeddings import get_embedding_model

    initialize_chroma()
    get_embedding_model()
    verify_groq_connection()
    logger.info("Application startup complete")
    try:
        yield
    finally:
        cleanup_chroma()
        logger.info("Application shutdown complete")


settings = get_settings()

app = FastAPI(
    title="NexAssist API",
    version=settings.version,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)

try:
    router_module = import_module("app.api.router")
    app.include_router(router_module.router)
except ModuleNotFoundError as exc:
    if exc.name != "app.api.router":
        raise


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "version": settings.version,
        "env": settings.env,
    }
