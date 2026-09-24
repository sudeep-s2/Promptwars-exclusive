interface ExecutiveSummaryCardProps {
  summary: string;
}

export const ExecutiveSummaryCard = ({ summary }: ExecutiveSummaryCardProps) => {
  return (
    <section className="executive-summary-card" aria-label="Executive Summary">
      <div className="summary-header">
        <h3 className="summary-title">Executive Summary</h3>
        <span className="summary-hint">Plain-language overview</span>
      </div>
      <p className="summary-body">{summary}</p>
    </section>
  );
};
