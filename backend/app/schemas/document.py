from typing import Optional, List
from pydantic import BaseModel, Field


class DocumentChunk(BaseModel):
    """Schema representing an extracted, section-aware document chunk."""
    chunk_id: str = Field(..., description="Deterministic unique identifier for the chunk", examples=["chunk-p1-001"])
    page_number: int = Field(..., description="1-indexed page number where the chunk originated", examples=[1])
    section_title: Optional[str] = Field(None, description="Detected legal heading or section title", examples=["1. Definitions"])
    text: str = Field(..., description="Extracted clean text content of the chunk")
    char_count: int = Field(..., description="Character count of the chunk text", examples=[482])


class DocumentMetadata(BaseModel):
    """Metadata summary of the processed document."""
    filename: str = Field(..., description="Sanitized original filename", examples=["contract.pdf"])
    file_type: str = Field(..., description="MIME type of the file", examples=["application/pdf"])
    file_size: int = Field(..., description="Size in bytes", examples=[104857])
    page_count: int = Field(..., description="Total pages in the PDF", examples=[3])
    text_length: int = Field(..., description="Total extracted text length in characters", examples=[4210])
    chunk_count: int = Field(..., description="Total number of chunks produced", examples=[8])


class DocumentUploadResponse(BaseModel):
    """Response payload returned upon successful document upload and chunking."""
    filename: str = Field(..., description="Sanitized original filename", examples=["contract.pdf"])
    file_type: str = Field(..., description="MIME type of the file", examples=["application/pdf"])
    file_size: int = Field(..., description="Size in bytes", examples=[104857])
    page_count: int = Field(..., description="Total pages in the PDF", examples=[3])
    text_length: int = Field(..., description="Total extracted text length in characters", examples=[4210])
    chunk_count: int = Field(..., description="Total number of chunks produced", examples=[8])
    chunks: List[DocumentChunk] = Field(..., description="Ordered list of section-aware document chunks")
