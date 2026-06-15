import re
from collections import Counter
from dataclasses import dataclass

import fitz

from app.core.errors import IngestionError
from app.utils.storage import upload_file


WARNING_KEYWORDS: set[str] = {"warning", "caution", "danger", "do not", "never"}
PROCEDURE_KEYWORDS: set[str] = {"step 1", "step 2", "follow these", "procedure"}
TROUBLESHOOTING_KEYWORDS: set[str] = {"troubleshoot", "symptom", "if the", "does not", "problem"}
MAINTENANCE_KEYWORDS: set[str] = {"replace every", "service interval", "maintenance", "inspect"}
SPECIFICATION_KEYWORDS: set[str] = {"specifications", "capacity", "voltage", "pressure", "torque"}
ERROR_CODE_PATTERN: re.Pattern[str] = re.compile(r"\b(?:[A-Z]{1,3}-?\d{2,4}|F\d+|E\d+)\b")
TOKEN_PATTERN: re.Pattern[str] = re.compile(r"[A-Za-z][A-Za-z0-9-]{2,}")
STOPWORDS: set[str] = {
    "and",
    "are",
    "for",
    "from",
    "has",
    "have",
    "not",
    "that",
    "the",
    "this",
    "with",
    "you",
    "your",
}


@dataclass
class ParsedPage:
    page_number: int
    text: str
    images: list[str]
    section_type: str
    error_codes: list[str]
    keywords: list[str]
    has_table: bool
    has_warning: bool


@dataclass
class ParsedDocument:
    manual_id: str
    pages: list[ParsedPage]
    page_count: int


def _detect_section_type(text: str) -> str:
    lower_text = text.lower()
    if any(keyword in lower_text for keyword in WARNING_KEYWORDS):
        return "WARNING"
    if any(keyword in lower_text for keyword in PROCEDURE_KEYWORDS):
        return "PROCEDURE"
    if any(keyword in lower_text for keyword in TROUBLESHOOTING_KEYWORDS):
        return "TROUBLESHOOTING"
    if any(keyword in lower_text for keyword in MAINTENANCE_KEYWORDS):
        return "MAINTENANCE"
    if any(keyword in lower_text for keyword in SPECIFICATION_KEYWORDS):
        return "SPECIFICATION"
    return "TEXT"


def _extract_error_codes(text: str) -> list[str]:
    return sorted(set(ERROR_CODE_PATTERN.findall(text)))


def _extract_keywords(text: str, limit: int) -> list[str]:
    tokens = [token.lower() for token in TOKEN_PATTERN.findall(text)]
    filtered = [token for token in tokens if token not in STOPWORDS]
    return [token for token, count in Counter(filtered).most_common(limit)]


def _has_table(page: fitz.Page) -> bool:
    try:
        return bool(page.find_tables().tables)
    except Exception:
        return False


def _image_bytes(document: fitz.Document, xref: int) -> bytes:
    pixmap = fitz.Pixmap(document, xref)
    try:
        if pixmap.alpha or pixmap.n > 4:
            pixmap = fitz.Pixmap(fitz.csRGB, pixmap)
        return pixmap.tobytes("png")
    finally:
        pixmap = None


def _extract_images(document: fitz.Document, page: fitz.Page, manual_id: str, page_number: int) -> list[str]:
    image_urls: list[str] = []
    for index, image in enumerate(page.get_images(full=True), start=1):
        image_data = _image_bytes(document, int(image[0]))
        path = f"manuals/{manual_id}/page_{page_number}img{index}.png"
        image_urls.append(upload_file("company-assets", path, image_data, "image/png"))
    return image_urls


def parse_pdf(pdf_bytes: bytes, manual_id: str) -> ParsedDocument:
    try:
        document = fitz.open(stream=pdf_bytes, filetype="pdf")
    except Exception as exc:
        raise IngestionError("Unable to open PDF") from exc

    try:
        pages: list[ParsedPage] = []
        for page_index in range(document.page_count):
            page = document.load_page(page_index)
            text = page.get_text("text").strip()
            section_type = _detect_section_type(text)
            error_codes = _extract_error_codes(text)
            pages.append(
                ParsedPage(
                    page_number=page_index + 1,
                    text=text,
                    images=_extract_images(document, page, manual_id, page_index + 1),
                    section_type=section_type,
                    error_codes=error_codes,
                    keywords=_extract_keywords(text, 10),
                    has_table=_has_table(page),
                    has_warning=section_type == "WARNING" or "warning" in text.lower(),
                )
            )
        return ParsedDocument(manual_id=manual_id, pages=pages, page_count=document.page_count)
    except IngestionError:
        raise
    except Exception as exc:
        raise IngestionError("Unable to parse PDF") from exc
    finally:
        document.close()
