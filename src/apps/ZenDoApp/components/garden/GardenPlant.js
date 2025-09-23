import React from 'react';
import PlantStageIndicator from './PlantStageIndicator';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const GardenPlant = ({
  title,
  description,
  variant,
  isComplete,
  stageIndex,
  totalStages,
  persisted,
}) => {
  const safeTotal = Math.max(1, totalStages || 0);
  const cappedStage = clamp(stageIndex || 0, 0, safeTotal);
  const growthProgress = safeTotal === 0 ? 0 : cappedStage / safeTotal;

  const label = isComplete
    ? `${title} is fully grown`
    : `${title} is at growth stage ${Math.min(cappedStage + 1, safeTotal)} of ${safeTotal}`;

  const plantClassNames = [
    'zen-garden-plant',
    `zen-garden-plant--${variant}`,
    isComplete ? 'zen-garden-plant--mature' : 'zen-garden-plant--growing',
    persisted ? 'is-persisted' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <article className={plantClassNames} style={{ '--growth-progress': growthProgress }}>
      <div className="zen-garden-plant-graphic" aria-hidden="true">
        <span className="zen-garden-plant-stem" />
        <span className="zen-garden-plant-canopy" />
      </div>

      <div className="zen-garden-plant-details">
        <h3 className="zen-garden-plant-title">{title}</h3>
        {description && <p className="zen-garden-plant-description">{description}</p>}
        <PlantStageIndicator
          stageIndex={cappedStage}
          totalStages={safeTotal}
          isComplete={isComplete}
          label={label}
        />
        {persisted && <span className="zen-garden-plant-badge">Persisted bloom</span>}
      </div>
    </article>
  );
};

export default GardenPlant;
