import React from 'react';

const LauncherHeader = ({
  appCount,
  torontoTime,
  searchQuery,
  onSearchChange,
  viewMode,
  onChangeViewMode,
  onOpenSettings,
  settingsButtonRef,
}) => (
  <header className="launcher-header">
    <div className="launcher-header-top">
      <h1 className="launcher-title">
        <span className="title-icon">📱</span>
        64 Apps
        <span className="app-count">({appCount} apps)</span>
      </h1>

      <div className="toronto-clock" aria-label="Current time">
        <span className="clock-time">{torontoTime}</span>
      </div>
    </div>

    <div className="launcher-controls">
      <div className="search-container">
        <input
          type="text"
          placeholder="Search apps..."
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          className="search-input"
        />
        <span className="search-icon">🔍</span>
      </div>

      <div className="view-controls">
        <div className="view-toggle-group">
          <button
            type="button"
            className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => onChangeViewMode('grid')}
          >
            ⊞
          </button>
          <button
            type="button"
            className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => onChangeViewMode('list')}
          >
            ☰
          </button>
        </div>
        <button
          type="button"
          className="settings-btn"
          onClick={onOpenSettings}
          ref={settingsButtonRef}
        >
          <span aria-hidden="true">⚙️</span>
          <span className="settings-btn-label">Settings</span>
        </button>
      </div>
    </div>
  </header>
);

export default LauncherHeader;
