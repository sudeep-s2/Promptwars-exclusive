import type { DocumentMetadataSummary } from '../types/workspace';

interface DocumentHeaderBarProps {
  metadata: DocumentMetadataSummary;
  isRealDocument?: boolean;
  onReset: () => void;
  onOpenPrepSheet: () => void;
}

export const DocumentHeaderBar = ({
  metadata,
  onReset,
  onOpenPrepSheet,
}: DocumentHeaderBarProps) => {
  return (
    <section className="doc-header-card" aria-label="Document Metadata">
      <div className="doc-header-top">
        <div className="doc-identity">
          <div className="doc-type-pill">{metadata.document_type || 'Legal Agreement'}</div>
          <h2 className="doc-title" title={metadata.filename}>{metadata.filename}</h2>
          <div className="doc-stats">
            <span>{metadata.page_count} {metadata.page_count === 1 ? 'Page' : 'Pages'}</span>
            <span className="doc-stat-sep">•</span>
            <span>{metadata.file_size_formatted}</span>
            {metadata.section_count !== undefined && metadata.section_count > 0 && (
              <>
                <span className="doc-stat-sep">•</span>
                <span>{metadata.section_count} Sections</span>
              </>
            )}
          </div>
        </div>

        <div className="doc-header-actions">
          <button
            type="button"
            className="btn-prep-sheet"
            onClick={onOpenPrepSheet}
            title="Open questions to discuss with legal counsel"
          >
            <span className="btn-icon" aria-hidden="true">📋</span>
            <span>Questions for Counsel</span>
          </button>
          <button
            type="button"
            className="btn-secondary btn-sm"
            onClick={onReset}
            title="Upload another document"
          >
            <span>Upload New Document</span>
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
            {metadata.effective_date} <span className="meta-sep">·</span> {metadata.duration}
          </span>
        </div>

        <div className="meta-block">
          <span className="meta-block-label">Financial &amp; Key Commitments</span>
          <span className="meta-block-value highlight">
            {metadata.financial_summary}
          </span>
        </div>
      </div>
    </section>
  );
};
