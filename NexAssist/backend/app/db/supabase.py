from functools import lru_cache

from supabase import Client, create_client
from supabase.lib.client_options import ClientOptions

from app.config import get_settings
from app.core.errors import ForbiddenError


@lru_cache(maxsize=1)
def _get_anon_client() -> Client:
    settings = get_settings()
    try:
        return create_client(str(settings.supabase.url), settings.supabase.anon_key)
    except Exception as exc:
        raise ForbiddenError("Unable to initialize Supabase anonymous client") from exc


@lru_cache(maxsize=1)
def get_service_client() -> Client:
    settings = get_settings()
    try:
        return create_client(str(settings.supabase.url), settings.supabase.service_key)
    except Exception as exc:
        raise ForbiddenError("Unable to initialize Supabase service client") from exc


def get_supabase_client(token: str | None = None) -> Client:
    if token is None:
        return _get_anon_client()

    settings = get_settings()
    try:
        return create_client(
            str(settings.supabase.url),
            settings.supabase.anon_key,
            options=ClientOptions(headers={"Authorization": f"Bearer {token}"}),
        )
    except Exception as exc:
        raise ForbiddenError("Unable to initialize Supabase authenticated client") from exc
