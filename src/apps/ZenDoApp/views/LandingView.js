import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import TaskTree from '../components/TaskTree';
import { DAY_LABELS, DAY_ORDER } from '../constants';
import { useDragContext } from '../drag/DragContext';

const BACKLOG_BUCKET = 'backlog';

const LandingView = ({
  tasks,
  expandedIds,
  onToggleExpand,
  onEditTask,
  onDeleteTask,
  onCompleteTask,
  onAddSubtask,
  onAddRootTask,
  dayAssignments,
  onAssignTaskToDay,
  onReorderDay,
  onLaunchToday,
}) => {
  const bucketRefs = useRef({});
  const { dragState, beginDrag, setHoverTarget, clearHoverTarget } = useDragContext();

  const handleDrop = useCallback((snapshot) => {
    const { activeTaskId, hoverTarget, sourceBucket } = snapshot;
    if (!activeTaskId || !hoverTarget?.bucketId) {
      return;
    }

    const targetDay = hoverTarget.bucketId;
    const existingTarget = (dayAssignments[targetDay] || []).map((task) => task.id);
    const filteredTarget = existingTarget.filter((id) => id !== activeTaskId);
    const insertIndex = Math.max(0, Math.min(hoverTarget.index, filteredTarget.length));
    filteredTarget.splice(insertIndex, 0, activeTaskId);

    if (sourceBucket !== targetDay) {
      if (sourceBucket && sourceBucket !== BACKLOG_BUCKET && dayAssignments[sourceBucket]) {
        const remaining = dayAssignments[sourceBucket].filter((task) => task.id !== activeTaskId);
        onReorderDay(sourceBucket, remaining.map((task) => task.id));
      }
      onAssignTaskToDay(activeTaskId, targetDay, insertIndex);
    }

    onReorderDay(targetDay, filteredTarget);
  }, [dayAssignments, onAssignTaskToDay, onReorderDay]);

  const handleRootTaskDragStart = useCallback((event, task) => {
    beginDrag(event, {
      taskId: task.id,
      sourceBucket: BACKLOG_BUCKET,
      previewData: { task },
      onDrop: handleDrop,
    });
  }, [beginDrag, handleDrop]);

  const handleBucketDragStart = useCallback((event, task, dayKey) => {
    if (typeof event.button === 'number' && event.button !== 0) {
      return;
    }
    beginDrag(event, {
      taskId: task.id,
      sourceBucket: dayKey,
      previewData: { task },
      onDrop: handleDrop,
    });
  }, [beginDrag, handleDrop]);

  useEffect(() => {
    if (!dragState.isDragging || !dragState.pointerPosition) {
      return;
    }
    const pointer = dragState.pointerPosition;
    let matchedBucket = null;

    DAY_ORDER.forEach((dayKey) => {
      const container = bucketRefs.current[dayKey];
      if (!container) {
        return;
      }
      const rect = container.getBoundingClientRect();
      const inside = pointer.x >= rect.left && pointer.x <= rect.right && pointer.y >= rect.top && pointer.y <= rect.bottom;
      if (!inside) {
        if (dragState.hoverTarget?.bucketId === dayKey) {
          clearHoverTarget(dayKey);
        }
        return;
      }
      if (matchedBucket) {
        return;
      }
      matchedBucket = dayKey;
      const cards = Array.from(container.querySelectorAll('[data-task-id]'));
      let index = cards.length;
      for (let i = 0; i < cards.length; i += 1) {
        const cardRect = cards[i].getBoundingClientRect();
        if (pointer.y < cardRect.top + (cardRect.height / 2)) {
          index = i;
          break;
        }
      }
      setHoverTarget({ bucketId: dayKey, index, lengthHint: cards.length });
    });

    if (!matchedBucket && dragState.hoverTarget) {
      clearHoverTarget();
    }
  }, [clearHoverTarget, dragState.hoverTarget, dragState.isDragging, dragState.pointerPosition, setHoverTarget]);

  const todayKey = useMemo(() => DAY_ORDER[new Date().getDay()], []);

  return (
    <div className="zen-landing">
      <section className="zen-column zen-tasks">
        <header className="zen-section-header">
          <h2>All Tasks</h2>
          <button type="button" className="zen-primary-btn" onClick={onAddRootTask}>
            + New Task
          </button>
        </header>
        <div className="zen-task-list">
          <TaskTree
            tasks={tasks}
            expandedIds={expandedIds}
            onToggleExpand={onToggleExpand}
            onEditTask={onEditTask}
            onDeleteTask={onDeleteTask}
            onCompleteTask={onCompleteTask}
            onAddSubtask={onAddSubtask}
            onStartRootDrag={handleRootTaskDragStart}
          />
        </div>
      </section>
      <section className="zen-column zen-week">
        <h2 className="zen-section-header">Weekly Buckets</h2>
        <ul className="zen-week-list">
          {DAY_ORDER.map((dayKey) => {
            const isToday = dayKey === todayKey;
            const assignments = dayAssignments[dayKey] || [];
            const isHovered = dragState.isDragging && dragState.hoverTarget?.bucketId === dayKey;
            const rowClassName = `zen-week-row${isToday ? ' is-today' : ''}`;
            const bucketClassName = `zen-week-bucket${isHovered ? ' is-hovered' : ''}`;
            const placeholderIndex = isHovered ? dragState.hoverTarget.index : null;
            return (
              <li key={dayKey} className={rowClassName}>
                <div className="zen-week-header">
                  <span className="zen-weekday">{DAY_LABELS[dayKey]}</span>
                  {isToday && (
                    <button type="button" className="zen-play-btn" onClick={onLaunchToday} aria-label="Open Today view">
                      ▶
                    </button>
                  )}
                </div>
                <div
                  className={bucketClassName}
                  data-testid={`bucket-${dayKey}`}
                  ref={(el) => { bucketRefs.current[dayKey] = el; }}
                >
                  {assignments.reduce((elements, task, index) => {
                    if (placeholderIndex !== null && placeholderIndex === index) {
                      elements.push(
                        <div key={`placeholder-${dayKey}`} className="zen-week-card placeholder" aria-hidden="true" />,
                      );
                    }
                    const isSourceCard = dragState.isDragging
                      && dragState.activeTaskId === task.id
                      && dragState.sourceBucket === dayKey;
                    elements.push(
                      <div
                        key={task.id}
                        className={`zen-week-card${isSourceCard ? ' is-drag-source' : ''}`}
                        data-task-id={task.id}
                        onPointerDown={(event) => handleBucketDragStart(event, task, dayKey)}
                      >
                        <div className="zen-card-title">{task.title}</div>
                        {task.dueDate && <div className="zen-card-meta">Due {task.dueDate}</div>}
                      </div>,
                    );
                    return elements;
                  }, [])}
                  {placeholderIndex !== null && placeholderIndex >= assignments.length && (
                    <div key={`placeholder-${dayKey}-end`} className="zen-week-card placeholder" aria-hidden="true" />
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
};

export default LandingView;
