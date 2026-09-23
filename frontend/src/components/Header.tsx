import { LexLensLogo } from './LexLensLogo';

export const Header = () => {
  return (
    <header className="header">
      <div className="header-container">
        <div className="logo-group">
          <div className="logo-icon-wrapper">
            <LexLensLogo size={36} />
          </div>
          <div className="logo-text-block">
            <div className="logo-title-row">
              <h1 className="logo-title">LexLens</h1>
              <span className="logo-version-chip">AI v1.0</span>
            </div>
            <p className="logo-tagline">Grounded Legal Document Intelligence</p>
          </div>
        </div>
        <div className="header-badge">
          <span className="edition-badge">
            <span className="edition-badge-pulse" />
            PromptWars Exclusive Edition
          </span>
        </div>
      </div>
    </header>
  );
};
