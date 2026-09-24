import { useState, useEffect } from 'react';
import { LexLensLogo } from './LexLensLogo';

interface ProcessingStateProps {
  documentName: string;
  isRealUpload?: boolean;
  onComplete?: () => void;
}

const STAGES = [
  'Reading document',
  'Understanding structure',
  'Preparing analysis',
  'Finishing',
];

export const ProcessingState = ({
  documentName,
  isRealUpload = false,
  onComplete,
}: ProcessingStateProps) => {
  const [currentStageIndex, setCurrentStageIndex] = useState(0);

  useEffect(() => {
    if (!isRealUpload && onComplete) {
      const stageDuration = 450;
      const timer = setInterval(() => {
        setCurrentStageIndex((prev) => {
          if (prev < STAGES.length - 1) {
            return prev + 1;
          } else {
            clearInterval(timer);
            setTimeout(onComplete, 350);
            return prev;
          }
        });
      }, stageDuration);

      return () => clearInterval(timer);
    } else {
      // For real uploads, gently advance through the first 3 stages while awaiting API response
      const interval = setInterval(() => {
        setCurrentStageIndex((prev) => (prev < STAGES.length - 2 ? prev + 1 : prev));
      }, 700);
      return () => clearInterval(interval);
    }
  }, [isRealUpload, onComplete]);

  return (
    <div className="processing-container" role="status" aria-live="polite">
      <div className="processing-card">
        <div className="processing-brand-pulse">
          <LexLensLogo size={42} />
        </div>

        <h2 className="processing-title">Analyzing document</h2>
        <p className="processing-docname" title={documentName}>{documentName}</p>

        <div className="processing-checklist">
          {STAGES.map((stage, idx) => (
            <div
              key={stage}
              className={`stage-row ${
                idx < currentStageIndex
                  ? 'completed'
                  : idx === currentStageIndex
                  ? 'active'
                  : 'pending'
              }`}
            >
              <span className="stage-indicator" aria-hidden="true">
                {idx < currentStageIndex ? '✓' : idx === currentStageIndex ? '●' : '○'}
              </span>
              <span className="stage-label">{stage}</span>
            </div>
          ))}
        </div>

        <p className="processing-footnote">
          Structuring key clauses, risk areas, and obligations for your review.
        </p>
      </div>
    </div>
  );
};
