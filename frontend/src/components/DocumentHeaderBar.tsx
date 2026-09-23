import type { DocumentMetadataSummary } from '../types/workspace';

interface DocumentHeaderBarProps {
  metadata: DocumentMetadataSummary;
  onReset: () => void;
  onOpenPrepSheet: () => void;
}

export const DocumentHeaderBar = ({
  metadata,
  onReset,
  onOpenPrepSheet,
}: DocumentHeaderBarProps) => {
  return (
    <div className="doc-header-card">
      <div className="doc-header-top">
        <div className="doc-identity">
          <div className="doc-type-badge">{metadata.document_type}</div>
          <h2 className="doc-title">{metadata.filename}</h2>
          <span className="doc-stats">
            {metadata.page_count} Pages · {metadata.file_size_formatted}
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
          <span className="meta-block-label">Parties</span>
          <span className="meta-block-value">
            {metadata.parties.first_party} <span className="meta-sep">↔</span> {metadata.parties.second_party}
          </span>
        </div>

        <div className="meta-block">
          <span className="meta-block-label">Effective Date &amp; Term</span>
          <span className="meta-block-value">
            {metadata.effective_date} ({metadata.duration})
          </span>
        </div>

        <div className="meta-block">
          <span className="meta-block-label">Financial Commitments</span>
          <span className="meta-block-value highlight">
            {metadata.financial_summary}
          </span>
        </div>
      </div>
    </div>
  );
};
