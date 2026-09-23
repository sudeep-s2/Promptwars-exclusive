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
    try {
      const text = [
        `============================================================`,
        `ATTORNEY CONSULTATION PREPARATION SHEET`,
        `LexLens Automated Legal Information Navigator`,
        `============================================================`,
        `Document: ${documentTitle}`,
        `Generated: ${generatedDate}`,
        `Notice: For informational consultation preparation only. Not legal advice.`,
        ``,
        `TARGETED QUESTIONS TO DISCUSS WITH YOUR ATTORNEY:`,
        `------------------------------------------------------------`,
        ...discussionPoints.map(
          (item, idx) =>
            `${idx + 1}. [${item.clause_ref}] ${item.topic}\n   RECOMMENDED QUESTION: ${item.recommended_question}\n`
        ),
        `============================================================`,
      ].join('\n');

      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2200);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-group">
            <span className="modal-badge">Professional Consultation Tool</span>
            <h2 id="modal-title" className="modal-title">Attorney Consultation Prep Sheet</h2>
            <p className="modal-subtitle">
              Take these prioritized questions to your legal counsel to turn a costly 5-hour review into an efficient, high-leverage 20-minute consultation.
            </p>
          </div>
          <button className="btn-close-modal" onClick={onClose} aria-label="Close Dialog">
            ✕
          </button>
        </div>

        <div className="modal-meta-bar">
          <span><strong>Document:</strong> {documentTitle}</span>
          <span><strong>Date:</strong> {generatedDate}</span>
          <span><strong>Questions Formulated:</strong> {discussionPoints.length} Items</span>
        </div>

        <div className="modal-body">
          <div className="prep-notice-banner">
            ⚖️ <strong>Important Ethical Notice:</strong> These items are strategic discussion questions formulated from your document's high-attention clauses. They do not constitute legal conclusions or legal advice.
          </div>

          <div className="prep-questions-list">
            {discussionPoints.map((item, index) => (
              <div key={item.clause_ref} className="prep-question-card">
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
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
          <button className="btn-primary" onClick={handleCopy}>
            {isCopied ? '✓ Copied to Clipboard!' : '📋 Copy Prep Sheet to Clipboard'}
          </button>
        </div>
      </div>
    </div>
  );
};
