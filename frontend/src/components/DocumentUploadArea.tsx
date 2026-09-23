import { useState, useRef, useId, type DragEvent, type ChangeEvent } from 'react';
import type { MockLegalDocument } from '../types/workspace';
import { SAMPLE_SERVICES_AGREEMENT, SAMPLE_NDA } from '../data/mockDocuments';

interface DocumentUploadAreaProps {
  onSelectSample: (doc: MockLegalDocument) => void;
  onUploadFile: (file: File) => void;
  externalError?: string | null;
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export const DocumentUploadArea = ({
  onSelectSample,
  onUploadFile,
  externalError,
}: DocumentUploadAreaProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [internalError, setInternalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputId = useId();

  const activeError = externalError || internalError;

  const handleFile = (file: File) => {
    setInternalError(null);

    if (file.size === 0) {
      setInternalError(`The selected file '${file.name}' is empty (0 bytes).`);
      return;
    }

    const isPdfExt = file.name.toLowerCase().endsWith('.pdf');
    if (!isPdfExt) {
      setInternalError(`Unsupported format for '${file.name}'. Only PDF documents (.pdf) are supported.`);
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setInternalError(`File size exceeds the 10 MB limit (${(file.size / (1024 * 1024)).toFixed(2)} MB).`);
      return;
    }

    // Pass valid file to the real backend upload pipeline
    onUploadFile(file);
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
            Upload your PDF contract for real-time parsing with PyMuPDF, or test instantly with realistic pre-loaded sample agreements.
          </p>
        </div>
        <span className="section-badge active">Live PDF Pipeline Ready</span>
      </div>

      {activeError && (
        <div className="upload-error-banner" role="alert">
          <span className="error-icon">⚠️</span>
          <div className="error-body">{activeError}</div>
          <button className="btn-close-error" onClick={() => setInternalError(null)} title="Dismiss">
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
        <h3 className="dropzone-title">Click to upload or drag &amp; drop PDF</h3>
        <p className="dropzone-description">
          Upload any legal contract, NDA, or vendor agreement up to <strong>10 MB</strong>.
        </p>

        <div className="file-badges">
          <span className="file-badge active">.PDF Only</span>
          <span className="file-badge">Max 10 MB</span>
          <span className="file-badge">In-Memory Extraction</span>
        </div>
      </div>

      {/* Pre-loaded Sample Document Selectors */}
      <div className="sample-documents-wrapper">
        <span className="sample-label">Or test with realistic pre-loaded sample agreements:</span>
        <div className="sample-buttons-row">
          <button
            className="btn-sample"
            onClick={() => onSelectSample(SAMPLE_SERVICES_AGREEMENT)}
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
            onClick={() => onSelectSample(SAMPLE_NDA)}
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
