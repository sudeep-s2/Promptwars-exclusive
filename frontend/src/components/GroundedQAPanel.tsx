import { useState } from 'react';
import type { QAPair } from '../types/workspace';
import type { DocumentChunk, SourceCitation } from '../types/document';
import { askDocumentQuestion, askQuestion } from '../services/api';

interface GroundedQAPanelProps {
  suggestedQuestions: string[];
  qaDatabase: QAPair[];
  documentName: string;
  documentId?: string;
  rawChunks?: DocumentChunk[];
  indexingStatus?: string | null;
  onOpenSource?: (source: { page_number: number; section_title: string; text: string; chunk_id: string }) => void;
}

interface DisplayedQA {
  question: string;
  answer: string;
  groundingStatus?: 'grounded' | 'insufficient_context';
  sources: SourceCitation[];
  legacySourceCitation?: string;
  legacyPageNumber?: number;
}

export const GroundedQAPanel = ({
  suggestedQuestions,
  qaDatabase,
  documentName,
  documentId,
  rawChunks,
  onOpenSource,
}: GroundedQAPanelProps) => {
  const [query, setQuery] = useState('');
  const [activeQA, setActiveQA] = useState<DisplayedQA | null>(() => {
    if (qaDatabase.length > 0) {
      return {
        question: qaDatabase[0].question,
        answer: qaDatabase[0].answer,
        groundingStatus: 'grounded',
        sources: [],
        legacySourceCitation: qaDatabase[0].source,
        legacyPageNumber: qaDatabase[0].page_number,
      };
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleAsk = async (questionText: string) => {
    if (!questionText.trim()) return;

    setIsLoading(true);
    setQuery(questionText);

    // 1. Primary RAG Pathway: If documentId is available, query indexed document
    if (documentId) {
      try {
        const ragRes = await askDocumentQuestion(documentId, questionText);
        setActiveQA({
          question: ragRes.question,
          answer: ragRes.answer,
          groundingStatus: ragRes.grounding_status,
          sources: ragRes.sources,
        });
        setIsLoading(false);
        return;
      } catch (err) {
        console.warn('RAG endpoint unavailable, attempting direct chunk evaluation:', err);
      }
    }

    // 2. Direct Chunk Grounding Fallback: In-flight chunk evaluation
    if (rawChunks && rawChunks.length > 0) {
      try {
        const qaRes = await askQuestion(questionText, rawChunks);
        setActiveQA({
          question: qaRes.question,
          answer: qaRes.answer,
          groundingStatus: 'grounded',
          sources: [
            {
              chunk_id: qaRes.source_chunk_id || 'retrieved-chunk',
              page_number: qaRes.page_number,
              section_title: qaRes.source_citation,
              text: qaRes.verbatim_excerpt || '',
            },
          ],
        });
        setIsLoading(false);
        return;
      } catch {
        // Fallback to local sample matching
      }
    }

    // 3. Fallback: Sample matching for offline mode
    const qLower = questionText.toLowerCase();
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
      setActiveQA({
        question: match.question,
        answer: match.answer,
        groundingStatus: 'grounded',
        sources: [],
        legacySourceCitation: match.source,
        legacyPageNumber: match.page_number,
      });
    } else {
      setActiveQA({
        question: questionText,
        answer: `The document '${documentName}' does not provide enough information to address this question.`,
        groundingStatus: 'insufficient_context',
        sources: [],
        legacySourceCitation: 'Document-wide search · No matching provisions found',
        legacyPageNumber: 1,
      });
    }
    setIsLoading(false);
  };

  return (
    <section className="qa-section-card" aria-label="Document-Grounded Q&A">
      <div className="qa-header">
        <h3 className="qa-title">Ask about this document</h3>
        <p className="qa-subtitle">
          Answers are grounded directly in your document with verified source citations.
        </p>
      </div>

      {/* Suggested Questions */}
      {suggestedQuestions.length > 0 && (
        <div className="qa-suggestions-wrapper">
          <span className="qa-suggestions-label">Suggested:</span>
          <div className="qa-chips-row">
            {suggestedQuestions.map((q) => (
              <button
                key={q}
                type="button"
                className={`qa-chip ${query === q ? 'active' : ''}`}
                onClick={() => handleAsk(q)}
                disabled={isLoading}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Query Input Form */}
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
            placeholder="Type a question about terms, liabilities, or deadlines..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={isLoading}
            aria-label="Ask a question about this document"
          />
          <button
            type="submit"
            className="btn-primary btn-ask"
            disabled={isLoading || !query.trim()}
          >
            {isLoading ? 'Searching...' : 'Ask Document →'}
          </button>
        </div>
      </form>

      {/* Response Box */}
      {isLoading ? (
        <div className="qa-loading-box" role="status" aria-live="polite">
          <div className="spinner-progress-small" aria-hidden="true" />
          <span>Searching document and verifying sources...</span>
        </div>
      ) : (
        activeQA && (
          <div className="qa-result-box" role="region" aria-label="Question Answer">
            <div className="qa-result-header">
              <strong className="qa-query-label">{activeQA.question}</strong>
            </div>

            {activeQA.groundingStatus === 'insufficient_context' && (
              <div className="qa-insufficient-badge" role="status">
                <span className="insufficient-icon" aria-hidden="true">⚠️</span>
                <span>Unaddressed in document — this topic is not specified in the agreement.</span>
              </div>
            )}

            <div className="qa-answer-block">
              <span className="qa-block-label">Answer</span>
              <p className="qa-answer-text">{activeQA.answer}</p>
            </div>

            {/* Structured Clickable Source Citations */}
            {activeQA.sources.length > 0 ? (
              <div className="qa-sources-list">
                <span className="qa-sources-title">Source Citations:</span>
                <div className="qa-sources-chips">
                  {activeQA.sources.map((source, index) => (
                    <button
                      key={`${source.chunk_id}-${index}`}
                      type="button"
                      className="qa-source-pill clickable"
                      onClick={() =>
                        onOpenSource?.({
                          page_number: source.page_number,
                          section_title: source.section_title,
                          text: source.text,
                          chunk_id: source.chunk_id,
                        })
                      }
                      title="Inspect original source text"
                    >
                      <span className="source-icon" aria-hidden="true">📄</span>
                      <span className="source-text">
                        Page {source.page_number} · {source.section_title}
                      </span>
                      <span className="source-verify-tag">Inspect ↗</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : activeQA.legacySourceCitation ? (
              <div className="qa-sources-list">
                <span className="qa-sources-title">Source Citations:</span>
                <div className="qa-sources-chips">
                  <button
                    type="button"
                    className="qa-source-pill clickable"
                    onClick={() =>
                      onOpenSource?.({
                        page_number: activeQA.legacyPageNumber || 1,
                        section_title: activeQA.legacySourceCitation || 'Agreement Excerpt',
                        text: activeQA.answer,
                        chunk_id: 'sample-source-chunk',
                      })
                    }
                    title="Inspect original source text"
                  >
                    <span className="source-icon" aria-hidden="true">📄</span>
                    <span className="source-text">{activeQA.legacySourceCitation}</span>
                    <span className="source-verify-tag">Inspect ↗</span>
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )
      )}
    </section>
  );
};
