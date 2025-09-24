import React from 'react';
import GardenTree from './GardenTree';
import GardenFlower from './GardenFlower';

const getFlowerPlacements = (count) => {
  if (count <= 0) {
    return [];
  }

  const horizontalPadding = 18; // keep flowers away from scene edges
  const horizontalSpan = 100 - horizontalPadding * 2;
  const bottomPattern = [9, 14, 7, 17];
  const scalePattern = [0.92, 1.08, 0.88, 1.15];
  const rotationPattern = [-3, 2, -2, 4];

  return Array.from({ length: count }, (_, index) => {
    const ratio = count === 1 ? 0.5 : index / (count - 1);
    const left = horizontalPadding + ratio * horizontalSpan;
    const patternIndex = index % bottomPattern.length;
    const bottom = bottomPattern[patternIndex];
    const scale = scalePattern[patternIndex];
    const rotation = rotationPattern[patternIndex];
    const alignment = left < 50 ? 'left' : 'right';

    return {
      style: {
        left: `${left}%`,
        bottom: `${bottom}%`,
        zIndex: 20 + patternIndex,
        '--flower-scale': scale,
        '--flower-rotation': `${rotation}deg`,
      },
      alignment,
    };
  });
};

const GardenScene = ({ priority = [], bonus = [] }) => {
  const hasPriority = priority.length > 0;
  const hasBonus = bonus.length > 0;
  const hasAny = hasPriority || hasBonus;

  const flowerPlacements = React.useMemo(() => getFlowerPlacements(bonus.length), [bonus.length]);

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

  const renderBonusFlower = (entry, index) => (
    <GardenFlower
      key={entry.id}
      title={entry.title}
      description={entry.description}
      isComplete={entry.isSnapshot || entry.stage?.isComplete}
      stageIndex={entry.stage?.completedStages || 0}
      totalStages={entry.stage?.totalStages || 1}
      persisted={Boolean(entry.isSnapshot)}
      placement={flowerPlacements[index] || {}}
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

      {hasBonus && (
        <section className="zen-garden-path" aria-label="Wildflower trail">
          <h2 className="zen-garden-path__title">
            Bonus Wildflowers
            <span className="zen-garden-path__count" aria-label={`${bonus.length} bonus wildflowers`}>
              {bonus.length}
            </span>
          </h2>
          <div className="zen-garden-path__flowers" role="list">
            {bonus.map((entry, index) => renderBonusFlower(entry, index))}
          </div>
        </section>
      )}

      <div className="zen-garden-scene__content">
        {hasPriority && (
          <section className="zen-garden-cluster zen-garden-cluster--priority" aria-label="Priority canopy">
            <header className="zen-garden-cluster-header">
              <h2>Priority Canopy</h2>
              <span className="zen-garden-cluster-count" aria-label={`${priority.length} priority trees`}>
                {priority.length}
              </span>
            </header>

            <div className="zen-garden-cluster-plants">{priority.map((entry) => renderPriorityTree(entry))}</div>
          </section>
        )}

        {!hasAny && (
          <div className="zen-garden-scene-empty" role="status">
            <p>Assign focus tasks to cultivate the canopy and light up the wildflower trail.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GardenScene;
