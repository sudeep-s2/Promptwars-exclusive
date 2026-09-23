import { useState, useEffect } from 'react';

interface ProcessingStateProps {
  documentName: string;
  onComplete: () => void;
}

const STAGES = [
  'Reading document structure...',
  'Extracting page text and numbering...',
  'Detecting legal sections and clauses...',
  'Building document attention map...',
  'Preparing plain-language analysis...',
];

export const ProcessingState = ({ documentName, onComplete }: ProcessingStateProps) => {
  const [currentStageIndex, setCurrentStageIndex] = useState(0);

  useEffect(() => {
    const stageDuration = 350; // 350ms per stage -> total ~1.75s
    const timer = setInterval(() => {
      setCurrentStageIndex((prev) => {
        if (prev < STAGES.length - 1) {
          return prev + 1;
        } else {
          clearInterval(timer);
          setTimeout(onComplete, 300);
          return prev;
        }
      });
    }, stageDuration);

    return () => clearInterval(timer);
  }, [onComplete]);

  const progressPercentage = Math.round(((currentStageIndex + 1) / STAGES.length) * 100);

  return (
    <div className="processing-container" role="status" aria-live="polite">
      <div className="processing-card">
        <div className="processing-icon-pulse">⚖️</div>

        <h2 className="processing-title">Analyzing Legal Document</h2>
        <p className="processing-docname">{documentName}</p>

        <div className="processing-bar-wrapper">
          <div
            className="processing-bar-fill"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        <div className="processing-stage-indicator">
          <span className="stage-text">{STAGES[currentStageIndex]}</span>
          <span className="stage-percent">{progressPercentage}%</span>
        </div>

        <div className="processing-checklist">
          {STAGES.map((stage, idx) => (
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
          Visual prototype simulation using structured document models. In-flight memory processing.
        </p>
      </div>
    </div>
  );
};
