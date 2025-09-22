import React from 'react';
import './styles.css';

const CacheLabApp = ({ onBack }) => {
  const base = process.env.PUBLIC_URL || '';
  const embeddedUrl = `${base}/cache-lab/`;

  return (
    <div className="cache-lab-embed">
      <p className="cache-lab-note">
        Cache Lab runs as a dedicated module at <a href={embeddedUrl} target="_blank" rel="noreferrer">{embeddedUrl}</a>. It opens in-place below and can be popped out for a full-screen experience.
      </p>
      <iframe title="Cache Lab" src={embeddedUrl} className="cache-lab-frame" aria-label="Cache Lab application" />
      <button type="button" className="cache-lab-back" onClick={onBack}>
        ← Back to Apps
      </button>
    </div>
  );
};

export default CacheLabApp;
