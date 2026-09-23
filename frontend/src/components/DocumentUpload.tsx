import { useState, useRef, useId, type DragEvent, type ChangeEvent } from 'react';
import { uploadDocument } from '../services/api';
import type { DocumentUploadResponse, UploadState } from '../types/document';

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export const DocumentUpload = () => {
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<UploadState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DocumentUploadResponse | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [expandedChunks, setExpandedChunks] = useState<Record<string, boolean>>({});
  const [copiedChunkId, setCopiedChunkId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const fileInputId = useId();

  const validateAndSetFile = (selectedFile: File) => {
    setError(null);

    // Validate file extension and MIME
    const isPdfExt = selectedFile.name.toLowerCase().endsWith('.pdf');
    const isPdfMime = selectedFile.type === 'application/pdf' || selectedFile.type === '';

    if (!isPdfExt || !isPdfMime) {
      setError(`Unsupported file '${selectedFile.name}'. Only PDF documents (.pdf) are supported in Phase 2.`);
      setState('error');
      setFile(null);
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE_BYTES) {
      setError(`File size (${formatBytes(selectedFile.size)}) exceeds the maximum allowed limit of 10 MB.`);
      setState('error');
      setFile(null);
      return;
    }

    if (selectedFile.size === 0) {
      setError('The selected PDF file is empty (0 bytes). Please choose a valid document.');
      setState('error');
      setFile(null);
      return;
    }

    setFile(selectedFile);
    setState('selected');
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
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
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setState('uploading');
    setError(null);

    try {
      const response = await uploadDocument(file);
      setResult(response);
      setState('success');
      // Expand first 3 chunks by default for immediate preview
      const initialExpanded: Record<string, boolean> = {};
      response.chunks.slice(0, 3).forEach((chunk) => {
        initialExpanded[chunk.chunk_id] = true;
      });
      setExpandedChunks(initialExpanded);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during upload.');
      setState('error');
    }
  };

  const handleReset = () => {
    setFile(null);
    setResult(null);
    setError(null);
    setState('idle');
    setSearchFilter('');
    setExpandedChunks({});
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const toggleChunkExpand = (chunkId: string) => {
    setExpandedChunks((prev) => ({
      ...prev,
      [chunkId]: !prev[chunkId],
    }));
  };

  const toggleAllChunks = (expand: boolean) => {
    if (!result) return;
    const newExpanded: Record<string, boolean> = {};
    result.chunks.forEach((c) => {
      newExpanded[c.chunk_id] = expand;
    });
    setExpandedChunks(newExpanded);
  };

  const copyChunkText = async (chunkId: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedChunkId(chunkId);
      setTimeout(() => setCopiedChunkId(null), 2000);
    } catch {
      // Fallback or ignore if clipboard is unavailable
    }
  };

  // Filter chunks by search term in text or section title
  const filteredChunks = result?.chunks.filter((chunk) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    const sectionMatch = chunk.section_title?.toLowerCase().includes(q);
    const textMatch = chunk.text.toLowerCase().includes(q);
    const chunkIdMatch = chunk.chunk_id.toLowerCase().includes(q);
    return sectionMatch || textMatch || chunkIdMatch;
  });

  return (
    <section className="upload-section">
      <div className="section-header">
        <div>
          <h2 className="section-title">Legal Document Ingestion &amp; Chunking</h2>
          <p className="section-subtitle">
            Upload PDF contracts, agreements, or regulatory texts to extract and segment clauses.
          </p>
        </div>
        <span className="section-badge active">Phase 2 Active</span>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="upload-error-banner" role="alert">
          <div className="error-icon">⚠️</div>
          <div className="error-body">
            <strong>Processing Error:</strong> {error}
          </div>
          <button className="btn-close-error" onClick={() => setError(null)} title="Dismiss">
            ✕
          </button>
        </div>
      )}

      {/* Upload Zone (shown when not in success view) */}
      {state !== 'success' && (
        <div className="upload-container">
          <div
            className={`upload-dropzone ${isDragging ? 'dragging' : ''} ${state === 'uploading' ? 'uploading' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => state !== 'uploading' && fileInputRef.current?.click()}
          >
            <input
              id={fileInputId}
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,application/pdf"
              style={{ display: 'none' }}
              disabled={state === 'uploading'}
            />

            <div className="upload-icon-wrapper">
              {state === 'uploading' ? '⏳' : '📑'}
            </div>

            {state === 'uploading' ? (
              <div className="uploading-state-content">
                <h3 className="dropzone-title">Processing Legal Document...</h3>
                <p className="dropzone-description">
                  Extracting text pages with PyMuPDF, cleaning formatting, and detecting legal sections.
                </p>
                <div className="loading-spinner-bar">
                  <div className="spinner-progress" />
                </div>
              </div>
            ) : file ? (
              <div className="file-selected-info">
                <h3 className="dropzone-title">File Ready for Processing</h3>
                <div className="file-meta-pill">
                  <span className="file-name">{file.name}</span>
                  <span className="file-size">({formatBytes(file.size)})</span>
                </div>
                <p className="dropzone-hint">Click or drop another PDF to change file</p>
              </div>
            ) : (
              <div className="dropzone-prompt">
                <h3 className="dropzone-title">Click to select or drag &amp; drop PDF</h3>
                <p className="dropzone-description">
                  Strictly PDF documents up to <strong>10 MB</strong>. Scanned PDFs without extractable text are rejected.
                </p>
                <div className="file-badges">
                  <span className="file-badge active">.PDF Only</span>
                  <span className="file-badge">Max 10 MB</span>
                </div>
              </div>
            )}
          </div>

          {/* Action Button Bar */}
          {state !== 'uploading' && (
            <div className="upload-actions">
              {file && (
                <>
                  <button className="btn-secondary" onClick={handleReset}>
                    Clear Selection
                  </button>
                  <button className="btn-primary" onClick={handleUpload}>
                    Process Document
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Success View: Document Information & Chunks Viewer */}
      {state === 'success' && result && (
        <div className="results-container">
          {/* Metadata Card */}
          <div className="metadata-card">
            <div className="metadata-card-header">
              <div>
                <span className="meta-badge">Ingestion Complete</span>
                <h3 className="metadata-title">{result.filename}</h3>
              </div>
              <button className="btn-secondary btn-sm" onClick={handleReset}>
                Upload Another Document
              </button>
            </div>

            <div className="metadata-grid">
              <div className="meta-item">
                <span className="meta-label">File Size</span>
                <span className="meta-value">{formatBytes(result.file_size)}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Page Count</span>
                <span className="meta-value">{result.page_count} {result.page_count === 1 ? 'Page' : 'Pages'}</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Extracted Text</span>
                <span className="meta-value">{result.text_length.toLocaleString()} chars</span>
              </div>
              <div className="meta-item">
                <span className="meta-label">Structured Chunks</span>
                <span className="meta-value highlight">{result.chunk_count}</span>
              </div>
            </div>
          </div>

          {/* Chunks Inspector */}
          <div className="chunks-inspector">
            <div className="inspector-controls">
              <div className="search-box">
                <input
                  type="text"
                  placeholder="Filter chunks by section, text, or ID..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="search-input"
                />
                {searchFilter && (
                  <button className="btn-clear-search" onClick={() => setSearchFilter('')}>
                    ✕
                  </button>
                )}
              </div>

              <div className="inspector-actions">
                <button className="btn-ghost btn-sm" onClick={() => toggleAllChunks(true)}>
                  Expand All
                </button>
                <button className="btn-ghost btn-sm" onClick={() => toggleAllChunks(false)}>
                  Collapse All
                </button>
              </div>
            </div>

            <div className="chunks-list">
              {filteredChunks && filteredChunks.length > 0 ? (
                filteredChunks.map((chunk) => {
                  const isExpanded = !!expandedChunks[chunk.chunk_id];
                  const isCopied = copiedChunkId === chunk.chunk_id;

                  return (
                    <div key={chunk.chunk_id} className={`chunk-card ${isExpanded ? 'expanded' : ''}`}>
                      <div
                        className="chunk-header"
                        onClick={() => toggleChunkExpand(chunk.chunk_id)}
                      >
                        <div className="chunk-header-left">
                          <span className="chunk-id-badge">{chunk.chunk_id}</span>
                          <span className="page-badge">Page {chunk.page_number}</span>
                          {chunk.section_title ? (
                            <span className="section-badge-item" title={chunk.section_title}>
                              Section: <strong>{chunk.section_title}</strong>
                            </span>
                          ) : (
                            <span className="section-badge-item general">General Content</span>
                          )}
                        </div>

                        <div className="chunk-header-right">
                          <span className="char-count">{chunk.char_count} chars</span>
                          <span className="expand-indicator">{isExpanded ? '▲' : '▼'}</span>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="chunk-body">
                          <div className="chunk-toolbar">
                            <button
                              className="btn-copy"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyChunkText(chunk.chunk_id, chunk.text);
                              }}
                            >
                              {isCopied ? '✓ Copied' : '📋 Copy Chunk'}
                            </button>
                          </div>
                          <pre className="chunk-text">{chunk.text}</pre>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="no-chunks-found">
                  <p>No chunks match your search query &ldquo;{searchFilter}&rdquo;.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
