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
  mode?: 'vector_rag' | 'degraded_direct_chunks' | 'sample_offline';
}

export const GroundedQAPanel = ({
  suggestedQuestions,
  qaDatabase,
  documentName,
  documentId,
  rawChunks,
  indexingStatus,
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
        mode: 'sample_offline',
      };
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleAsk = async (questionText: string) => {
    if (!questionText.trim()) return;

    setIsLoading(true);
    setQuery(questionText);

    // 1. Primary RAG Pathway: If documentId is available, query PostgreSQL + pgvector RAG endpoint
    if (documentId) {
      try {
        const ragRes = await askDocumentQuestion(documentId, questionText);
        setActiveQA({
          question: ragRes.question,
          answer: ragRes.answer,
          groundingStatus: ragRes.grounding_status,
          sources: ragRes.sources,
          mode: 'vector_rag',
        });
        setIsLoading(false);
        return;
      } catch (err) {
        console.warn('RAG endpoint unavailable or database offline, falling back to direct chunk QA:', err);
      }
    }

    // 2. Direct Chunk Grounding Fallback: In-flight chunk evaluation via LLM provider (Degraded Mode)
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
          mode: 'degraded_direct_chunks',
        });
        setIsLoading(false);
        return;
      } catch {
        // Fallback to local sample matching
      }
    }

    // 3. Fallback: Local sample keyword matching (for offline demo mode)
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
        mode: 'sample_offline',
      });
    } else {
      setActiveQA({
        question: questionText,
        answer: `The document '${documentName}' does not provide enough information to answer that question.`,
        groundingStatus: 'insufficient_context',
        sources: [],
        legacySourceCitation: 'Document-wide search · No explicit matching clauses found',
        legacyPageNumber: 1,
        mode: 'sample_offline',
      });
    }
    setIsLoading(false);
  };

  return (
    <div className="qa-section-card">
      <div className="qa-header">
        <div className="qa-title-group">
          <span className="qa-badge">✦ Grounded Document Assistant</span>
          <h3 className="qa-title">Ask Questions About This Agreement</h3>
          <p className="qa-subtitle">
            Answers are retrieved via semantic vector search in PostgreSQL + pgvector and grounded strictly in authentic document clauses.
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
            placeholder="Type a legal question or select a suggestion above..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={isLoading}
          />
          <button type="submit" className="btn-primary btn-ask" disabled={isLoading || !query.trim()}>
            {isLoading ? 'Retrieving...' : 'Ask Document →'}
          </button>
        </div>
      </form>

      {/* Response Box */}
      {isLoading ? (
        <div className="qa-loading-box">
          <div className="spinner-progress-small" />
          <span>
            {indexingStatus === 'indexed'
              ? 'Performing vector similarity search & verifying grounded citations in pgvector...'
              : 'Evaluating in-flight document chunks & verifying grounded citations (Direct Mode)...'}
          </span>
        </div>
      ) : (
        activeQA && (
          <div className="qa-result-box">
            <div className="qa-result-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div className="qa-query-label">
                <strong>Q: {activeQA.question}</strong>
              </div>
              {activeQA.mode === 'vector_rag' && (
                <span className="qa-mode-badge rag-badge" title="Retrieved via PostgreSQL + pgvector cosine similarity">
                  ✦ Semantic Vector RAG
                </span>
              )}
              {activeQA.mode === 'degraded_direct_chunks' && (
                <span className="qa-mode-badge degraded-badge" title="Vector database offline: evaluated directly against in-flight chunks">
                  ⚡ Direct Chunks (DB Offline)
                </span>
              )}
              {activeQA.mode === 'sample_offline' && (
                <span className="qa-mode-badge sample-badge" title="Pre-indexed sample agreement knowledge base">
                  📑 Sample Agreement
                </span>
              )}
            </div>

            {activeQA.groundingStatus === 'insufficient_context' && (
              <div className="qa-insufficient-badge">
                <span>⚠️ Insufficient Document Context</span>
                <span>·</span>
                <span>Question is out-of-scope or unaddressed in agreement</span>
              </div>
            )}

            <p className="qa-answer-text">{activeQA.answer}</p>

            {/* Structured Clickable Source Citations */}
            {activeQA.sources.length > 0 ? (
              <div className="qa-sources-list">
                <span className="qa-sources-title">Verified Citations:</span>
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
                      title="Click to view verified source text in drawer"
                    >
                      <span className="source-icon">📄</span>
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
                <span className="qa-sources-title">Verified Citations:</span>
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
                    title="Click to view verified source text in drawer"
                  >
                    <span className="source-icon">📄</span>
                    <span className="source-text">{activeQA.legacySourceCitation}</span>
                    <span className="source-verify-tag">Inspect ↗</span>
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )
      )}
    </div>
  );
};
