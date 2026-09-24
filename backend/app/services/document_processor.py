import re
import os
from typing import List, Optional, Tuple
import pymupdf
from app.schemas.document import (
    DocumentChunk,
    DocumentSection,
    DocumentProcessingResponse,
    DocumentUploadResponse,
)

# Constants
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB
MAX_PAGE_COUNT = 150  # Prevent PDF decompression bombs / memory exhaustion
MAX_EXTRACTED_CHARS = 2_000_000  # 2M characters limit to protect system resources
ALLOWED_MIME_TYPES = {"application/pdf", "application/x-pdf"}
ALLOWED_EXTENSIONS = {".pdf"}
TARGET_CHUNK_MAX_CHARS = 1400

# Regex patterns for detecting legal headings
LEGAL_HEADING_PATTERNS = [
    # E.g. "SECTION 5 — CONFIDENTIALITY", "Article II: Representations", "CLAUSE 3.1"
    re.compile(r"^(?:SECTION|ARTICLE|CLAUSE)\s+([0-9IVXLCDM]+|[A-Z])[\s.:\-—]+(.*)$", re.IGNORECASE),
    # E.g. "1. Definitions", "2.1 Payment Terms", "10. Termination"
    re.compile(r"^(\d+(\.\d+)*)\.?\s+([A-Z][A-Za-z0-9\s,/\-&'()]{2,60})$"),
    # Standard standalone legal section headings (case-insensitive)
    re.compile(
        r"^(?:PREAMBLE|RECITALS|DEFINITIONS|TERM AND TERMINATION|TERMINATION|PAYMENT TERMS|PAYMENT|OBLIGATIONS|"
        r"REPRESENTATIONS AND WARRANTIES|COVENANTS|INDEMNIFICATION|CONFIDENTIALITY|"
        r"INTELLECTUAL PROPERTY|LIMITATION OF LIABILITY|GOVERNING LAW|DISPUTES|DISPUTE RESOLUTION|"
        r"MISCELLANEOUS|SEVERABILITY|ENTIRE AGREEMENT|NOTICES|AMENDMENTS|ASSIGNMENT)$",
        re.IGNORECASE,
    ),
]


class DocumentProcessingException(Exception):
    """Base exception for document processing errors."""
    def __init__(self, message: str, status_code: int = 400):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class UnsupportedFileTypeError(DocumentProcessingException):
    def __init__(self, message: str = "Unsupported file type. Only PDF documents are supported."):
        super().__init__(message, status_code=415)


class FileTooLargeError(DocumentProcessingException):
    def __init__(self, message: str = "File exceeds the maximum allowed size of 10 MB."):
        super().__init__(message, status_code=413)


class CorruptedPDFError(DocumentProcessingException):
    def __init__(self, message: str = "The uploaded PDF file is empty or corrupted and cannot be opened."):
        super().__init__(message, status_code=400)


class EncryptedPDFError(DocumentProcessingException):
    def __init__(self, message: str = "The uploaded PDF is encrypted or password-protected and cannot be read."):
        super().__init__(message, status_code=400)


class NoExtractableTextError(DocumentProcessingException):
    def __init__(self, message: str = "The PDF contains no extractable text. Scanned or image-only PDFs are not supported."):
        super().__init__(message, status_code=422)


class DocumentProcessor:
    """Service responsible for validating, parsing, cleaning, and chunking legal PDFs."""

    @staticmethod
    def validate_file(filename: Optional[str], file_bytes: bytes, content_type: Optional[str]) -> None:
        """Validate file size, extension, PDF magic bytes, and sanitize filename."""
        if not filename or not filename.strip():
            raise UnsupportedFileTypeError("Filename is missing.")

        # Sanitize against path traversal and null-byte injection
        clean_name = os.path.basename(filename.replace("\\", "/")).replace("\x00", "").strip()
        if not clean_name:
            raise UnsupportedFileTypeError("Filename is invalid.")

        name_part, ext = os.path.splitext(clean_name.lower())
        if ext not in ALLOWED_EXTENSIONS or not name_part:
            raise UnsupportedFileTypeError(f"Unsupported file format '{ext}'. Only PDF documents (.pdf) are supported.")

        if content_type and content_type.lower() not in ALLOWED_MIME_TYPES and content_type != "application/octet-stream":
            raise UnsupportedFileTypeError(f"Invalid MIME type '{content_type}'. Expected 'application/pdf'.")

        file_size = len(file_bytes)
        if file_size == 0:
            raise CorruptedPDFError("Uploaded file is empty (0 bytes).")

        if file_size > MAX_FILE_SIZE_BYTES:
            raise FileTooLargeError(f"File size ({file_size / (1024 * 1024):.2f} MB) exceeds maximum 10 MB limit.")

        # Check PDF magic bytes (%PDF)
        if not file_bytes.startswith(b"%PDF"):
            raise CorruptedPDFError("Uploaded file does not appear to be a valid PDF document (missing %PDF header).")

    @staticmethod
    def clean_text(text: str) -> str:
        """Clean extracted PDF text while preserving legal phrasing and paragraph structure."""
        if not text:
            return ""

        # Normalize carriage returns
        text = text.replace("\r\n", "\n").replace("\r", "\n")

        # Repair broken hyphenated words at linebreaks (e.g. "obliga-\ntion" -> "obligation")
        text = re.sub(r"([A-Za-z]{2,})-\n([A-Za-z]{2,})", r"\1\2", text)

        # Collapse horizontal whitespace
        text = re.sub(r"[ \t]+", " ", text)

        # Collapse 3 or more newlines down to 2 (clean paragraph separation)
        text = re.sub(r"\n{3,}", "\n\n", text)

        # Trim lines
        lines = [line.strip() for line in text.split("\n")]
        text = "\n".join(lines).strip()

        return text

    @classmethod
    def detect_heading(cls, line: str) -> Optional[str]:
        """Determine if a line matches known legal section heading heuristics."""
        stripped = line.strip()
        if not stripped or len(stripped) > 100:
            return None

        for pattern in LEGAL_HEADING_PATTERNS:
            if pattern.match(stripped):
                return stripped
        return None

    @classmethod
    def chunk_page_text(
        cls,
        page_num: int,
        raw_text: str,
        current_section: Optional[str] = None
    ) -> Tuple[List[DocumentChunk], Optional[str]]:
        """
        Process a single page's text into section-aware chunks.
        Returns the list of chunks and the latest active section title.
        """
        cleaned_text = cls.clean_text(raw_text)
        if not cleaned_text:
            return [], current_section

        lines = cleaned_text.split("\n")
        chunks: List[DocumentChunk] = []

        # Segment page text by detected headings
        current_title = current_section
        current_buffer: List[str] = []
        chunk_idx = 1

        def flush_buffer(title: Optional[str]):
            nonlocal chunk_idx, current_buffer
            if not current_buffer:
                return

            block_text = "\n".join(current_buffer).strip()
            current_buffer = []

            if not block_text:
                return

            def append_chunk(chunk_content: str) -> None:
                nonlocal chunk_idx
                chunks.append(
                    DocumentChunk(
                        chunk_id=f"chunk-p{page_num}-{chunk_idx:03d}",
                        page_number=page_num,
                        section_title=title,
                        text=chunk_content,
                        char_count=len(chunk_content),
                    )
                )
                chunk_idx += 1

            # If block is larger than TARGET_CHUNK_MAX_CHARS, split into paragraph sub-chunks
            if len(block_text) > TARGET_CHUNK_MAX_CHARS:
                paragraphs = block_text.split("\n\n")
                sub_buf: List[str] = []
                sub_len = 0

                for para in paragraphs:
                    p = para.strip()
                    if not p:
                        continue
                    if sub_len + len(p) > TARGET_CHUNK_MAX_CHARS and sub_buf:
                        sub_text = "\n\n".join(sub_buf).strip()
                        append_chunk(sub_text)
                        sub_buf = [p]
                        sub_len = len(p)
                    else:
                        sub_buf.append(p)
                        sub_len += len(p)

                if sub_buf:
                    sub_text = "\n\n".join(sub_buf).strip()
                    append_chunk(sub_text)
            else:
                append_chunk(block_text)

        for line in lines:
            heading = cls.detect_heading(line)
            if heading:
                # Flush existing buffer under previous heading
                flush_buffer(current_title)
                current_title = heading
                current_buffer.append(line)
            else:
                current_buffer.append(line)

        # Flush any trailing buffer on the page
        flush_buffer(current_title)

        return chunks, current_title

    @classmethod
    def group_chunks_into_sections(cls, chunks: List[DocumentChunk]) -> List[DocumentSection]:
        """
        Group sequential chunks sharing the same section title into DocumentSection instances.
        Provides a structured legal hierarchy: Document -> Sections -> Chunks.
        """
        sections: List[DocumentSection] = []
        current_section: Optional[DocumentSection] = None

        for chunk in chunks:
            title = chunk.section_title or "General Provisions & Preamble"
            if current_section is None or current_section.section_title != title:
                current_section = DocumentSection(
                    section_title=title,
                    page_number=chunk.page_number,
                    chunks=[chunk],
                )
                sections.append(current_section)
            else:
                current_section.chunks.append(chunk)

        return sections

    @classmethod
    def process_pdf(cls, file_bytes: bytes, filename: str, content_type: Optional[str] = "application/pdf") -> DocumentProcessingResponse:
        """
        Validate, extract text page-by-page, detect sections, and produce structured chunks.
        """
        cls.validate_file(filename, file_bytes, content_type)

        try:
            doc = pymupdf.open(stream=file_bytes, filetype="pdf")
        except Exception as exc:
            raise CorruptedPDFError(f"Failed to open PDF document: {str(exc)}") from exc

        try:
            if doc.is_encrypted:
                raise EncryptedPDFError()

            page_count = len(doc)
            if page_count == 0:
                raise CorruptedPDFError("PDF contains 0 pages.")

            if page_count > MAX_PAGE_COUNT:
                raise FileTooLargeError(
                    f"PDF page count ({page_count}) exceeds the maximum allowed limit of {MAX_PAGE_COUNT} pages."
                )

            total_chunks: List[DocumentChunk] = []
            total_text_length = 0
            active_section: Optional[str] = None

            for page_index in range(page_count):
                page = doc.load_page(page_index)
                raw_text = page.get_text("text") or ""
                page_num = page_index + 1

                page_chunks, active_section = cls.chunk_page_text(page_num, raw_text, active_section)
                for chunk in page_chunks:
                    total_chunks.append(chunk)
                    total_text_length += chunk.char_count

                if total_text_length > MAX_EXTRACTED_CHARS:
                    raise FileTooLargeError(
                        f"Extracted document text exceeds the maximum allowable limit of {MAX_EXTRACTED_CHARS} characters."
                    )

            if total_text_length == 0 or len(total_chunks) == 0:
                raise NoExtractableTextError()

            # Group chunks into structured sections
            sections = cls.group_chunks_into_sections(total_chunks)

            # Sanitize filename (prevent directory traversal artifacts)
            clean_filename = os.path.basename(filename)

            return DocumentProcessingResponse(
                filename=clean_filename,
                file_type="application/pdf",
                file_size=len(file_bytes),
                page_count=page_count,
                text_length=total_text_length,
                section_count=len(sections),
                chunk_count=len(total_chunks),
                sections=sections,
                chunks=total_chunks,
            )
        finally:
            doc.close()
