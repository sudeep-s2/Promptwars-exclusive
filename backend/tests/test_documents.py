import io
import pytest
import pymupdf
from fastapi.testclient import TestClient
from app.main import app
from app.services.document_processor import (
    DocumentProcessor,
    UnsupportedFileTypeError,
    FileTooLargeError,
    CorruptedPDFError,
    NoExtractableTextError,
)

client = TestClient(app)


def create_in_memory_pdf(pages_text: list[str]) -> bytes:
    """Helper to generate in-memory PDF bytes with PyMuPDF."""
    doc = pymupdf.open()
    for text in pages_text:
        page = doc.new_page()
        if text:
            page.insert_text((50, 72), text)
    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes


# ---------------------------------------------------------------------------
# Unit Tests for DocumentProcessor Service
# ---------------------------------------------------------------------------

def test_validate_file_invalid_extension():
    with pytest.raises(UnsupportedFileTypeError) as exc:
        DocumentProcessor.validate_file("document.docx", b"%PDF-1.4 dummy", "application/pdf")
    assert "Unsupported file format" in str(exc.value)


def test_validate_file_invalid_mime_type():
    with pytest.raises(UnsupportedFileTypeError) as exc:
        DocumentProcessor.validate_file("document.pdf", b"%PDF-1.4 dummy", "text/plain")
    assert "Invalid MIME type" in str(exc.value)


def test_validate_file_too_large():
    oversized_bytes = b"%PDF" + (b"0" * (10 * 1024 * 1024 + 10))
    with pytest.raises(FileTooLargeError) as exc:
        DocumentProcessor.validate_file("large.pdf", oversized_bytes, "application/pdf")
    assert "exceeds maximum 10 MB limit" in str(exc.value)


def test_validate_file_empty_bytes():
    with pytest.raises(CorruptedPDFError) as exc:
        DocumentProcessor.validate_file("empty.pdf", b"", "application/pdf")
    assert "0 bytes" in str(exc.value)


def test_validate_file_missing_pdf_magic():
    with pytest.raises(CorruptedPDFError) as exc:
        DocumentProcessor.validate_file("fake.pdf", b"This is not a real PDF header", "application/pdf")
    assert "missing %PDF header" in str(exc.value)


def test_section_heading_heuristics():
    assert DocumentProcessor.detect_heading("1. Definitions") == "1. Definitions"
    assert DocumentProcessor.detect_heading("2.1 Payment Terms") == "2.1 Payment Terms"
    assert DocumentProcessor.detect_heading("SECTION 5 — CONFIDENTIALITY") == "SECTION 5 — CONFIDENTIALITY"
    assert DocumentProcessor.detect_heading("ARTICLE VI — DISPUTES") == "ARTICLE VI — DISPUTES"
    assert DocumentProcessor.detect_heading("TERMINATION") == "TERMINATION"
    assert DocumentProcessor.detect_heading("GOVERNING LAW") == "GOVERNING LAW"
    assert DocumentProcessor.detect_heading("Just normal paragraph text discussing terms.") is None


def test_text_cleaning():
    raw = "This is an obliga-\ntion of the parties.\n\n\n\nRepeated blank lines."
    cleaned = DocumentProcessor.clean_text(raw)
    assert "obligation" in cleaned
    assert "\n\n\n" not in cleaned


def test_pdf_with_no_extractable_text():
    # Empty page with 0 text
    blank_pdf = create_in_memory_pdf([""])
    with pytest.raises(NoExtractableTextError):
        DocumentProcessor.process_pdf(blank_pdf, "blank.pdf")


def test_multi_page_pdf_processing():
    p1 = "1. Definitions\nAffiliate means any entity controlling or controlled by a party."
    p2 = "2. Confidentiality\nEach party shall protect Proprietary Information with reasonable care."
    pdf_bytes = create_in_memory_pdf([p1, p2])

    result = DocumentProcessor.process_pdf(pdf_bytes, "nda_sample.pdf")
    assert result.page_count == 2
    assert result.chunk_count >= 2
    assert result.filename == "nda_sample.pdf"
    assert result.chunks[0].page_number == 1
    assert result.chunks[0].chunk_id == "chunk-p1-001"
    assert "Definitions" in (result.chunks[0].section_title or "")
    assert result.chunks[1].page_number == 2
    assert result.chunks[1].chunk_id == "chunk-p2-001"
    assert "Confidentiality" in (result.chunks[1].section_title or "")


# ---------------------------------------------------------------------------
# API Integration Tests for POST /api/documents/upload
# ---------------------------------------------------------------------------

def test_api_upload_valid_pdf():
    p1_text = (
        "CONFIDENTIALITY AGREEMENT\n\n"
        "1. Definitions\n"
        "Confidential Information shall include all proprietary technical data.\n\n"
        "2. Payment Terms\n"
        "All invoices shall be payable net 30 days from receipt.\n"
    )
    pdf_bytes = create_in_memory_pdf([p1_text])

    response = client.post(
        "/api/documents/upload",
        files={"file": ("contract.pdf", io.BytesIO(pdf_bytes), "application/pdf")},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["filename"] == "contract.pdf"
    assert data["file_type"] == "application/pdf"
    assert data["page_count"] == 1
    assert data["chunk_count"] >= 2
    assert len(data["chunks"]) == data["chunk_count"]

    first_chunk = data["chunks"][0]
    assert first_chunk["chunk_id"] == "chunk-p1-001"
    assert first_chunk["page_number"] == 1
    assert first_chunk["char_count"] > 0
    assert "text" in first_chunk


def test_api_upload_unsupported_file_extension():
    response = client.post(
        "/api/documents/upload",
        files={"file": ("notes.txt", io.BytesIO(b"Legal agreement text"), "text/plain")},
    )
    assert response.status_code == 415
    assert "Only PDF documents" in response.json()["detail"]


def test_api_upload_docx_rejected():
    response = client.post(
        "/api/documents/upload",
        files={"file": ("agreement.docx", io.BytesIO(b"PK\x03\x04 fake docx"), "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
    )
    assert response.status_code == 415
    assert "Only PDF documents" in response.json()["detail"]


def test_api_upload_empty_file():
    response = client.post(
        "/api/documents/upload",
        files={"file": ("empty.pdf", io.BytesIO(b""), "application/pdf")},
    )
    assert response.status_code == 400
    assert "0 bytes" in response.json()["detail"]


def test_api_upload_corrupted_pdf():
    response = client.post(
        "/api/documents/upload",
        files={"file": ("corrupt.pdf", io.BytesIO(b"%PDF-corrupted-gibberish"), "application/pdf")},
    )
    assert response.status_code == 400
    assert "cannot be opened" in response.json()["detail"] or "Failed to open" in response.json()["detail"]


def test_api_upload_no_text_pdf():
    blank_pdf = create_in_memory_pdf([""])
    response = client.post(
        "/api/documents/upload",
        files={"file": ("blank.pdf", io.BytesIO(blank_pdf), "application/pdf")},
    )
    assert response.status_code == 422
    assert "no extractable text" in response.json()["detail"]


def test_api_upload_oversized_file():
    big_content = b"%PDF" + b"A" * (10 * 1024 * 1024 + 100)
    response = client.post(
        "/api/documents/upload",
        files={"file": ("huge.pdf", io.BytesIO(big_content), "application/pdf")},
    )
    assert response.status_code == 413
    assert "exceeds maximum 10 MB limit" in response.json()["detail"]
