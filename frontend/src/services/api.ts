import type { HealthResponse } from '../types/health';
import type { DocumentProcessingResponse } from '../types/document';

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
 * Upload a PDF document for validation, text extraction, and section-aware chunking.
 * Uses native FormData without setting Content-Type so boundary is set automatically.
 */
export async function uploadDocument(file: File): Promise<DocumentProcessingResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/api/documents/upload`, {
    method: 'POST',
    body: formData,
    headers: {
      'Accept': 'application/json',
      // DO NOT set 'Content-Type': browser sets multipart/form-data with boundary automatically
    },
  });

  if (!response.ok) {
    // Attempt to extract structured detail from backend response
    let errorMessage = `Upload failed (${response.status} ${response.statusText})`;
    try {
      const errorJson = await response.json();
      if (errorJson && typeof errorJson.detail === 'string') {
        errorMessage = errorJson.detail;
      }
    } catch {
      // Use fallback status text if body is not JSON
    }
    throw new Error(errorMessage);
  }

  const data: DocumentProcessingResponse = await response.json();
  return data;
}

export { API_BASE_URL };
