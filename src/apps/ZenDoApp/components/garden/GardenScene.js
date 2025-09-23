import React from 'react';
import GardenPlant from './GardenPlant';
import GardenTree from './GardenTree';

const GardenScene = ({ priority = [], bonus = [] }) => {
  const hasPriority = priority.length > 0;
  const hasBonus = bonus.length > 0;
  const hasAny = hasPriority || hasBonus;

  const renderPriorityTree = (entry) => (
    <GardenTree
      key={entry.id}
      title={entry.title}
      isComplete={entry.isSnapshot || entry.stage?.isComplete}
      stageIndex={entry.stage?.completedStages || 0}
      totalStages={entry.stage?.totalStages || 1}
      persisted={Boolean(entry.isSnapshot)}
    />
  );

  const renderBonusPlant = (entry) => (
    <GardenPlant
      key={entry.id}
      title={entry.title}
      description={entry.description}
      variant="bonus"
      isComplete={entry.isSnapshot || entry.stage?.isComplete}
      stageIndex={entry.stage?.completedStages || 0}
      totalStages={entry.stage?.totalStages || 1}
      persisted={Boolean(entry.isSnapshot)}
    />
  );

  return (
    <div className="zen-garden-scene">
      <div className="zen-garden-scene__layer zen-garden-scene__layer--sky" aria-hidden="true" />
      <div className="zen-garden-scene__layer zen-garden-scene__layer--hills" aria-hidden="true">
        <span className="zen-garden-hill zen-garden-hill--left" />
        <span className="zen-garden-hill zen-garden-hill--right" />
      </div>
      <div className="zen-garden-scene__layer zen-garden-scene__layer--path" aria-hidden="true" />

      <div className="zen-garden-scene__content">
        {hasPriority && (
          <section className="zen-garden-cluster zen-garden-cluster--priority" aria-label="Priority grove">
            <header className="zen-garden-cluster-header">
              <h2>Priority Grove</h2>
              <span className="zen-garden-cluster-count" aria-label={`${priority.length} priority tasks`}>
                {priority.length}
              </span>
            </header>

            <div className="zen-garden-cluster-plants">{priority.map((entry) => renderPriorityTree(entry))}</div>
          </section>
        )}

        {hasBonus && (
          <section className="zen-garden-cluster zen-garden-cluster--bonus" aria-label="Bonus blooms">
            <header className="zen-garden-cluster-header">
              <h2>Bonus Blooms</h2>
              <span className="zen-garden-cluster-count" aria-label={`${bonus.length} bonus tasks`}>
                {bonus.length}
              </span>
            </header>

            <div className="zen-garden-cluster-plants">{bonus.map((entry) => renderBonusPlant(entry))}</div>
          </section>
        )}

        {!hasAny && (
          <div className="zen-garden-scene-empty" role="status">
            <p>Assign tasks to the Priority or Bonus focus lists to watch seedlings sprout here.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GardenScene;
