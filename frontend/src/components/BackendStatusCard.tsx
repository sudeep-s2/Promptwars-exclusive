import { useState, useEffect, useCallback } from 'react';
import { getHealthStatus, API_BASE_URL } from '../services/api';
import type { HealthResponse, ConnectionState } from '../types/health';

export const BackendStatusCard = () => {
  const [state, setState] = useState<ConnectionState>('idle');
  const [data, setData] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<string | null>(null);

  const checkConnection = useCallback(async () => {
    setState('checking');
    setError(null);
    try {
      const response = await getHealthStatus();
      setData(response);
      setState('connected');
      setLastChecked(new Date().toLocaleTimeString());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown network error');
      setData(null);
      setState('error');
      setLastChecked(new Date().toLocaleTimeString());
    }
  }, []);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  return (
    <div className="status-card">
      <div className="status-card-header">
        <div className="status-card-title-group">
          <span className="card-badge">REST API Test</span>
          <h2 className="status-card-title">Backend Connection Status</h2>
        </div>
        <button
          onClick={checkConnection}
          disabled={state === 'checking'}
          className="btn-refresh"
          title="Re-run health check probe"
        >
          {state === 'checking' ? 'Testing...' : 'Test Connection'}
        </button>
      </div>

      <div className="status-content">
        <div className="status-indicator-row">
          <div className="status-pill-container">
            <span
              className={`status-dot ${
                state === 'connected'
                  ? 'status-dot-green'
                  : state === 'checking'
                  ? 'status-dot-yellow'
                  : state === 'error'
                  ? 'status-dot-red'
                  : 'status-dot-gray'
              }`}
            />
            <span className="status-label">
              {state === 'connected' && 'Connected'}
              {state === 'checking' && 'Connecting...'}
              {state === 'error' && 'Disconnected'}
              {state === 'idle' && 'Idle'}
            </span>
          </div>

          <span className="status-meta">
            Target: <code>{API_BASE_URL}/api/health</code>
          </span>
        </div>

        {state === 'connected' && data && (
          <div className="status-success-details">
            <div className="data-row">
              <span className="data-key">Service:</span>
              <span className="data-value highlight">{data.service}</span>
            </div>
            <div className="data-row">
              <span className="data-key">Operational Status:</span>
              <span className="data-value status-ok">{data.status}</span>
            </div>
            {lastChecked && (
              <div className="data-row">
                <span className="data-key">Last Probe:</span>
                <span className="data-value">{lastChecked}</span>
              </div>
            )}
          </div>
        )}

        {state === 'error' && (
          <div className="status-error-details">
            <div className="error-message">
              <strong>Connection Error:</strong> {error}
            </div>
            <p className="error-hint">
              Ensure the FastAPI backend is running on <code>{API_BASE_URL}</code>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
