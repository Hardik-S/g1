import React from 'react';
import GardenPlant from '../components/garden/GardenPlant';
import GardenLegend from '../components/garden/GardenLegend';

const GardenSection = ({ title, entries, variant }) => (
  <section className={`zen-garden-section zen-garden-section--${variant}`}>
    <header className="zen-garden-section-header">
      <h2>{title}</h2>
      {entries.length > 0 && (
        <span className="zen-garden-section-count" aria-label={`${entries.length} plants`}>
          {entries.length}
        </span>
      )}
    </header>

    {entries.length === 0 ? (
      <p className="zen-garden-empty">Nothing planted here yet. Add a task to start growing.</p>
    ) : (
      <ul className="zen-garden-plant-list">
        {entries.map((entry) => (
          <li key={entry.id} className="zen-garden-plant-item">
            <GardenPlant
              title={entry.title}
              description={entry.description}
              variant={variant}
              isComplete={entry.isSnapshot || entry.stage?.isComplete}
              stageIndex={entry.stage?.completedStages || 0}
              totalStages={entry.stage?.totalStages || 1}
              persisted={Boolean(entry.isSnapshot)}
            />
          </li>
        ))}
      </ul>
    )}
  </section>
);

const GardenView = ({ priority = [], bonus = [] }) => {
  const hasPlants = priority.length > 0 || bonus.length > 0;

  return (
    <div className="zen-garden">
      <div className="zen-garden-header">
        <div>
          <h1 className="zen-garden-title">Zen Garden</h1>
          <p className="zen-garden-subtitle">Grow today&apos;s focus work into tomorrow&apos;s blooms.</p>
        </div>
        <GardenLegend />
      </div>

      <div className="zen-garden-grid">
        <GardenSection title="Priority Grove" entries={priority} variant="priority" />
        <GardenSection title="Bonus Blooms" entries={bonus} variant="bonus" />
      </div>

      {!hasPlants && (
        <p className="zen-garden-empty zen-garden-empty--global">
          Assign tasks to the Priority or Bonus focus lists to watch seedlings sprout here.
        </p>
      )}
    </div>
  );
};

export default GardenView;
