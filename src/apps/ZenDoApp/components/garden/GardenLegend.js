import React from 'react';

const GardenLegend = () => (
  <div className="zen-garden-legend" aria-label="Garden legend">
    <div className="zen-garden-legend-item">
      <span className="zen-garden-legend-icon zen-garden-legend-icon--seedling" aria-hidden="true" />
      <span>Active priority seedlings</span>
    </div>
    <div className="zen-garden-legend-item">
      <span className="zen-garden-legend-icon zen-garden-legend-icon--bud" aria-hidden="true" />
      <span>Active bonus buds</span>
    </div>
    <div className="zen-garden-legend-item">
      <span className="zen-garden-legend-icon zen-garden-legend-icon--tree" aria-hidden="true" />
      <span>Completed priority trees</span>
    </div>
    <div className="zen-garden-legend-item">
      <span className="zen-garden-legend-icon zen-garden-legend-icon--bloom" aria-hidden="true" />
      <span>Completed bonus blooms</span>
    </div>
    <div className="zen-garden-legend-item">
      <span className="zen-garden-legend-badge">Persisted</span>
      <span>Carried over from today</span>
    </div>
  </div>
);

export default GardenLegend;
