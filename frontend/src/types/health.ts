export interface HealthResponse {
  status: string;
  service: string;
}

export type ConnectionState = 'idle' | 'checking' | 'connected' | 'error';
