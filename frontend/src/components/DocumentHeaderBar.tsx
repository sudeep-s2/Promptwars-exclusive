import type { DocumentMetadataSummary } from '../types/workspace';

interface DocumentHeaderBarProps {
  metadata: DocumentMetadataSummary;
  isRealDocument?: boolean;
  onReset: () => void;
  onOpenPrepSheet: () => void;
}

export const DocumentHeaderBar = ({
  metadata,
  isRealDocument = false,
  onReset,
  onOpenPrepSheet,
}: DocumentHeaderBarProps) => {
  return (
    <div className="doc-header-card">
      <div className="doc-header-top">
        <div className="doc-identity">
          <div className="doc-badge-row" style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
            <div className="doc-type-badge">{metadata.document_type}</div>
            {isRealDocument ? (
              <span className="file-badge active" style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: '#dcfce7', color: '#15803d', fontWeight: 600 }}>
                ⚡ Real Extracted PDF (PyMuPDF)
              </span>
            ) : (
              <span className="file-badge" style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: '#f1f5f9', color: '#475569', fontWeight: 600 }}>
                📑 Sample Demo Document
              </span>
            )}
          </div>

          <h2 className="doc-title">{metadata.filename}</h2>
          <span className="doc-stats">
            {metadata.page_count} Pages · {metadata.file_size_formatted}
            {metadata.section_count !== undefined && ` · ${metadata.section_count} Sections`}
            {metadata.chunk_count !== undefined && ` · ${metadata.chunk_count} Chunks`}
          </span>
        </div>

        <div className="doc-header-actions">
          <button
            className="btn-prep-sheet"
            onClick={onOpenPrepSheet}
            title="Generate questions to review with legal counsel"
          >
            📋 Attorney Prep Sheet
          </button>
          <button
            className="btn-secondary btn-sm"
            onClick={onReset}
            title="Upload or select another contract"
          >
            ↺ Change Document
          </button>
        </div>
      </div>

      <div className="doc-metadata-grid">
        <div className="meta-block">
          <span className="meta-block-label">{isRealDocument ? 'Document Status' : 'Parties'}</span>
          <span className="meta-block-value">
            {isRealDocument ? (
              <>Live Parsed <span className="meta-sep">•</span> Section-Aware</>
            ) : (
              <>{metadata.parties.first_party} <span className="meta-sep">↔</span> {metadata.parties.second_party}</>
            )}
          </span>
        </div>

        <div className="meta-block">
          <span className="meta-block-label">{isRealDocument ? 'Scope & Length' : 'Effective Date & Term'}</span>
          <span className="meta-block-value">
            {metadata.effective_date} ({metadata.duration})
          </span>
        </div>

        <div className="meta-block">
          <span className="meta-block-label">{isRealDocument ? 'Pipeline Processing' : 'Financial Commitments'}</span>
          <span className="meta-block-value highlight">
            {metadata.financial_summary}
          </span>
        </div>
      </div>
    </div>
  );
};
