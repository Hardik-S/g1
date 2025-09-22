import React from 'react';
import './styles.css';

const resolveCacheLabUrl = () => {
  if (process.env.NODE_ENV === 'development') {
    return process.env.CACHE_LAB_DEV_URL || 'http://localhost:4173/';
  }

  const base = process.env.PUBLIC_URL || '';
  const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  return `${normalizedBase}/cache-lab/`;
};

const CacheLabApp = ({ onBack }) => {
  const embeddedUrl = resolveCacheLabUrl();

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
