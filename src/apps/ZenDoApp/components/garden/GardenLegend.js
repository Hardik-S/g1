import React from 'react';

const GardenLegend = () => (
  <div className="zen-garden-legend" aria-label="Garden legend">
    <div className="zen-garden-legend-item">
      <span className="zen-garden-legend-icon zen-garden-legend-icon--canopy" aria-hidden="true" />
      <span>Growing priority canopy</span>
    </div>
    <div className="zen-garden-legend-item">
      <span className="zen-garden-legend-icon zen-garden-legend-icon--wildflower" aria-hidden="true" />
      <span>Growing bonus wildflowers</span>
    </div>
    <div className="zen-garden-legend-item">
      <span className="zen-garden-legend-icon zen-garden-legend-icon--canopy-complete" aria-hidden="true" />
      <span>Completed canopy</span>
    </div>
    <div className="zen-garden-legend-item">
      <span className="zen-garden-legend-icon zen-garden-legend-icon--wildflower-complete" aria-hidden="true" />
      <span>Wildflower complete</span>
    </div>
    <div className="zen-garden-legend-item">
      <span className="zen-garden-legend-badge">Carried forward</span>
      <span>Persisted from a previous day</span>
    </div>
  </div>
);

export default GardenLegend;
