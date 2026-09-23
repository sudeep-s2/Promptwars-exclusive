import type { DocumentSection, DocumentChunk } from './document';

export type AttentionLevel = 'high' | 'moderate' | 'standard';

export type ClauseCategory =
  | 'Liability'
  | 'Payment'
  | 'Intellectual Property'
  | 'Termination'
  | 'Obligations'
  | 'Boilerplate'
  | 'Confidentiality'
  | 'Governing Law';

export interface ClauseFinding {
  id: string;
  attention_level: AttentionLevel;
  category: ClauseCategory;
  title: string;
  plain_english: string;
  why_it_matters: string;
  page_number: number;
  section_title: string;
  verbatim_excerpt: string;
  is_real_extracted?: boolean;
}

export interface DocumentMetadataSummary {
  filename: string;
  document_type: string;
  parties: {
    first_party: string;
    second_party: string;
  };
  effective_date: string;
  duration: string;
  financial_summary: string;
  file_size_formatted: string;
  page_count: number;
  section_count?: number;
  chunk_count?: number;
}

export interface QAPair {
  id: string;
  question: string;
  answer: string;
  source: string;
  page_number: number;
}

export interface CounselPrepPoint {
  clause_ref: string;
  topic: string;
  recommended_question: string;
}

export interface MockLegalDocument {
  id: string;
  filename: string;
  is_real_document?: boolean;
  indexing_status?: string | null;
  metadata: DocumentMetadataSummary;
  executive_summary: string;
  clauses: ClauseFinding[];
  suggested_questions: string[];
  qa_database: QAPair[];
  counsel_prep_sheet: {
    document_title: string;
    generated_date: string;
    discussion_points: CounselPrepPoint[];
  };
  sections?: DocumentSection[];
  raw_chunks?: DocumentChunk[];
}

export type WorkspaceDocument = MockLegalDocument;

export type WorkspaceView = 'landing' | 'processing' | 'workspace';
