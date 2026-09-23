import { useState } from 'react';
import type { MockLegalDocument, ClauseFinding } from '../types/workspace';
import { DocumentHeaderBar } from './DocumentHeaderBar';
import { ExecutiveSummaryCard } from './ExecutiveSummaryCard';
import { AttentionRadarFilter, type RadarFilterOption } from './AttentionRadarFilter';
import { ClauseCard } from './ClauseCard';
import { ClauseSourceDrawer } from './ClauseSourceDrawer';
import { GroundedQAPanel } from './GroundedQAPanel';
import { CounselPrepModal } from './CounselPrepModal';

interface AnalysisWorkspaceProps {
  document: MockLegalDocument;
  onReset: () => void;
}

export const AnalysisWorkspace = ({ document, onReset }: AnalysisWorkspaceProps) => {
  const [activeFilter, setActiveFilter] = useState<RadarFilterOption>('all');
  const [selectedClause, setSelectedClause] = useState<ClauseFinding | null>(null);
  const [isPrepModalOpen, setIsPrepModalOpen] = useState(false);

  // Compute counts
  const counts = {
    all: document.clauses.length,
    high: document.clauses.filter((c) => c.attention_level === 'high').length,
    moderate: document.clauses.filter((c) => c.attention_level === 'moderate').length,
    standard: document.clauses.filter((c) => c.attention_level === 'standard').length,
  };

  // Filter clauses
  const filteredClauses = document.clauses.filter((clause) => {
    if (activeFilter === 'all') return true;
    return clause.attention_level === activeFilter;
  });

  return (
    <div className="workspace-container">
      {/* 1. Document Header & Metadata Bar */}
      <DocumentHeaderBar
        metadata={document.metadata}
        onReset={onReset}
        onOpenPrepSheet={() => setIsPrepModalOpen(true)}
      />

      {/* 2. Executive Summary */}
      <ExecutiveSummaryCard summary={document.executive_summary} />

      {/* 3. Attention Radar Filter */}
      <AttentionRadarFilter
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        counts={counts}
      />

      {/* 4. Clause Findings List */}
      <div className="clauses-grid" role="region" aria-label="Clause Analysis Cards">
        {filteredClauses.map((clause) => (
          <ClauseCard
            key={clause.id}
            clause={clause}
            isSelected={selectedClause?.id === clause.id}
            onInspect={(c) => setSelectedClause(c)}
          />
        ))}

        {filteredClauses.length === 0 && (
          <div className="empty-filter-state">
            <p>No clauses categorized under &ldquo;{activeFilter}&rdquo; for this document.</p>
            <button className="btn-secondary btn-sm" onClick={() => setActiveFilter('all')}>
              Show All Clauses
            </button>
          </div>
        )}
      </div>

      {/* 5. Document-Grounded Q&A Section */}
      <GroundedQAPanel
        suggestedQuestions={document.suggested_questions}
        qaDatabase={document.qa_database}
        documentName={document.filename}
      />

      {/* 6. Clause Source Verification Drawer */}
      <ClauseSourceDrawer
        clause={selectedClause}
        onClose={() => setSelectedClause(null)}
      />

      {/* 7. Attorney Consultation Prep Sheet Modal */}
      <CounselPrepModal
        isOpen={isPrepModalOpen}
        onClose={() => setIsPrepModalOpen(false)}
        documentTitle={document.counsel_prep_sheet.document_title}
        generatedDate={document.counsel_prep_sheet.generated_date}
        discussionPoints={document.counsel_prep_sheet.discussion_points}
      />
    </div>
  );
};
