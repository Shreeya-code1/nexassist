import re
from collections import Counter
from dataclasses import dataclass
from typing import Any

import tiktoken

from app.core.errors import IngestionError
from app.services.document_parser import ParsedDocument, ParsedPage
from app.utils.ids import chunk_id
from app.utils.time import to_iso, utcnow


TARGET_TOKENS: int = 400
OVERLAP_TOKENS: int = 80
TOKEN_PATTERN: re.Pattern[str] = re.compile(r"[A-Za-z][A-Za-z0-9-]{2,}")
STOPWORDS: set[str] = {
    "about",
    "after",
    "also",
    "and",
    "are",
    "before",
    "between",
    "can",
    "for",
    "from",
    "has",
    "have",
    "into",
    "may",
    "not",
    "the",
    "then",
    "this",
    "that",
    "with",
    "you",
    "your",
}


@dataclass
class Chunk:
    id: str
    document: str
    company_id: str
    product_id: str
    product_model_id: str | None
    manual_id: str
    manual_title: str
    manual_version: str | None
    manual_language: str
    file_name: str
    file_type: str
    chunk_id: str
    chunk_index: int
    chunk_type: str
    section_title: str | None
    heading_path: list[str]
    page_start: int | None
    page_end: int | None
    char_start: int
    char_end: int
    token_count: int
    contains_warning: bool
    contains_error_code: bool
    error_codes: list[str]
    keywords: list[str]
    created_at: str


def _encoding() -> tiktoken.Encoding:
    return tiktoken.get_encoding("cl100k_base")


def _keywords(text: str) -> list[str]:
    tokens = [token.lower() for token in TOKEN_PATTERN.findall(text)]
    filtered = [token for token in tokens if token not in STOPWORDS]
    return [token for token, count in Counter(filtered).most_common(10)]


def _chunk_type(page: ParsedPage) -> str:
    return page.section_type.lower()


def _window_ranges(token_count: int) -> list[tuple[int, int]]:
    if token_count <= TARGET_TOKENS:
        return [(0, token_count)]
    ranges: list[tuple[int, int]] = []
    start = 0
    step = TARGET_TOKENS - OVERLAP_TOKENS
    while start < token_count:
        end = min(start + TARGET_TOKENS, token_count)
        ranges.append((start, end))
        if end == token_count:
            break
        start += step
    return ranges


def _text_position(page_text: str, chunk_text: str, fallback_start: int) -> tuple[int, int]:
    needle = chunk_text.strip()
    if not needle:
        return fallback_start, fallback_start
    index = page_text.find(needle)
    if index == -1:
        index = fallback_start
    return index, index + len(needle)


def _metadata_value(metadata: dict[str, Any], key: str) -> Any:
    if key not in metadata:
        raise IngestionError(f"Manual metadata missing {key}")
    return metadata[key]


def chunk_document(parsed: ParsedDocument, manual_metadata: dict[str, Any]) -> list[Chunk]:
    try:
        encoding = _encoding()
        chunks: list[Chunk] = []
        created_at = to_iso(utcnow())
        chunk_index = 0
        for page in parsed.pages:
            tokens = encoding.encode(page.text)
            cursor = 0
            for start, end in _window_ranges(len(tokens)):
                text = encoding.decode(tokens[start:end]).strip()
                char_start, char_end = _text_position(page.text, text, cursor)
                cursor = char_end
                token_count = end - start
                identifier = chunk_id(parsed.manual_id, chunk_index)
                error_codes = sorted(set(page.error_codes))
                chunk_type = _chunk_type(page)
                chunks.append(
                    Chunk(
                        id=identifier,
                        document=text,
                        company_id=str(_metadata_value(manual_metadata, "company_id")),
                        product_id=str(_metadata_value(manual_metadata, "product_id")),
                        product_model_id=manual_metadata.get("product_model_id"),
                        manual_id=parsed.manual_id,
                        manual_title=str(_metadata_value(manual_metadata, "title")),
                        manual_version=manual_metadata.get("version"),
                        manual_language=str(_metadata_value(manual_metadata, "language")),
                        file_name=str(_metadata_value(manual_metadata, "file_name")),
                        file_type=str(_metadata_value(manual_metadata, "file_type")),
                        chunk_id=identifier,
                        chunk_index=chunk_index,
                        chunk_type=chunk_type,
                        section_title=None,
                        heading_path=[],
                        page_start=page.page_number,
                        page_end=page.page_number,
                        char_start=char_start,
                        char_end=char_end,
                        token_count=token_count,
                        contains_warning=chunk_type == "warning" or "warning" in text.lower(),
                        contains_error_code=bool(error_codes),
                        error_codes=error_codes,
                        keywords=_keywords(text),
                        created_at=created_at,
                    )
                )
                chunk_index += 1
        return chunks
    except IngestionError:
        raise
    except Exception as exc:
        raise IngestionError("Unable to chunk document") from exc
