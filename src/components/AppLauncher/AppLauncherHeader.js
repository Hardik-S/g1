import React from 'react';

const AppLauncherHeader = ({
  appCount,
  onOpenSettings,
  onRandomLaunch,
  onSearchChange,
  onViewModeChange,
  searchQuery,
  settingsButtonRef,
  torontoTime,
  viewMode,
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
          onChange={onSearchChange}
          className="search-input"
        />
        <span className="search-icon">🔍</span>
      </div>

      <div className="view-controls">
        <button
          type="button"
          className="random-launch-btn"
          onClick={onRandomLaunch}
          aria-label="Launch a random app"
        >
          🎲
        </button>
        <div className="view-toggle-group">
          <button
            type="button"
            className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
            onClick={() => onViewModeChange('grid')}
          >
            ⊞
          </button>
          <button
            type="button"
            className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => onViewModeChange('list')}
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

export default AppLauncherHeader;
