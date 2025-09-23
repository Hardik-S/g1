import React, { useMemo, useRef } from 'react';
import TaskTree from '../components/TaskTree';
import { DAY_LABELS, DAY_ORDER } from '../constants';

const getDropIndex = (container, clientY) => {
  if (!container) return 0;
  const items = Array.from(container.querySelectorAll('[data-task-id]:not(.is-dragging)'));
  if (!items.length) return 0;
  for (let index = 0; index < items.length; index += 1) {
    const rect = items[index].getBoundingClientRect();
    if (clientY < rect.top + rect.height / 2) {
      return index;
    }
  }
  return items.length;
};

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
  const allTasksRef = useRef(null);
  const bucketRefs = useRef({});
  const dragStateRef = useRef(null);

  const clearBucketHighlights = () => {
    DAY_ORDER.forEach((dayKey) => {
      const container = bucketRefs.current[dayKey];
      if (container) {
        container.classList.remove('is-drag-over');
      }
    });
  };

  const clearDragState = () => {
    dragStateRef.current = null;
    clearBucketHighlights();
  };

  const handleRootDragStart = (task, event) => {
    dragStateRef.current = { source: 'all', taskId: task.id };
    if (event?.currentTarget) {
      event.currentTarget.classList.add('is-dragging');
    }
    if (event?.dataTransfer) {
      event.dataTransfer.effectAllowed = 'copy';
      event.dataTransfer.setData('text/plain', task.id);
    }
  };

  const handleRootDragEnd = (_, event) => {
    if (event?.currentTarget) {
      event.currentTarget.classList.remove('is-dragging');
    }
    clearDragState();
  };

  const handleBucketCardDragStart = (dayKey, task, index, event) => {
    dragStateRef.current = { source: 'day', day: dayKey, index, taskId: task.id };
    if (event?.currentTarget) {
      event.currentTarget.classList.add('is-dragging');
    }
    if (event?.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', task.id);
    }
  };

  const handleBucketCardDragEnd = (event) => {
    if (event?.currentTarget) {
      event.currentTarget.classList.remove('is-dragging');
    }
    clearDragState();
  };

  const handleBucketDragOver = (dayKey, event) => {
    if (!dragStateRef.current) return;
    event.preventDefault();
    const container = bucketRefs.current[dayKey];
    if (container) {
      container.classList.add('is-drag-over');
    }
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = dragStateRef.current.source === 'all' ? 'copy' : 'move';
    }
  };

  const handleBucketDragLeave = (dayKey, event) => {
    const container = bucketRefs.current[dayKey];
    if (!container) return;
    if (event?.relatedTarget && container.contains(event.relatedTarget)) {
      return;
    }
    container.classList.remove('is-drag-over');
  };

  const handleBucketDrop = (dayKey, event) => {
    if (!dragStateRef.current) return;
    event.preventDefault();
    const container = bucketRefs.current[dayKey];
    if (container) {
      container.classList.remove('is-drag-over');
    }
    const dropIndex = getDropIndex(container, event.clientY);
    const { taskId, source, day: sourceDay } = dragStateRef.current;
    clearDragState();

    const baseOrder = (dayAssignments[dayKey] || []).map((task) => task.id).filter((id) => id !== taskId);
    const insertionIndex = Math.min(dropIndex, baseOrder.length);
    baseOrder.splice(insertionIndex, 0, taskId);

    if (source === 'all') {
      onAssignTaskToDay(taskId, dayKey, insertionIndex);
      onReorderDay(dayKey, baseOrder);
    } else if (source === 'day') {
      if (sourceDay === dayKey) {
        onReorderDay(dayKey, baseOrder);
      } else {
        onAssignTaskToDay(taskId, dayKey, insertionIndex);
        onReorderDay(dayKey, baseOrder);
        if (sourceDay) {
          const sourceOrder = (dayAssignments[sourceDay] || []).map((task) => task.id).filter((id) => id !== taskId);
          onReorderDay(sourceDay, sourceOrder);
        }
      }
    }
  };

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
        <div className="zen-task-list" ref={allTasksRef}>
          <TaskTree
            tasks={tasks}
            expandedIds={expandedIds}
            onToggleExpand={onToggleExpand}
            onEditTask={onEditTask}
            onDeleteTask={onDeleteTask}
            onCompleteTask={onCompleteTask}
            onAddSubtask={onAddSubtask}
            onDragStartTask={handleRootDragStart}
            onDragEndTask={handleRootDragEnd}
          />
        </div>
      </section>
      <section className="zen-column zen-week">
        <h2 className="zen-section-header">Weekly Buckets</h2>
        <ul className="zen-week-list">
          {DAY_ORDER.map((dayKey) => {
            const isToday = dayKey === todayKey;
            const assignments = dayAssignments[dayKey] || [];
            const rowClassName = `zen-week-row${isToday ? ' is-today' : ''}`;
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
                  className="zen-week-bucket"
                  ref={(el) => { bucketRefs.current[dayKey] = el; }}
                  onDragEnter={(event) => handleBucketDragOver(dayKey, event)}
                  onDragOver={(event) => handleBucketDragOver(dayKey, event)}
                  onDragLeave={(event) => handleBucketDragLeave(dayKey, event)}
                  onDrop={(event) => handleBucketDrop(dayKey, event)}
                >
                  {assignments.map((task, index) => (
                    <div
                      key={task.id}
                      className="zen-week-card"
                      data-task-id={task.id}
                      draggable
                      onDragStart={(event) => handleBucketCardDragStart(dayKey, task, index, event)}
                      onDragEnd={handleBucketCardDragEnd}
                    >
                      <div className="zen-card-title">{task.title}</div>
                      {task.dueDate && <div className="zen-card-meta">Due {task.dueDate}</div>}
                    </div>
                  ))}
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
