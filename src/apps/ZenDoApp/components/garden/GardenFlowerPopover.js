import React from 'react';

const GardenFlowerPopover = ({
  id,
  title,
  description,
  stageStatus,
  isComplete,
  persisted,
  isVisible,
  alignment = 'center',
}) => {
  const className = [
    'zen-garden-flower__popover',
    `zen-garden-flower__popover--${alignment}`,
    isComplete ? 'zen-garden-flower__popover--mature' : 'zen-garden-flower__popover--growing',
    persisted ? 'is-persisted' : '',
    isVisible ? 'is-visible' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div id={id} role="tooltip" className={className} aria-hidden={!isVisible}>
      <header className="zen-garden-flower__popover-header">
        <h3 className="zen-garden-flower__popover-title">{title}</h3>
        {persisted && <span className="zen-garden-plant-badge">Carried forward wildflower</span>}
      </header>

      {description && <p className="zen-garden-flower__popover-description">{description}</p>}

      <p className="zen-garden-flower__popover-stage">{stageStatus}</p>

      {isComplete && <p className="zen-garden-flower__popover-complete">Wildflower complete</p>}
    </div>
  );
};

export default GardenFlowerPopover;
