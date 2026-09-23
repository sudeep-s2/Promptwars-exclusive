export interface DocumentChunk {
  chunk_id: string;
  page_number: number;
  section_title: string | null;
  text: string;
  char_count: number;
}

export interface DocumentUploadResponse {
  filename: string;
  file_type: string;
  file_size: number;
  page_count: number;
  text_length: number;
  chunk_count: number;
  chunks: DocumentChunk[];
}

export type UploadState = 'idle' | 'selected' | 'uploading' | 'success' | 'error';
