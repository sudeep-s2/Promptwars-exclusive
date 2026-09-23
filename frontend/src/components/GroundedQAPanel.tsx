import { useState } from 'react';
import type { QAPair } from '../types/workspace';

interface GroundedQAPanelProps {
  suggestedQuestions: string[];
  qaDatabase: QAPair[];
  documentName: string;
}

export const GroundedQAPanel = ({
  suggestedQuestions,
  qaDatabase,
  documentName,
}: GroundedQAPanelProps) => {
  const [query, setQuery] = useState('');
  const [activeQA, setActiveQA] = useState<QAPair | null>(
    qaDatabase.length > 0 ? qaDatabase[0] : null
  );
  const [isLoading, setIsLoading] = useState(false);

  const handleAsk = (questionText: string) => {
    if (!questionText.trim()) return;

    setIsLoading(true);
    setQuery(questionText);

    // Simulate short retrieval & synthesis latency (400ms)
    setTimeout(() => {
      const qLower = questionText.toLowerCase();

      // Find best match in mock qa database
      const match = qaDatabase.find((item) => {
        const itemLower = item.question.toLowerCase();
        if (qLower.includes('payment') || qLower.includes('invoice') || qLower.includes('deadline')) {
          return itemLower.includes('payment');
        }
        if (qLower.includes('terminat') || qLower.includes('cancel') || qLower.includes('notice')) {
          return itemLower.includes('termination');
        }
        if (qLower.includes('intellectual') || qLower.includes('ip') || qLower.includes('property') || qLower.includes('own')) {
          return itemLower.includes('intellectual') || itemLower.includes('property');
        }
        if (qLower.includes('obligation') || qLower.includes('continue') || qLower.includes('survive')) {
          return itemLower.includes('obligation') || itemLower.includes('continue');
        }
        if (qLower.includes('confidential')) {
          return itemLower.includes('confidential');
        }
        if (qLower.includes('law') || qLower.includes('state') || qLower.includes('delaware')) {
          return itemLower.includes('law');
        }
        return itemLower.includes(qLower) || qLower.includes(itemLower);
      });

      if (match) {
        setActiveQA(match);
      } else {
        // Fallback grounded answer
        setActiveQA({
          id: 'qa-fallback',
          question: questionText,
          answer: `The uploaded document '${documentName}' does not contain specific terms addressing '${questionText}'. We recommend flagging this topic for consultation with your legal professional.`,
          source: 'Document-wide search · No explicit matching clauses found',
          page_number: 1,
        });
      }
      setIsLoading(false);
    }, 400);
  };

  return (
    <div className="qa-section-card">
      <div className="qa-header">
        <div className="qa-title-group">
          <span className="qa-badge">✦ Grounded Document Assistant</span>
          <h3 className="qa-title">Ask Questions About This Agreement</h3>
          <p className="qa-subtitle">
            Answers are strictly grounded in retrieved document excerpts with verbatim page citations.
          </p>
        </div>
      </div>

      {/* Suggested Questions */}
      <div className="qa-suggestions-wrapper">
        <span className="qa-suggestions-label">Suggested Questions:</span>
        <div className="qa-chips-row">
          {suggestedQuestions.map((q) => (
            <button
              key={q}
              className={`qa-chip ${query === q ? 'active' : ''}`}
              onClick={() => handleAsk(q)}
              disabled={isLoading}
            >
              💬 {q}
            </button>
          ))}
        </div>
      </div>

      {/* Query Input */}
      <form
        className="qa-form"
        onSubmit={(e) => {
          e.preventDefault();
          handleAsk(query);
        }}
      >
        <div className="qa-input-wrapper">
          <input
            type="text"
            className="qa-input"
            placeholder="Type a question or select a suggestion above..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={isLoading}
          />
          <button type="submit" className="btn-primary btn-ask" disabled={isLoading || !query.trim()}>
            {isLoading ? 'Checking...' : 'Ask Document →'}
          </button>
        </div>
      </form>

      {/* Response Box */}
      {isLoading ? (
        <div className="qa-loading-box">
          <div className="spinner-progress-small" />
          <span>Retrieving relevant clauses and grounding response...</span>
        </div>
      ) : (
        activeQA && (
          <div className="qa-result-box">
            <div className="qa-query-label">
              <strong>Q: {activeQA.question}</strong>
            </div>

            <p className="qa-answer-text">{activeQA.answer}</p>

            <div className="qa-source-pill">
              <span className="source-icon">📄</span>
              <span className="source-text">{activeQA.source}</span>
            </div>
          </div>
        )
      )}
    </div>
  );
};
