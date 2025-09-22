import React from 'react';
import './ZenGoApp.css';

const ZenGoApp = ({ onBack }) => {
  const base = process.env.PUBLIC_URL || '';
  const appUrl = `${base}/apps/zen-go/`;

  return (
    <div className="zen-go-embed">
      <section className="zen-go-intro">
        <div>
          <h1>Zen Go</h1>
          <p>
            Sharpen your corner instincts on a focused 9×9 board. Pick a rank,
            add handicap stones, and duel a GNU Go engine compiled to
            WebAssembly.
          </p>
        </div>
        <ul className="zen-go-highlights">
          <li>WGo.js renders captures, ko, and coordinates crisply.</li>
          <li>Difficulty maps to Go ranks with an approximate ELO readout.</li>
          <li>Handicap presets (2–9 stones) follow standard star-point layouts.</li>
        </ul>
      </section>

      <iframe
        src={appUrl}
        title="Zen Go"
        className="zen-go-frame"
        loading="lazy"
      />

      <footer className="zen-go-actions">
        <a className="zen-go-link" href={appUrl} target="_blank" rel="noreferrer">
          Open full window ↗
        </a>
        <button type="button" className="zen-go-back" onClick={onBack}>
          ← Back to Apps
        </button>
      </footer>
    </div>
  );
};

export default ZenGoApp;
