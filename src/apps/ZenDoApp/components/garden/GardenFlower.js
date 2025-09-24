import React from 'react';
import GardenFlowerPopover from './GardenFlowerPopover';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const GardenFlower = ({
  title,
  description,
  isComplete,
  stageIndex,
  totalStages,
  persisted,
  placement = {},
}) => {
  const popoverId = React.useId();
  const [isActive, setIsActive] = React.useState(false);

  const safeTotal = Math.max(1, totalStages || 0);
  const cappedStage = clamp(stageIndex || 0, 0, safeTotal);
  const stageNumber = Math.min(cappedStage + 1, safeTotal);

  const stageStatus = `Wildflower stage ${Math.min(stageNumber, safeTotal)} of ${safeTotal}`;
  const completionNote = isComplete ? '. Wildflower complete.' : '.';
  const accessibleLabelBase = `${title}. ${stageStatus}${completionNote}`;
  const accessibleLabel = persisted
    ? `${accessibleLabelBase} Carried forward on the trail.`
    : accessibleLabelBase;

  const describedBy = isActive ? popoverId : undefined;
  const alignment = placement.alignment || 'center';

  const handleMouseEnter = () => setIsActive(true);
  const handleMouseLeave = () => setIsActive(false);
  const handleFocus = () => setIsActive(true);
  const handleBlur = () => setIsActive(false);
  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      setIsActive(false);
      event.currentTarget.blur();
    }
  };

  const className = [
    'zen-garden-flower',
    `zen-garden-flower--align-${alignment}`,
    isComplete ? 'zen-garden-flower--mature' : 'zen-garden-flower--growing',
    persisted ? 'is-persisted' : '',
    isActive ? 'is-active' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const baseStyle = placement.style || {};
  const style =
    isActive && typeof baseStyle.zIndex === 'number'
      ? { ...baseStyle, zIndex: baseStyle.zIndex + 30 }
      : baseStyle;

  return (
    <div className={className} style={style} role="listitem">
      <button
        type="button"
        className="zen-garden-flower__button"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        aria-haspopup="true"
        aria-expanded={isActive}
        aria-describedby={describedBy}
        aria-label={accessibleLabel}
      >
        <span className="zen-garden-flower__stem" aria-hidden="true" />
        <span className="zen-garden-flower__leaf zen-garden-flower__leaf--left" aria-hidden="true" />
        <span className="zen-garden-flower__leaf zen-garden-flower__leaf--right" aria-hidden="true" />
        <span className="zen-garden-flower__bloom" aria-hidden="true">
          <span className="zen-garden-flower__petal zen-garden-flower__petal--top" />
          <span className="zen-garden-flower__petal zen-garden-flower__petal--top-right" />
          <span className="zen-garden-flower__petal zen-garden-flower__petal--bottom-right" />
          <span className="zen-garden-flower__petal zen-garden-flower__petal--bottom" />
          <span className="zen-garden-flower__petal zen-garden-flower__petal--bottom-left" />
          <span className="zen-garden-flower__petal zen-garden-flower__petal--top-left" />
          <span className="zen-garden-flower__core" />
        </span>
        {persisted && <span className="zen-garden-flower__persisted-indicator" aria-hidden="true" />}
      </button>

      <GardenFlowerPopover
        id={popoverId}
        title={title}
        description={description}
        stageStatus={stageStatus}
        isComplete={isComplete}
        persisted={persisted}
        isVisible={isActive}
        alignment={alignment}
      />
    </div>
  );
};

export default GardenFlower;
