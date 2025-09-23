import React from 'react';

const PlantStageIndicator = ({ stageIndex, totalStages, isComplete, label }) => {
  const safeTotal = Math.max(1, totalStages || 0);
  const completedCount = Math.max(0, Math.min(stageIndex || 0, safeTotal));
  const currentIndex = isComplete ? safeTotal - 1 : Math.min(completedCount, safeTotal - 1);

  return (
    <div className="zen-garden-stage" role="img" aria-label={label}>
      <div className="zen-garden-stage-track">
        {Array.from({ length: safeTotal }).map((_, index) => {
          const dotClassNames = [
            'zen-garden-stage-dot',
            index < completedCount || isComplete ? 'is-filled' : '',
            index === currentIndex && !isComplete ? 'is-current' : '',
          ]
            .filter(Boolean)
            .join(' ');

          return <span key={index} className={dotClassNames} />;
        })}
      </div>
    </div>
  );
};

export default PlantStageIndicator;
