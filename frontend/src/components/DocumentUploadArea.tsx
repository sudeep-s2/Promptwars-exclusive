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
      setInternalError(`Unsupported file format. Please upload a PDF document (.pdf).`);
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setInternalError(`File size exceeds the 10 MB limit (${(file.size / (1024 * 1024)).toFixed(1)} MB).`);
      return;
    }

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
    <div className="upload-container">
      {activeError && (
        <div className="upload-error-banner" role="alert">
          <span className="error-icon" aria-hidden="true">⚠️</span>
          <div className="error-body">{activeError}</div>
          <button
            className="btn-close-error"
            onClick={() => setInternalError(null)}
            title="Dismiss error"
            aria-label="Dismiss error"
          >
            ✕
          </button>
        </div>
      )}

      {/* Primary Upload Action */}
      <div
        className={`upload-dropzone ${isDragging ? 'dragging' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        aria-label="Upload legal document in PDF format, up to 10 megabytes"
      >
        <input
          id={fileInputId}
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".pdf,application/pdf"
          style={{ display: 'none' }}
        />

        <div className="dropzone-icon" aria-hidden="true">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="18" x2="12" y2="12" />
            <line x1="9" y1="15" x2="15" y2="15" />
          </svg>
        </div>

        <h2 className="dropzone-headline">Upload legal document</h2>
        <p className="dropzone-subhead">
          Drag and drop your contract here, or <span className="dropzone-browse">browse files</span>
        </p>

        <span className="dropzone-meta">PDF • up to 10 MB</span>
      </div>

      {/* Explore a Sample Document */}
      <div className="sample-section">
        <span className="sample-section-label">Or explore a sample document</span>
        <div className="sample-grid">
          <button
            type="button"
            className="sample-card"
            onClick={() => onSelectSample(SAMPLE_SERVICES_AGREEMENT)}
            title="Load Master Services Agreement sample"
          >
            <div className="sample-card-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            </div>
            <div className="sample-card-info">
              <span className="sample-card-title">Services Agreement</span>
              <span className="sample-card-desc">Commercial MSA • 3 Pages • 7 Clauses</span>
            </div>
            <span className="sample-card-arrow" aria-hidden="true">→</span>
          </button>

          <button
            type="button"
            className="sample-card"
            onClick={() => onSelectSample(SAMPLE_NDA)}
            title="Load Non-Disclosure Agreement sample"
          >
            <div className="sample-card-icon" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <div className="sample-card-info">
              <span className="sample-card-title">Non-Disclosure Agreement</span>
              <span className="sample-card-desc">Mutual NDA • 2 Pages • 4 Clauses</span>
            </div>
            <span className="sample-card-arrow" aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </div>
  );
};
