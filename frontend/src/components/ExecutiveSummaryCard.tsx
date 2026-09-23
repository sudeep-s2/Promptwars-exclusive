interface ExecutiveSummaryCardProps {
  summary: string;
}

export const ExecutiveSummaryCard = ({ summary }: ExecutiveSummaryCardProps) => {
  return (
    <div className="executive-summary-card">
      <div className="summary-header">
        <span className="summary-badge">✦ LexLens Executive Summary</span>
        <span className="summary-hint">Plain-Language Overview</span>
      </div>
      <p className="summary-body">{summary}</p>
    </div>
  );
};
