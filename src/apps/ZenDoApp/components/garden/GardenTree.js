import React, { useId } from 'react';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const GardenTree = ({ title, isComplete, stageIndex, totalStages, persisted }) => {
  const safeTotal = Math.max(1, totalStages || 0);
  const cappedStage = clamp(stageIndex || 0, 0, safeTotal);
  const growthProgress = clamp(cappedStage / safeTotal, 0, 1);
  const displayStage = isComplete ? safeTotal : Math.min(cappedStage + 1, safeTotal);

  const progressLabel = isComplete
    ? `${title} canopy is complete`
    : `${title} canopy growth stage ${displayStage} of ${safeTotal}`;

  const titleId = useId();
  const statusId = useId();
  const progressId = useId();

  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - growthProgress);

  const treeClassNames = [
    'zen-garden-tree',
    isComplete ? 'zen-garden-tree--mature' : 'zen-garden-tree--growing',
    persisted ? 'is-persisted' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <article className={treeClassNames} aria-labelledby={`${titleId} ${statusId}`} aria-describedby={progressId}>
      <div className="zen-garden-tree-figure" aria-hidden="true">
        <span className="zen-garden-tree-shadow" />
        <span className="zen-garden-tree-trunk" />
        <span className="zen-garden-tree-branch zen-garden-tree-branch--left" />
        <span className="zen-garden-tree-branch zen-garden-tree-branch--right" />
        <div className="zen-garden-tree-canopy">
          <div className="zen-garden-tree-progress" role="presentation">
            <svg viewBox="0 0 120 120" focusable="false" aria-hidden="true">
              <circle className="zen-garden-tree-progress-track" cx="60" cy="60" r={radius} />
              <circle
                className="zen-garden-tree-progress-fill"
                cx="60"
                cy="60"
                r={radius}
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
              />
            </svg>
          </div>
          <div className="zen-garden-tree-badge">
            <h3 id={titleId} className="zen-garden-tree-title">
              {title}
            </h3>
            <p id={statusId} className="zen-garden-tree-subtitle">
              {isComplete ? 'Canopy complete' : `Canopy stage ${displayStage} of ${safeTotal}`}
            </p>
            {persisted && <span className="zen-garden-tree-persisted">Carried forward</span>}
          </div>
        </div>
      </div>
      <span id={progressId} className="sr-only">
        {progressLabel}
      </span>
    </article>
  );
};

export default GardenTree;
