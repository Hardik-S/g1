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
            Take on a KataGo-trained sparring partner across a full 19×19
            goban. Sample different policy heads, trace score swings, and follow
            a running move log without leaving the browser.
          </p>
        </div>
        <ul className="zen-go-highlights">
          <li>Canvas renderer highlights star points, captures, and last-move halos.</li>
          <li>KataGo policy sampling picks among the top three moves for human-like flow.</li>
          <li>Model selector swaps between swift, balanced, and deep KataGo nets.</li>
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
