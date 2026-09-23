export const Header = () => {
  return (
    <header className="header">
      <div className="header-container">
        <div className="logo-group">
          <div className="logo-icon">⚖️</div>
          <div>
            <h1 className="logo-title">LexLens</h1>
            <p className="logo-tagline">Legal Document Information Assistant</p>
          </div>
        </div>
        <div className="header-badge">
          <span className="edition-badge">Exclusive Edition • MVP</span>
        </div>
      </div>
    </header>
  );
};
