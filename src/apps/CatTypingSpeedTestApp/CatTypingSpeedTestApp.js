import React from 'react';
import './CatTypingSpeedTestApp.css';

const CatTypingSpeedTestApp = ({ onBack }) => {
  const base = process.env.PUBLIC_URL || '';
  const appUrl = `${base}/apps/cat-typing-speed-test/`;

  return (
    <div className="cat-typing-wrapper">
      <div className="cat-typing-intro">
        <p>
          Test your typing skills with a 15 or 30 second sprint featuring Kimchi, Rythm, and Siella.
          The standalone experience loads below and can be opened in a new tab for a larger view.
        </p>
      </div>

      <iframe
        src={appUrl}
        title="Cat Typing Speed Test"
        className="cat-typing-frame"
        loading="lazy"
      />

      <div className="cat-typing-actions">
        <a className="cat-typing-link" href={appUrl} target="_blank" rel="noreferrer">
          Open full window ↗
        </a>
        <button type="button" className="cat-typing-back" onClick={onBack}>
          ← Back to Apps
        </button>
      </div>
    </div>
  );
};

export default CatTypingSpeedTestApp;
