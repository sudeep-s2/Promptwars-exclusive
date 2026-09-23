interface ExecutiveSummaryCardProps {
  summary: string;
  isRealDocument?: boolean;
}

export const ExecutiveSummaryCard = ({ summary, isRealDocument = false }: ExecutiveSummaryCardProps) => {
  return (
    <div className="executive-summary-card">
      <div className="summary-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="summary-badge">
            {isRealDocument ? '✦ Document Extraction & Structure' : '✦ LexLens Executive Summary'}
          </span>
          {isRealDocument && (
            <span style={{ fontSize: '11px', background: '#e0e7ff', color: '#3730a3', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
              Live Parsing
            </span>
          )}
        </div>
        <span className="summary-hint">
          {isRealDocument ? 'Section-Aware Ingestion Overview' : 'Plain-Language Overview'}
        </span>
      </div>
      <p className="summary-body">{summary}</p>
    </div>
  );
};
