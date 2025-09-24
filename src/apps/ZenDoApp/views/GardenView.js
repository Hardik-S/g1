import React from 'react';
import GardenLegend from '../components/garden/GardenLegend';
import GardenScene from '../components/garden/GardenScene';

const GardenView = ({ priority = [], bonus = [] }) => {
  return (
    <div className="zen-garden">
      <header className="zen-garden-header">
        <div>
          <h1 className="zen-garden-title">Zen Garden</h1>
          <p className="zen-garden-subtitle">Where steady focus paints the landscape.</p>
        </div>
        <GardenLegend />
      </header>

      <GardenScene priority={priority} bonus={bonus} />
    </div>
  );
};

export default GardenView;
