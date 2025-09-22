import React from 'react';
import './CosmosApp.css';

const CosmosApp = ({ onBack }) => {
  const base = process.env.PUBLIC_URL || '';
  const appUrl = `${base}/apps/cosmos/`;

  return (
    <div className="cosmos-embed">
      <section className="cosmos-intro">
        <div className="cosmos-intro-copy">
          <h1>Cosmos Simulator</h1>
          <p>
            A modular Three.js playground that renders the solar system with velocity Verlet physics,
            true-to-scale distances, and lil-gui controls. Adjust time, gravity, and orbital trails to see how
            planets dance around the sun.
          </p>
          <ul>
            <li>Newtonian gravity + velocity Verlet integrator for stable orbits.</li>
            <li>Camera teleport shortcuts to inspect each planet instantly.</li>
            <li>Toggle orbital trails and tweak gravity multiplier on the fly.</li>
          </ul>
        </div>
      </section>

      <iframe
        src={appUrl}
        title="Cosmos Solar System"
        className="cosmos-frame"
        loading="lazy"
        allowFullScreen
      />

      <footer className="cosmos-actions">
        <a className="cosmos-link" href={appUrl} target="_blank" rel="noreferrer">
          Open full window ↗
        </a>
        <button type="button" className="cosmos-back" onClick={onBack}>
          ← Back to Apps
        </button>
      </footer>
    </div>
  );
};

export default CosmosApp;
