import { useState, useRef, useId, type DragEvent, type ChangeEvent } from 'react';
import type { MockLegalDocument } from '../types/workspace';
import { SAMPLE_SERVICES_AGREEMENT, SAMPLE_NDA } from '../data/mockDocuments';

interface DocumentUploadAreaProps {
  onSelectDocument: (doc: MockLegalDocument) => void;
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export const DocumentUploadArea = ({ onSelectDocument }: DocumentUploadAreaProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputId = useId();

  const handleFile = (file: File) => {
    setError(null);

    const isPdfExt = file.name.toLowerCase().endsWith('.pdf');
    if (!isPdfExt) {
      setError(`Unsupported format for '${file.name}'. Only PDF documents (.pdf) are supported.`);
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setError(`File size exceeds the 10 MB limit (${(file.size / (1024 * 1024)).toFixed(2)} MB).`);
      return;
    }

    // Map filename to matching sample document or default to Services Agreement
    if (file.name.toLowerCase().includes('nda')) {
      onSelectDocument(SAMPLE_NDA);
    } else {
      onSelectDocument(SAMPLE_SERVICES_AGREEMENT);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="upload-section">
      <div className="section-header">
        <div>
          <h2 className="section-title">Document Ingestion &amp; Clause Analysis</h2>
          <p className="section-subtitle">
            Upload a PDF contract or pick a pre-loaded sample agreement to explore the visual workspace.
          </p>
        </div>
        <span className="section-badge active">Visual MVP Active</span>
      </div>

      {error && (
        <div className="upload-error-banner" role="alert">
          <span className="error-icon">⚠️</span>
          <div className="error-body">{error}</div>
          <button className="btn-close-error" onClick={() => setError(null)} title="Dismiss">
            ✕
          </button>
        </div>
      )}

      <div
        className={`upload-dropzone ${isDragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
        aria-label="Upload PDF Contract"
      >
        <input
          id={fileInputId}
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".pdf,application/pdf"
          style={{ display: 'none' }}
        />

        <div className="upload-icon-wrapper">📄</div>
        <h3 className="dropzone-title">Click to select or drag &amp; drop PDF</h3>
        <p className="dropzone-description">
          Upload any legal contract, NDA, or vendor agreement up to <strong>10 MB</strong>.
        </p>

        <div className="file-badges">
          <span className="file-badge active">.PDF Only</span>
          <span className="file-badge">Max 10 MB</span>
          <span className="file-badge">In-Memory Analysis</span>
        </div>
      </div>

      {/* Pre-loaded Sample Document Selectors */}
      <div className="sample-documents-wrapper">
        <span className="sample-label">Or instantly test with realistic sample agreements:</span>
        <div className="sample-buttons-row">
          <button
            className="btn-sample"
            onClick={() => onSelectDocument(SAMPLE_SERVICES_AGREEMENT)}
            title="Load Master Services Agreement with uncapped liability and IP clauses"
          >
            <span className="btn-sample-icon">📑</span>
            <div className="btn-sample-content">
              <strong>Master Services Agreement</strong>
              <span>sample_services_agreement.pdf (3 Pages · 7 Clauses)</span>
            </div>
            <span className="btn-sample-arrow">→</span>
          </button>

          <button
            className="btn-sample"
            onClick={() => onSelectDocument(SAMPLE_NDA)}
            title="Load Mutual Non-Disclosure Agreement with confidentiality covenants"
          >
            <span className="btn-sample-icon">🔒</span>
            <div className="btn-sample-content">
              <strong>Mutual Non-Disclosure Agreement</strong>
              <span>sample_nda.pdf (2 Pages · 4 Clauses)</span>
            </div>
            <span className="btn-sample-arrow">→</span>
          </button>
        </div>
      </div>
    </div>
  );
};
