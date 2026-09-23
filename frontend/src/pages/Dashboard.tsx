import { Header } from '../components/Header';
import { DisclaimerBanner } from '../components/DisclaimerBanner';
import { BackendStatusCard } from '../components/BackendStatusCard';
import { DocumentUpload } from '../components/DocumentUpload';

export const Dashboard = () => {
  return (
    <div className="dashboard-layout">
      <Header />

      <main className="dashboard-main">
        {/* Legal Disclaimer */}
        <DisclaimerBanner />

        {/* Hero / Purpose Section */}
        <section className="hero-section">
          <h2 className="hero-title">Demystifying Legal Documents with AI</h2>
          <p className="hero-description">
            LexLens assists individuals and teams in navigating complex agreements, contracts, and regulatory filings.
            Gain clarity on obligations, identify critical clauses, and formulate informed questions for your legal counsel.
          </p>

          <div className="features-overview">
            <div className="feature-item">
              <span className="feature-icon">🔍</span>
              <div>
                <strong>Clause Analysis</strong>
                <p>Pinpoint liabilities, termination triggers, and obligations.</p>
              </div>
            </div>
            <div className="feature-item">
              <span className="feature-icon">💬</span>
              <div>
                <strong>Grounded Q&amp;A</strong>
                <p>Query documents directly with verifiable citations.</p>
              </div>
            </div>
            <div className="feature-item">
              <span className="feature-icon">📋</span>
              <div>
                <strong>Action Checklists</strong>
                <p>Generate summary checklists and questions for counsel review.</p>
              </div>
            </div>
          </div>
        </section>

        {/* Backend Connectivity Check */}
        <BackendStatusCard />

        {/* Document Ingestion & Chunking Pipeline */}
        <DocumentUpload />
      </main>

      <footer className="dashboard-footer">
        <p>LexLens • PromptWars Exclusive Edition — Phase 2: Document Upload &amp; Processing Pipeline</p>
      </footer>
    </div>
  );
};
