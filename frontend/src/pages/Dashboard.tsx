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

  // 1. Mock Sample Document Flow (Zero-latency exploration)
  const handleSelectSample = (doc: WorkspaceDocument) => {
    setIsRealUpload(false);
    setSelectedDoc(doc);
    setUploadError(null);
    setView('processing');
  };

  // 2. Real Upload Ingestion Flow
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
      <Header
        isInWorkspace={view === 'workspace'}
        onNewDocument={handleResetToLanding}
      />

      <main className="dashboard-main">
        {/* VIEW 1: LANDING & INGESTION */}
        {view === 'landing' && (
          <div className="landing-view">
            {/* Hero / Value Proposition */}
            <section className="hero-section" aria-label="Product Overview">
              <h1 className="hero-title">Understand what matters in your legal documents.</h1>
              <p className="hero-description">
                LexLens highlights important clauses, explains them in plain language, and helps you verify them against the original document.
              </p>
            </section>

            {/* Document Upload Area & Sample Documents */}
            <DocumentUploadArea
              onSelectSample={handleSelectSample}
              onUploadFile={handleUploadRealFile}
              externalError={uploadError}
            />

            {/* Persistent Legal Disclaimer */}
            <DisclaimerBanner />

            {/* Development-Only Diagnostics (hidden in production) */}
            <BackendStatusCard />
          </div>
        )}

        {/* VIEW 2: PROCESSING STATE */}
        {view === 'processing' && (
          <ProcessingState
            documentName={isRealUpload ? uploadFilename : selectedDoc.filename}
            isRealUpload={isRealUpload}
            onComplete={isRealUpload ? undefined : handleProcessingComplete}
          />
        )}

        {/* VIEW 3: ACTIVE ANALYSIS WORKSPACE */}
        {view === 'workspace' && (
          <>
            <DisclaimerBanner />
            <AnalysisWorkspace
              document={selectedDoc}
              onReset={handleResetToLanding}
            />
          </>
        )}
      </main>

      <footer className="dashboard-footer">
        <p>LexLens • Legal Document Intelligence</p>
      </footer>
    </div>
  );
};
