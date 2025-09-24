import React from 'react';

const AdminLandingThemeCard = ({ landingTheme, onSelectTheme, onToggleTheme }) => {
  const isDarkTheme = landingTheme === 'dark';

  return (
    <div className="admin-panel-card landing-theme-card">
      <h3>Landing Theme</h3>
      <p className="admin-panel-description">
        Control whether the public launcher uses a light or dark mechanical theme.
      </p>

      <fieldset className="landing-theme-selector">
        <legend className="landing-theme-selector-label">Launcher appearance</legend>
        <div className="landing-theme-options">
          <label className={`landing-theme-option ${landingTheme === 'light' ? 'selected' : ''}`}>
            <input
              type="radio"
              name="landing-theme"
              value="light"
              checked={landingTheme === 'light'}
              onChange={() => onSelectTheme('light')}
            />
            <span>Light</span>
          </label>
          <label className={`landing-theme-option ${landingTheme === 'dark' ? 'selected' : ''}`}>
            <input
              type="radio"
              name="landing-theme"
              value="dark"
              checked={landingTheme === 'dark'}
              onChange={() => onSelectTheme('dark')}
            />
            <span>Dark</span>
          </label>
        </div>
      </fieldset>

      <button
        type="button"
        className="admin-action-btn landing-theme-toggle-btn"
        onClick={onToggleTheme}
      >
        Toggle to {isDarkTheme ? 'Light' : 'Dark'} Mode
      </button>
    </div>
  );
};

export default AdminLandingThemeCard;
