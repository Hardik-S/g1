import React, { useMemo } from 'react';

const PLACEHOLDER_KEY = Symbol('placeholder');

const computeInsertionIndex = (event, container) => {
  const clientY = event.clientY ?? 0;
  const elements = Array.from(container.querySelectorAll('[data-task-id]'));
  for (let index = 0; index < elements.length; index += 1) {
    const element = elements[index];
    if (element.dataset.placeholder === 'true') {
      continue;
    }
    const rect = element.getBoundingClientRect();
    const middleY = rect.top + rect.height / 2;
    if (clientY <= middleY) {
      return index;
    }
  }
  return elements.length;
};

const DroppableBucket = ({
  bucketId,
  className,
  emptyHint,
  dragController,
  items,
  onDrop,
  renderItem,
  testId,
}) => {
  const { dragState, updatePlaceholder, clearHover, completeDrop } = dragController;
  const isDragging = Boolean(dragState.activeTaskId);
  const isActiveBucket = dragState.placeholder?.bucket === bucketId;
  const isHovered = dragState.overBucket === bucketId && isDragging;

  const itemEntries = useMemo(() => items.map((task, index) => ({ task, index })), [items]);

  const visibleItems = useMemo(() => {
    if (!isDragging || dragState.sourceBucket !== bucketId) {
      return itemEntries;
    }
    return itemEntries.filter((entry) => entry.task.id !== dragState.activeTaskId);
  }, [dragState.activeTaskId, dragState.sourceBucket, itemEntries, isDragging, bucketId]);

  const placeholderIndex = isActiveBucket ? dragState.placeholder?.index ?? null : null;

  const updateDragPosition = (event, containerOverride = null) => {
    const container = containerOverride || event.currentTarget;
    if (!container) {
      return;
    }
    const nextIndex = computeInsertionIndex(event, container);
    updatePlaceholder(bucketId, nextIndex, visibleItems.length);
  };

  const renderedItems = useMemo(() => {
    if (placeholderIndex == null) {
      return visibleItems;
    }
    const cappedIndex = Math.max(0, Math.min(placeholderIndex, visibleItems.length));
    const next = visibleItems.slice();
    next.splice(cappedIndex, 0, { task: PLACEHOLDER_KEY, index: cappedIndex });
    return next;
  }, [placeholderIndex, visibleItems]);

  const handleDragOver = (event) => {
    if (!isDragging) {
      return;
    }
    event.preventDefault();
    updateDragPosition(event);
  };

  const handleDragEnter = (event) => {
    if (!isDragging) {
      return;
    }
    event.preventDefault();
    updateDragPosition(event);
  };

  const handlePlaceholderDrag = (event) => {
    if (!isDragging) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const container = event.currentTarget.parentElement;
    if (!container) {
      return;
    }
    updateDragPosition(event, container);
  };

  const handleDragLeave = (event) => {
    if (!isDragging) {
      return;
    }
    if (!event.currentTarget.contains(event.relatedTarget)) {
      clearHover(bucketId);
    }
  };

  const finalizeDrop = () => {
    const result = completeDrop(bucketId);
    if (!result?.taskId) {
      return;
    }
    const index = result.index != null ? result.index : visibleItems.length;
    onDrop({ ...result, index });
  };

  const handleDrop = (event) => {
    event.preventDefault();
    finalizeDrop();
  };

  const handlePlaceholderDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();
    finalizeDrop();
  };

  const containerClassName = [className, isHovered ? 'is-hovered' : null, isActiveBucket ? 'has-placeholder' : null]
    .filter(Boolean)
    .join(' ');

  const shouldShowHint = renderedItems.length === 0 && (!isDragging || dragState.sourceBucket !== bucketId);

  return (
    <div
      className={containerClassName}
      data-testid={testId}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {shouldShowHint ? (
        <p className="zen-empty-hint">{emptyHint}</p>
      ) : (
        renderedItems.map((entry, displayIndex) => {
          if (entry.task === PLACEHOLDER_KEY) {
            return (
              <div
                key={`placeholder-${bucketId}`}
                className="zen-task-placeholder"
                data-placeholder="true"
                data-testid="drag-placeholder"
                onDragEnter={handlePlaceholderDrag}
                onDragOver={handlePlaceholderDrag}
                onDrop={handlePlaceholderDrop}
              />
            );
          }
          return renderItem(entry.task, entry.index, bucketId, displayIndex);
        })
      )}
    </div>
  );
};

export default DroppableBucket;
