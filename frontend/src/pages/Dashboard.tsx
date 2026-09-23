import { useState } from 'react';
import { Header } from '../components/Header';
import { DisclaimerBanner } from '../components/DisclaimerBanner';
import { BackendStatusCard } from '../components/BackendStatusCard';
import { DocumentUploadArea } from '../components/DocumentUploadArea';
import { ProcessingState } from '../components/ProcessingState';
import { AnalysisWorkspace } from '../components/AnalysisWorkspace';
import type { WorkspaceDocument, WorkspaceView } from '../types/workspace';
import { SAMPLE_SERVICES_AGREEMENT } from '../data/mockDocuments';
import { uploadDocument } from '../services/api';
import { convertRealResponseToWorkspaceDoc } from '../utils/documentConverter';

export const Dashboard = () => {
  const [view, setView] = useState<WorkspaceView>('landing');
  const [selectedDoc, setSelectedDoc] = useState<WorkspaceDocument>(SAMPLE_SERVICES_AGREEMENT);
  const [isRealUpload, setIsRealUpload] = useState(false);
  const [uploadFilename, setUploadFilename] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);

  // 1. Mock Sample Document Flow (Instant visual testing)
  const handleSelectSample = (doc: WorkspaceDocument) => {
    setIsRealUpload(false);
    setSelectedDoc(doc);
    setUploadError(null);
    setView('processing');
  };

  // 2. Real Upload Ingestion Flow (FastAPI + PyMuPDF extraction)
  const handleUploadRealFile = async (file: File) => {
    setIsRealUpload(true);
    setUploadFilename(file.name);
    setUploadError(null);
    setView('processing');

    try {
      const response = await uploadDocument(file);
      const workspaceDoc = convertRealResponseToWorkspaceDoc(response);
      setSelectedDoc(workspaceDoc);
      setView('workspace');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to process document.';
      setUploadError(message);
      setView('landing');
    }
  };

  const handleProcessingComplete = () => {
    setView('workspace');
  };

  const handleResetToLanding = () => {
    setSelectedDoc(SAMPLE_SERVICES_AGREEMENT);
    setIsRealUpload(false);
    setUploadFilename('');
    setUploadError(null);
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
            <DocumentUploadArea
              onSelectSample={handleSelectSample}
              onUploadFile={handleUploadRealFile}
              externalError={uploadError}
            />
          </>
        )}

        {/* VIEW 2: PROCESSING (Real API Call or Sample Animation) */}
        {view === 'processing' && (
          <ProcessingState
            documentName={isRealUpload ? uploadFilename : selectedDoc.filename}
            isRealUpload={isRealUpload}
            onComplete={isRealUpload ? undefined : handleProcessingComplete}
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
        <p>LexLens • Grounded Legal Document Intelligence — PromptWars Exclusive Edition</p>
      </footer>
    </div>
  );
};
