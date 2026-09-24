import type { HealthResponse } from '../types/health';
import type { DocumentProcessingResponse, DocumentChunk, QAResponse, GroundedAnswerResponse } from '../types/document';

const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

/**
 * Fetch operational status from the backend health check endpoint.
 */
export async function getHealthStatus(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE_URL}/api/health`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Health check request failed with status: ${response.status} ${response.statusText}`);
  }

  const data: HealthResponse = await response.json();
  return data;
}

/**
 * Helper to parse backend error responses cleanly.
 */
async function parseErrorDetail(response: Response, defaultPrefix: string): Promise<string> {
  let errorMessage = `${defaultPrefix} (${response.status} ${response.statusText})`;
  try {
    const errorJson = await response.json();
    if (errorJson && typeof errorJson.detail === 'string') {
      errorMessage = errorJson.detail;
    }
  } catch {
    // Fallback if JSON parsing fails
  }
  return errorMessage;
}

/**
 * Upload a PDF document for validation, text extraction, and section-aware chunking.
 * Optionally runs structured legal analysis with the configured LLM provider.
 * Uses native FormData without setting Content-Type so boundary is set automatically.
 */
export async function uploadDocument(
  file: File,
  analyze: boolean = true
): Promise<DocumentProcessingResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const endpoint = `${API_BASE_URL}/api/documents/upload?analyze=${analyze}`;
  const response = await fetch(endpoint, {
    method: 'POST',
    body: formData,
    headers: {
      'Accept': 'application/json',
      // DO NOT set 'Content-Type': browser sets multipart/form-data with boundary automatically
    },
  });

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, 'Upload failed'));
  }

  const data: DocumentProcessingResponse = await response.json();
  return data;
}

/**
 * Query the active LLM provider with a grounded natural language question.
 */
export async function askQuestion(
  question: string,
  chunks: DocumentChunk[]
): Promise<QAResponse> {
  const response = await fetch(`${API_BASE_URL}/api/documents/qa`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ question, chunks }),
  });

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, 'Q&A query failed'));
  }

  const data: QAResponse = await response.json();
  return data;
}

/**
 * Query indexed document chunks in PostgreSQL + pgvector via RAG endpoint.
 */
export async function askDocumentQuestion(
  documentId: string,
  question: string
): Promise<GroundedAnswerResponse> {
  const response = await fetch(`${API_BASE_URL}/api/documents/${documentId}/questions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: JSON.stringify({ question }),
  });

  if (!response.ok) {
    throw new Error(await parseErrorDetail(response, 'RAG Q&A query failed'));
  }

  const data: GroundedAnswerResponse = await response.json();
  return data;
}

export { API_BASE_URL };
