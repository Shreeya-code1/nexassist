from uuid import uuid4


def generate_uuid() -> str:
    return str(uuid4())


def chunk_id(manual_id: str, index: int) -> str:
    return f"{manual_id}:{index}"


def case_id(session_id: str, version: int) -> str:
    return f"{session_id}:{version}"
