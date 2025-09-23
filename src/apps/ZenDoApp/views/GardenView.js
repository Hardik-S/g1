import React from 'react';
import GardenLegend from '../components/garden/GardenLegend';
import GardenScene from '../components/garden/GardenScene';

const GardenView = ({ priority = [], bonus = [] }) => {
  return (
    <div className="zen-garden">
      <div className="zen-garden-header">
        <div>
          <h1 className="zen-garden-title">Zen Garden</h1>
          <p className="zen-garden-subtitle">Grow today&apos;s focus work into tomorrow&apos;s blooms.</p>
        </div>
        <GardenLegend />
      </div>

      <GardenScene priority={priority} bonus={bonus} />
    </div>
  );
};

export default GardenView;
