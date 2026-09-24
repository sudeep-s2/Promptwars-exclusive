import type { AttentionLevel } from '../types/workspace';

export type RadarFilterOption = 'all' | AttentionLevel;

interface AttentionRadarFilterProps {
  activeFilter: RadarFilterOption;
  onFilterChange: (filter: RadarFilterOption) => void;
  counts: {
    all: number;
    high: number;
    moderate: number;
    standard: number;
  };
}

export const AttentionRadarFilter = ({
  activeFilter,
  onFilterChange,
  counts,
}: AttentionRadarFilterProps) => {
  return (
    <div className="radar-filter-bar">
      <div className="radar-filter-label-group">
        <h3 className="radar-title">Attention Radar</h3>
        <span className="radar-subtitle">Prioritized areas for review</span>
      </div>

      <div className="radar-tabs" role="tablist" aria-label="Attention Level Filters">
        <button
          type="button"
          className={`radar-tab ${activeFilter === 'all' ? 'active' : ''}`}
          onClick={() => onFilterChange('all')}
          role="tab"
          aria-selected={activeFilter === 'all'}
        >
          All Clauses <span className="tab-count">{counts.all}</span>
        </button>

        <button
          type="button"
          className={`radar-tab tab-high ${activeFilter === 'high' ? 'active' : ''}`}
          onClick={() => onFilterChange('high')}
          role="tab"
          aria-selected={activeFilter === 'high'}
        >
          <span className="dot dot-high" aria-hidden="true" />
          High Attention <span className="tab-count">{counts.high}</span>
        </button>

        <button
          type="button"
          className={`radar-tab tab-moderate ${activeFilter === 'moderate' ? 'active' : ''}`}
          onClick={() => onFilterChange('moderate')}
          role="tab"
          aria-selected={activeFilter === 'moderate'}
        >
          <span className="dot dot-moderate" aria-hidden="true" />
          Moderate Attention <span className="tab-count">{counts.moderate}</span>
        </button>

        <button
          type="button"
          className={`radar-tab tab-standard ${activeFilter === 'standard' ? 'active' : ''}`}
          onClick={() => onFilterChange('standard')}
          role="tab"
          aria-selected={activeFilter === 'standard'}
        >
          <span className="dot dot-standard" aria-hidden="true" />
          Standard <span className="tab-count">{counts.standard}</span>
        </button>
      </div>
    </div>
  );
};
