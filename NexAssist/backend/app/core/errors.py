from collections.abc import Awaitable, Callable

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse


class NotFoundError(Exception):
    pass


class ForbiddenError(Exception):
    pass


class ConflictError(Exception):
    pass


class IngestionError(Exception):
    pass


class AgentError(Exception):
    pass


ExceptionHandler = Callable[[Request, Exception], Awaitable[JSONResponse]]


def _json_error(status_code: int, detail: str) -> JSONResponse:
    return JSONResponse(status_code=status_code, content={"detail": detail})


def _handler(status_code: int) -> ExceptionHandler:
    async def handle_error(request: Request, exc: Exception) -> JSONResponse:
        return _json_error(status_code, str(exc))

    return handle_error


def register_exception_handlers(app: FastAPI) -> None:
    app.add_exception_handler(NotFoundError, _handler(status.HTTP_404_NOT_FOUND))
    app.add_exception_handler(ForbiddenError, _handler(status.HTTP_403_FORBIDDEN))
    app.add_exception_handler(ConflictError, _handler(status.HTTP_409_CONFLICT))
    app.add_exception_handler(IngestionError, _handler(status.HTTP_422_UNPROCESSABLE_ENTITY))
    app.add_exception_handler(AgentError, _handler(status.HTTP_502_BAD_GATEWAY))
