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
        return 'badge-standard';
    }
  };

  const getBadgeLabel = (level: string) => {
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
    <article
      className={`clause-card ${isSelected ? 'selected' : ''} card-${clause.attention_level}`}
      onClick={() => onInspect(clause)}
      tabIndex={0}
      role="button"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onInspect(clause);
        }
      }}
      aria-label={`Inspect clause ${clause.title}, ${getBadgeLabel(clause.attention_level)}`}
    >
      <div className="clause-card-top">
        <div className="clause-badges-row">
          <span className={`attention-badge ${getBadgeClass(clause.attention_level)}`}>
            <span className={`badge-dot dot-${clause.attention_level}`} aria-hidden="true" />
            {getBadgeLabel(clause.attention_level)}
          </span>
          <span className="category-tag">{clause.category}</span>
          <span className="source-tag">
            Page {clause.page_number} · {clause.section_title}
          </span>
        </div>

        <button
          type="button"
          className="btn-inspect"
          onClick={(e) => {
            e.stopPropagation();
            onInspect(clause);
          }}
          title="Inspect original source text"
        >
          Inspect Source →
        </button>
      </div>

      <h4 className="clause-card-title">{clause.title}</h4>

      <p className="clause-plain-english">{clause.plain_english}</p>

      <div className="clause-impact-callout">
        <strong className="impact-label">Practical Impact:</strong>
        <p className="impact-text">{clause.why_it_matters}</p>
      </div>
    </article>
  );
};
