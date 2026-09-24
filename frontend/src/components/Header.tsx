import { LexLensLogo } from './LexLensLogo';

interface HeaderProps {
  onNewDocument?: () => void;
  isInWorkspace?: boolean;
}

export const Header = ({ onNewDocument, isInWorkspace = false }: HeaderProps) => {
  return (
    <header className="header">
      <div className="header-container">
        <div className="logo-group">
          <div className="logo-icon-wrapper">
            <LexLensLogo size={34} />
          </div>
          <div className="logo-text-block">
            <div className="logo-title-row">
              <h1 className="logo-title">LexLens</h1>
            </div>
            <p className="logo-tagline">Legal Document Intelligence</p>
          </div>
        </div>

        <div className="header-actions">
          {isInWorkspace && onNewDocument && (
            <button
              onClick={onNewDocument}
              className="btn-header-new-doc"
              title="Upload another document"
            >
              + New Document
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
