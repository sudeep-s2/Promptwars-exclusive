import { useState, useEffect } from 'react';
import type { ClauseFinding } from '../types/workspace';

interface ClauseSourceDrawerProps {
  clause: ClauseFinding | null;
  onClose: () => void;
  onAskAboutClause?: (clauseTitle: string) => void;
}

export const ClauseSourceDrawer = ({
  clause,
  onClose,
  onAskAboutClause,
}: ClauseSourceDrawerProps) => {
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!clause) return null;

  const handleCopy = async () => {
    try {
      const formatted = `[LexLens Clause Analysis]\nTitle: ${clause.title}\nSection: ${clause.section_title} (Page ${clause.page_number})\nAttention: ${clause.attention_level.toUpperCase()}\n\nPlain-Language Summary:\n${clause.plain_english}\n\nPractical Impact:\n${clause.why_it_matters}\n\nVerbatim Text:\n"${clause.verbatim_excerpt}"`;
      await navigator.clipboard.writeText(formatted);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <div className="drawer-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="drawer-title">
      <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <span className="drawer-category">{clause.category}</span>
              {clause.is_real_extracted && (
                <span className="live-extract-tag">
                  Live Extraction
                </span>
              )}
            </div>
            <h3 id="drawer-title" className="drawer-title">{clause.title}</h3>
          </div>
          <button className="btn-close-drawer" onClick={onClose} aria-label="Close Drawer">
            ✕
          </button>
        </div>

        <div className="drawer-body">
          {/* TIER 1 & 2: AI Interpretation & Plain-Language Explanation */}
          <div className="drawer-tier tier-interpretation">
            <div className="tier-header">
              <span className="tier-badge ai-badge">
                ✦ LexLens Plain-Language Translation
              </span>
              <span className={`drawer-attention-tag tag-${clause.attention_level}`}>
                {clause.attention_level === 'high'
                  ? '🔴 High Attention'
                  : clause.attention_level === 'moderate'
                  ? '🟡 Moderate Attention'
                  : '🟢 Standard Clause'}
              </span>
            </div>
            <p className="tier-explanation">{clause.plain_english}</p>

            <div className="tier-impact">
              <strong>Why This Matters:</strong>
              <p>{clause.why_it_matters}</p>
            </div>
          </div>

          {/* TIER 3: Verbatim Immutable Document Source */}
          <div className="drawer-tier tier-verbatim">
            <div className="tier-header">
              <span className="tier-badge source-badge">
                {clause.is_real_extracted
                  ? '📄 Original Immutable Text [PyMuPDF Live Extracted]'
                  : '📄 Original Immutable Legal Text'}
              </span>
              <span className="tier-citation">
                Page {clause.page_number} · {clause.section_title}
              </span>
            </div>

            <div className="verbatim-text-well">
              <pre className="verbatim-pre">{clause.verbatim_excerpt}</pre>
            </div>
          </div>
        </div>

        <div className="drawer-footer">
          <button className="btn-secondary btn-sm" onClick={handleCopy}>
            {isCopied ? '✓ Copied Analysis' : '📋 Copy Analysis & Source'}
          </button>
          {onAskAboutClause && (
            <button
              className="btn-primary btn-sm"
              onClick={() => {
                onAskAboutClause(clause.title);
                onClose();
              }}
            >
              💬 Ask Question About This Clause
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
