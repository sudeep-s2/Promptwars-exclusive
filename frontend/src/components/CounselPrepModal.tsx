import { useState } from 'react';
import type { CounselPrepPoint } from '../types/workspace';

interface CounselPrepModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentTitle: string;
  generatedDate: string;
  discussionPoints: CounselPrepPoint[];
}

export const CounselPrepModal = ({
  isOpen,
  onClose,
  documentTitle,
  generatedDate,
  discussionPoints,
}: CounselPrepModalProps) => {
  const [isCopied, setIsCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    const text = [
      `============================================================`,
      `QUESTIONS TO DISCUSS WITH LEGAL COUNSEL`,
      `Document: ${documentTitle}`,
      `Date: ${generatedDate}`,
      `Notice: For consultation preparation only. Does not constitute legal advice.`,
      `============================================================`,
      ``,
      `PRIORITIZED DISCUSSION POINTS:`,
      `------------------------------------------------------------`,
      ...discussionPoints.map(
        (item, idx) =>
          `${idx + 1}. [${item.clause_ref}] ${item.topic}\n   RECOMMENDED QUESTION: ${item.recommended_question}\n`
      ),
      `============================================================`,
    ].join('\n');

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        throw new Error('Clipboard API not supported');
      }
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2200);
    } catch {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2200);
      } catch (err) {
        console.error('Copy to clipboard failed:', err);
      }
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <h2 id="modal-title" className="modal-title">
              Questions to discuss with legal counsel
            </h2>
            <p className="modal-subtitle">
              Prioritized discussion topics formulated from this document to help make your attorney consultation focused and efficient.
            </p>
          </div>
          <button
            type="button"
            className="btn-close-modal"
            onClick={onClose}
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        <div className="modal-meta-bar">
          <span><strong>Document:</strong> {documentTitle}</span>
          <span><strong>Date:</strong> {generatedDate}</span>
          <span><strong>Questions:</strong> {discussionPoints.length} Items</span>
        </div>

        <div className="modal-body">
          <div className="prep-notice-banner" role="note">
            <span className="prep-notice-icon" aria-hidden="true">ℹ️</span>
            <span>
              <strong>Consultation Preparation:</strong> These questions highlight key risk allocations and obligations in the agreement. They are intended for consultation preparation and do not constitute legal advice.
            </span>
          </div>

          <div className="prep-questions-list">
            {discussionPoints.map((item, index) => (
              <div key={`${item.clause_ref}-${index}`} className="prep-question-card">
                <div className="prep-card-header">
                  <span className="prep-number">{index + 1}</span>
                  <span className="prep-clause-ref">{item.clause_ref}</span>
                  <span className="prep-topic-tag">{item.topic}</span>
                </div>
                <div className="prep-question-body">
                  <p className="prep-prompt">
                    &ldquo;{item.recommended_question}&rdquo;
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
          <button type="button" className="btn-primary" onClick={handleCopy}>
            {isCopied ? '✓ Copied to Clipboard' : '📋 Copy Questions for Counsel'}
          </button>
        </div>
      </div>
    </div>
  );
};
