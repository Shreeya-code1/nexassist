from app.core.errors import IngestionError
from app.db.supabase import get_service_client


def upload_file(bucket: str, path: str, data: bytes, content_type: str) -> str:
    try:
        client = get_service_client()
        client.storage.from_(bucket).upload(
            path,
            data,
            file_options={"content-type": content_type, "upsert": "true"},
        )
        public_url = client.storage.from_(bucket).get_public_url(path)
        if not public_url:
            raise IngestionError("Unable to get uploaded file URL")
        return public_url
    except IngestionError:
        raise
    except Exception as exc:
        raise IngestionError("Unable to upload file") from exc


def download_file(bucket: str, path: str) -> bytes:
    try:
        data = get_service_client().storage.from_(bucket).download(path)
        if not isinstance(data, bytes):
            raise IngestionError("Downloaded file is empty")
        return data
    except IngestionError:
        raise
    except Exception as exc:
        raise IngestionError("Unable to download file") from exc


def delete_file(bucket: str, path: str) -> None:
    try:
        get_service_client().storage.from_(bucket).remove([path])
    except Exception as exc:
        raise IngestionError("Unable to delete file") from exc
