import { useState, useEffect, useCallback } from 'react';
import { getHealthStatus, API_BASE_URL } from '../services/api';
import type { HealthResponse, ConnectionState } from '../types/health';

/**
 * Developer diagnostic probe for backend connection.
 * Completely hidden in production environments.
 */
export const BackendStatusCard = () => {
  // Completely hide developer diagnostic panel in production
  if (!import.meta.env.DEV) {
    return null;
  }

  const [state, setState] = useState<ConnectionState>('idle');
  const [data, setData] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(true);

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
    <aside className="dev-status-panel" aria-label="Development Diagnostics">
      <div className="dev-status-header" onClick={() => setIsCollapsed(!isCollapsed)}>
        <div className="dev-status-pill">
          <span
            className={`status-dot ${
              state === 'connected'
                ? 'status-dot-green'
                : state === 'checking'
                ? 'status-dot-yellow'
                : 'status-dot-red'
            }`}
          />
          <span className="dev-status-title">Dev Diagnostics: {state}</span>
        </div>
        <button
          type="button"
          className="btn-dev-toggle"
          aria-expanded={!isCollapsed}
        >
          {isCollapsed ? 'Show' : 'Hide'}
        </button>
      </div>

      {!isCollapsed && (
        <div className="dev-status-body">
          <div className="data-row">
            <span className="data-key">Target:</span>
            <span className="data-value"><code>{API_BASE_URL}/api/health</code></span>
          </div>
          {data && (
            <>
              <div className="data-row">
                <span className="data-key">Service:</span>
                <span className="data-value">{data.service}</span>
              </div>
              <div className="data-row">
                <span className="data-key">Status:</span>
                <span className="data-value status-ok">{data.status}</span>
              </div>
            </>
          )}
          {lastChecked && (
            <div className="data-row">
              <span className="data-key">Last Probe:</span>
              <span className="data-value">{lastChecked}</span>
            </div>
          )}
          {error && (
            <div className="dev-error-text">
              {error}
            </div>
          )}
          <button
            onClick={checkConnection}
            disabled={state === 'checking'}
            className="btn-dev-retry"
          >
            {state === 'checking' ? 'Testing...' : 'Probe Again'}
          </button>
        </div>
      )}
    </aside>
  );
};
