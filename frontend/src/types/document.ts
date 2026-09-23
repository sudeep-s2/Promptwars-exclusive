export interface DocumentChunk {
  chunk_id: string;
  page_number: number;
  section_title: string | null;
  text: string;
  char_count: number;
}

export interface DocumentSection {
  section_title: string;
  page_number: number;
  chunks: DocumentChunk[];
}

export interface DocumentMetadata {
  filename: string;
  file_type: string;
  file_size: number;
  page_count: number;
  text_length: number;
  section_count: number;
  chunk_count: number;
}

export interface LegalFinding {
  category:
    | 'Liability'
    | 'Payment'
    | 'Intellectual Property'
    | 'Termination'
    | 'Obligations'
    | 'Boilerplate'
    | 'Confidentiality'
    | 'Governing Law';
  attention_level: 'high' | 'moderate' | 'standard';
  title: string;
  plain_english: string;
  why_it_matters: string;
  page_number: number;
  section_title: string;
  verbatim_excerpt: string;
  citation_valid?: boolean;
}

export interface ExecutiveSummaryData {
  document_type: string;
  parties: string[];
  effective_date: string;
  duration: string;
  financial_summary: string;
  high_level_overview: string;
}

export interface CounselDiscussionPoint {
  clause_ref: string;
  topic: string;
  recommended_question: string;
}

export interface LegalAnalysis {
  executive_summary: ExecutiveSummaryData;
  findings: LegalFinding[];
  counsel_discussion_points: CounselDiscussionPoint[];
  suggested_questions: string[];
}

export interface QAResponse {
  question: string;
  answer: string;
  source_citation: string;
  page_number: number;
  verbatim_excerpt?: string | null;
  source_chunk_id?: string | null;
}

export interface SourceCitation {
  chunk_id: string;
  page_number: number;
  section_title: string;
  text: string;
  similarity_score?: number | null;
}

export interface GroundedAnswerResponse {
  question: string;
  answer: string;
  sources: SourceCitation[];
  grounding_status: 'grounded' | 'insufficient_context';
  confidence_score: number;
}

export interface DocumentProcessingResponse {
  filename: string;
  file_type: string;
  file_size: number;
  page_count: number;
  text_length: number;
  section_count: number;
  chunk_count: number;
  sections: DocumentSection[];
  chunks: DocumentChunk[];
  analysis?: LegalAnalysis | null;
  document_id?: string | null;
  indexing_status?: string | null;
}

export type DocumentUploadResponse = DocumentProcessingResponse;

export type UploadState = 'idle' | 'selected' | 'uploading' | 'success' | 'error';
