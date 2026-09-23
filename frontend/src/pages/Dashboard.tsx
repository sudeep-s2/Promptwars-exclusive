import { useState } from 'react';
import { Header } from '../components/Header';
import { DisclaimerBanner } from '../components/DisclaimerBanner';
import { BackendStatusCard } from '../components/BackendStatusCard';
import { DocumentUploadArea } from '../components/DocumentUploadArea';
import { ProcessingState } from '../components/ProcessingState';
import { AnalysisWorkspace } from '../components/AnalysisWorkspace';
import type { MockLegalDocument, WorkspaceView } from '../types/workspace';
import { SAMPLE_SERVICES_AGREEMENT } from '../data/mockDocuments';

export const Dashboard = () => {
  const [view, setView] = useState<WorkspaceView>('landing');
  const [selectedDoc, setSelectedDoc] = useState<MockLegalDocument>(SAMPLE_SERVICES_AGREEMENT);

  const handleSelectDocument = (doc: MockLegalDocument) => {
    setSelectedDoc(doc);
    setView('processing');
  };

  const handleProcessingComplete = () => {
    setView('workspace');
  };

  const handleResetToLanding = () => {
    setView('landing');
  };

  return (
    <div className="dashboard-layout">
      <Header />

      <main className="dashboard-main">
        {/* Persistent, Non-Dismissible Legal Notice Banner */}
        <DisclaimerBanner />

        {/* VIEW 1: LANDING & INGESTION */}
        {view === 'landing' && (
          <>
            {/* Hero / Problem Definition */}
            <section className="hero-section">
              <h2 className="hero-title">Demystifying Legal Documents with AI</h2>
              <p className="hero-description">
                LexLens translates dense commercial agreements into plain-English commitments, surfaces critical liabilities with verbatim source proof, and compiles an actionable checklist to review with your attorney.
              </p>

              <div className="features-overview">
                <div className="feature-item">
                  <span className="feature-icon">🔍</span>
                  <div>
                    <strong>Attention Radar</strong>
                    <p>Highlight uncapped indemnities, payment milestones, and termination traps.</p>
                  </div>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">💬</span>
                  <div>
                    <strong>Grounded Q&amp;A</strong>
                    <p>Query contracts directly with verifiable page and paragraph citations.</p>
                  </div>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">📋</span>
                  <div>
                    <strong>Attorney Prep Sheet</strong>
                    <p>Generate high-leverage discussion questions to optimize legal consultation.</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Backend Connectivity Status */}
            <BackendStatusCard />

            {/* Document Upload Area & Sample Documents */}
            <DocumentUploadArea onSelectDocument={handleSelectDocument} />
          </>
        )}

        {/* VIEW 2: SIMULATED IN-MEMORY PROCESSING */}
        {view === 'processing' && (
          <ProcessingState
            documentName={selectedDoc.filename}
            onComplete={handleProcessingComplete}
          />
        )}

        {/* VIEW 3: ACTIVE ANALYSIS WORKSPACE */}
        {view === 'workspace' && (
          <AnalysisWorkspace
            document={selectedDoc}
            onReset={handleResetToLanding}
          />
        )}
      </main>

      <footer className="dashboard-footer">
        <p>LexLens • PromptWars Exclusive Edition — Phase 3: Visual MVP Document Workspace</p>
      </footer>
    </div>
  );
};
