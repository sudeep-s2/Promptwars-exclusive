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
}

export type DocumentUploadResponse = DocumentProcessingResponse;

export type UploadState = 'idle' | 'selected' | 'uploading' | 'success' | 'error';
