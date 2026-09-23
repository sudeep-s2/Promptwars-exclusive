from typing import List, Optional
from pydantic import BaseModel, Field


class GroundedQuestionRequest(BaseModel):
    question: str = Field(
        ...,
        min_length=2,
        max_length=1000,
        description="User question about the legal document",
        examples=["What are the payment deadlines?"],
    )


class SourceCitation(BaseModel):
    chunk_id: str = Field(..., description="Preserved canonical chunk ID from document processor")
    page_number: int = Field(..., ge=1, description="1-indexed page number where clause resides")
    section_title: str = Field(..., description="Detected section heading")
    text: str = Field(..., description="Authentic extracted verbatim text from document database")
    similarity_score: Optional[float] = Field(None, description="Cosine similarity score (0.0 to 1.0)")


class GroundedAnswerResponse(BaseModel):
    question: str = Field(..., description="Original user question")
    answer: str = Field(..., description="Grounded, plain-language answer strictly synthesized from retrieved chunks")
    sources: List[SourceCitation] = Field(default_factory=list, description="Resolved authentic source citations")
    grounding_status: str = Field(
        ...,
        description="'grounded' if supported by retrieved clauses; 'insufficient_context' if document does not address the question",
    )
    confidence_score: float = Field(..., ge=0.0, le=1.0, description="Confidence metric reflecting retrieval relevance and grounding")
