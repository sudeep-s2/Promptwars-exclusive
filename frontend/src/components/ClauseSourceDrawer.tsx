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
      const formatted = [
        `[LexLens Clause Analysis]`,
        `Title: ${clause.title}`,
        `Section: ${clause.section_title} (Page ${clause.page_number})`,
        `Attention Level: ${clause.attention_level.toUpperCase()}`,
        ``,
        `Plain-Language Summary:`,
        clause.plain_english,
        ``,
        `Practical Impact:`,
        clause.why_it_matters,
        ``,
        `Original Document Text:`,
        `"${clause.verbatim_excerpt}"`,
      ].join('\n');

      await navigator.clipboard.writeText(formatted);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const getAttentionLabel = (level: string) => {
    switch (level) {
      case 'high':
        return 'High Attention';
      case 'moderate':
        return 'Moderate Attention';
      case 'standard':
        return 'Standard';
      default:
        return level;
    }
  };

  return (
    <div
      className="drawer-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-title"
    >
      <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <div>
            <span className="drawer-category">{clause.category}</span>
            <h3 id="drawer-title" className="drawer-title">{clause.title}</h3>
          </div>
          <button
            type="button"
            className="btn-close-drawer"
            onClick={onClose}
            aria-label="Close Drawer"
          >
            ✕
          </button>
        </div>

        <div className="drawer-body">
          {/* LAYER 1 & 2: Plain-Language Summary & Practical Impact */}
          <section className="drawer-tier tier-interpretation" aria-label="Plain-Language Interpretation">
            <div className="tier-header">
              <span className="tier-badge ai-badge">
                Plain-Language Interpretation
              </span>
              <span className={`drawer-attention-tag tag-${clause.attention_level}`}>
                <span className={`badge-dot dot-${clause.attention_level}`} aria-hidden="true" />
                {getAttentionLabel(clause.attention_level)}
              </span>
            </div>

            <p className="tier-explanation">{clause.plain_english}</p>

            <div className="tier-impact">
              <strong className="tier-impact-label">Practical Impact:</strong>
              <p className="tier-impact-text">{clause.why_it_matters}</p>
            </div>
          </section>

          {/* LAYER 3: Original Document Verbatim Text */}
          <section className="drawer-tier tier-verbatim" aria-label="Original Document Text">
            <div className="tier-header">
              <span className="tier-badge source-badge">
                Original Document Text
              </span>
              <span className="tier-citation">
                Page {clause.page_number} · {clause.section_title}
              </span>
            </div>

            <div className="verbatim-text-well">
              <pre className="verbatim-pre">{clause.verbatim_excerpt}</pre>
            </div>
          </section>
        </div>

        <div className="drawer-footer">
          <button type="button" className="btn-secondary btn-sm" onClick={handleCopy}>
            {isCopied ? '✓ Copied Analysis' : '📋 Copy Analysis & Source'}
          </button>
          {onAskAboutClause && (
            <button
              type="button"
              className="btn-primary btn-sm"
              onClick={() => {
                onAskAboutClause(clause.title);
                onClose();
              }}
            >
              Ask About This Clause →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
