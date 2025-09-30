import React from 'react';

const AdminLandingThemeCard = ({ landingTheme, onToggleTheme }) => {
  const isDarkTheme = landingTheme === 'dark';

  return (
    <div className="admin-panel-card landing-theme-card">
      <h3>Landing Theme</h3>
      <p className="admin-panel-description">
        Control whether the public launcher uses a light or dark mechanical theme.
      </p>

      <label className={`landing-theme-toggle ${isDarkTheme ? 'active' : ''}`}>
        <span className="landing-theme-toggle-copy">
          <span className="landing-theme-toggle-label">Dark mode</span>
          <span className="landing-theme-toggle-status">
            {isDarkTheme
              ? 'Visitors currently see the dark mechanical finish.'
              : 'Visitors currently see the light mechanical finish.'}
          </span>
        </span>
        <input
          type="checkbox"
          checked={isDarkTheme}
          onChange={onToggleTheme}
          aria-label={
            isDarkTheme
              ? 'Disable dark mode for the public launcher'
              : 'Enable dark mode for the public launcher'
          }
        />
        <span className="landing-theme-toggle-switch" aria-hidden="true">
          <span className="landing-theme-toggle-knob" />
        </span>
      </label>
    </div>
  );
};

export default AdminLandingThemeCard;
