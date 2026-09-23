import type { ClauseFinding } from '../types/workspace';

interface ClauseCardProps {
  clause: ClauseFinding;
  isSelected: boolean;
  onInspect: (clause: ClauseFinding) => void;
}

export const ClauseCard = ({ clause, isSelected, onInspect }: ClauseCardProps) => {
  const getBadgeClass = (level: string) => {
    switch (level) {
      case 'high':
        return 'badge-high';
      case 'moderate':
        return 'badge-moderate';
      case 'standard':
        return 'badge-standard';
      default:
        return '';
    }
  };

  const getBadgeLabel = (level: string) => {
    switch (level) {
      case 'high':
        return '🔴 High Attention';
      case 'moderate':
        return '🟡 Moderate';
      case 'standard':
        return '🟢 Standard';
      default:
        return level;
    }
  };

  return (
    <div
      className={`clause-card ${isSelected ? 'selected' : ''} card-${clause.attention_level}`}
      onClick={() => onInspect(clause)}
      tabIndex={0}
      role="button"
      onKeyDown={(e) => e.key === 'Enter' && onInspect(clause)}
      aria-label={`Inspect ${clause.title}`}
    >
      <div className="clause-card-top">
        <div className="clause-badges-row">
          <span className={`attention-badge ${getBadgeClass(clause.attention_level)}`}>
            {getBadgeLabel(clause.attention_level)}
          </span>
          <span className="category-tag">{clause.category}</span>
          {clause.is_real_extracted && (
            <span style={{ fontSize: '11px', background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
              Live Extraction
            </span>
          )}
          <span className="source-tag">
            Page {clause.page_number} · {clause.section_title}
          </span>
        </div>

        <button
          className="btn-inspect"
          onClick={(e) => {
            e.stopPropagation();
            onInspect(clause);
          }}
          title="Inspect verbatim source and plain English translation"
        >
          Inspect Source →
        </button>
      </div>

      <h4 className="clause-card-title">{clause.title}</h4>

      <p className="clause-plain-english">{clause.plain_english}</p>

      <div className="clause-impact-callout">
        <span className="impact-label">Practical Impact:</span>
        <span className="impact-text">{clause.why_it_matters}</span>
      </div>
    </div>
  );
};
