import { useState, useEffect } from 'react';

interface ProcessingStateProps {
  documentName: string;
  isRealUpload?: boolean;
  onComplete?: () => void;
}

const SAMPLE_STAGES = [
  'Reading document structure...',
  'Extracting page text and numbering...',
  'Detecting legal sections and clauses...',
  'Building document attention map...',
  'Preparing plain-language analysis...',
];

const REAL_STAGES = [
  'Uploading PDF to FastAPI service...',
  'Validating document format and magic bytes...',
  'Extracting page text and layout via PyMuPDF...',
  'Detecting legal sections and chunking...',
  'Assembling structured document workspace...',
];

export const ProcessingState = ({
  documentName,
  isRealUpload = false,
  onComplete,
}: ProcessingStateProps) => {
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const stages = isRealUpload ? REAL_STAGES : SAMPLE_STAGES;

  useEffect(() => {
    // For sample documents, automatically cycle through stages and trigger onComplete
    if (!isRealUpload && onComplete) {
      const stageDuration = 350;
      const timer = setInterval(() => {
        setCurrentStageIndex((prev) => {
          if (prev < SAMPLE_STAGES.length - 1) {
            return prev + 1;
          } else {
            clearInterval(timer);
            setTimeout(onComplete, 300);
            return prev;
          }
        });
      }, stageDuration);

      return () => clearInterval(timer);
    } else {
      // For real uploads, cycle stages gently to show real progress while waiting for API
      const interval = setInterval(() => {
        setCurrentStageIndex((prev) => (prev < REAL_STAGES.length - 2 ? prev + 1 : prev));
      }, 400);
      return () => clearInterval(interval);
    }
  }, [isRealUpload, onComplete]);

  return (
    <div className="processing-container" role="status" aria-live="polite">
      <div className="processing-card">
        <div className="processing-icon-pulse">⚖️</div>

        <h2 className="processing-title">
          {isRealUpload ? 'Processing Uploaded Legal PDF' : 'Analyzing Legal Document'}
        </h2>
        <p className="processing-docname">{documentName}</p>

        <div className="processing-stage-indicator" style={{ justifyContent: 'center', margin: '16px 0 8px 0' }}>
          <span className="stage-text" style={{ fontSize: '15px', color: 'var(--brand-primary, #1e3a8a)', fontWeight: 600 }}>
            {stages[currentStageIndex]}
          </span>
        </div>

        <div className="processing-checklist">
          {stages.map((stage, idx) => (
            <div
              key={stage}
              className={`stage-item ${
                idx < currentStageIndex
                  ? 'completed'
                  : idx === currentStageIndex
                  ? 'active'
                  : 'pending'
              }`}
            >
              <span className="stage-check">
                {idx < currentStageIndex ? '✓' : idx === currentStageIndex ? '▶' : '○'}
              </span>
              <span className="stage-name">{stage}</span>
            </div>
          ))}
        </div>

        <p className="processing-disclaimer">
          {isRealUpload
            ? 'Live extraction using PyMuPDF and deterministic section-aware chunking.'
            : 'Visual prototype simulation using structured document models. In-flight memory processing.'}
        </p>
      </div>
    </div>
  );
};
