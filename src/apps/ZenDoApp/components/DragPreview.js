import React from 'react';
import { createPortal } from 'react-dom';
import { useDragContext } from '../drag/DragContext';

const DragPreview = () => {
  const { dragState } = useDragContext();
  const { isDragging, pointerPosition, pointerOffset, previewSize, previewData } = dragState;

  if (typeof document === 'undefined' || !isDragging || !pointerPosition) {
    return null;
  }

  const offsetX = pointerOffset?.x ?? 0;
  const offsetY = pointerOffset?.y ?? 0;
  const width = previewSize?.width || 260;
  const height = previewSize?.height || undefined;
  const left = pointerPosition.x - offsetX;
  const top = pointerPosition.y - offsetY;
  const task = previewData?.task ?? previewData ?? null;

  const preview = (
    <div className="zen-drag-preview" style={{ transform: `translate3d(${left}px, ${top}px, 0)`, width, height }} aria-hidden="true">
      <div className="zen-week-card zen-drag-card">
        <div className="zen-card-title">{task?.title || ''}</div>
        {task?.dueDate && <div className="zen-card-meta">Due {task.dueDate}</div>}
      </div>
    </div>
  );

  return createPortal(preview, document.body);
};

export default DragPreview;
