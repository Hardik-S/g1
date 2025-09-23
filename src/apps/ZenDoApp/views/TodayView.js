import React, { useRef } from 'react';
import { FOCUS_BUCKETS } from '../constants';

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

const TodayView = ({
  todayList,
  priorityList,
  bonusList,
  onAssignToBucket,
  onReorderBucket,
  onClearBucket,
  onBackToLanding,
  onOpenFocus,
  onCompleteTask,
}) => {
  const todayRef = useRef(null);
  const priorityRef = useRef(null);
  const bonusRef = useRef(null);
  const dragStateRef = useRef(null);

  const getContainerForBucket = (bucket) => {
    if (bucket === 'today') return todayRef.current;
    if (bucket === 'priority') return priorityRef.current;
    if (bucket === 'bonus') return bonusRef.current;
    return null;
  };

  const getAssignmentsForBucket = (bucket) => {
    if (bucket === 'today') return todayList;
    if (bucket === 'priority') return priorityList;
    if (bucket === 'bonus') return bonusList;
    return [];
  };

  const clearHighlights = () => {
    ['today', 'priority', 'bonus'].forEach((bucket) => {
      const container = getContainerForBucket(bucket);
      if (container) {
        container.classList.remove('is-drag-over');
      }
    });
  };

  const clearDragState = () => {
    dragStateRef.current = null;
    clearHighlights();
  };

  const handleCardDragStart = (bucket, task, index, event) => {
    dragStateRef.current = { source: bucket, taskId: task.id, index };
    if (event?.currentTarget) {
      event.currentTarget.classList.add('is-dragging');
    }
    if (event?.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', task.id);
    }
  };

  const handleCardDragEnd = (event) => {
    if (event?.currentTarget) {
      event.currentTarget.classList.remove('is-dragging');
    }
    clearDragState();
  };

  const handleListDragOver = (bucket, event) => {
    if (!dragStateRef.current) return;
    event.preventDefault();
    const container = getContainerForBucket(bucket);
    if (container) {
      container.classList.add('is-drag-over');
    }
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  };

  const handleListDragLeave = (bucket, event) => {
    const container = getContainerForBucket(bucket);
    if (!container) return;
    if (event?.relatedTarget && container.contains(event.relatedTarget)) {
      return;
    }
    container.classList.remove('is-drag-over');
  };

  const handleListDrop = (bucket, event) => {
    if (!dragStateRef.current) return;
    event.preventDefault();
    const container = getContainerForBucket(bucket);
    if (container) {
      container.classList.remove('is-drag-over');
    }
    const dropIndex = getDropIndex(container, event.clientY);
    const { taskId, source } = dragStateRef.current;
    clearDragState();

    const currentOrder = getAssignmentsForBucket(bucket)
      .map((task) => task.id)
      .filter((id) => id !== taskId);
    const insertionIndex = Math.min(dropIndex, currentOrder.length);
    currentOrder.splice(insertionIndex, 0, taskId);

    if (bucket === 'today') {
      if (source === 'today') {
        onReorderBucket('today', currentOrder);
      } else if (source === 'priority' || source === 'bonus') {
        onClearBucket(taskId);
        onReorderBucket('today', currentOrder);
        const sourceOrder = getAssignmentsForBucket(source)
          .map((task) => task.id)
          .filter((id) => id !== taskId);
        onReorderBucket(source, sourceOrder);
      }
    } else if (bucket === 'priority' || bucket === 'bonus') {
      if (source === bucket) {
        onReorderBucket(bucket, currentOrder);
      } else if (source === 'today' || source === 'priority' || source === 'bonus') {
        onAssignToBucket(taskId, bucket, insertionIndex);
        onReorderBucket(bucket, currentOrder);
        if (source === 'today') {
          const todayOrder = todayList.map((task) => task.id).filter((id) => id !== taskId);
          onReorderBucket('today', todayOrder);
        } else if (source === 'priority' || source === 'bonus') {
          const sourceOrder = getAssignmentsForBucket(source)
            .map((task) => task.id)
            .filter((id) => id !== taskId);
          onReorderBucket(source, sourceOrder);
        }
      }
    }
  };

  const renderCard = (task, bucket, index) => (
    <div
      key={task.id}
      className="zen-focus-card"
      data-task-id={task.id}
      draggable
      onDragStart={(event) => handleCardDragStart(bucket, task, index, event)}
      onDragEnd={handleCardDragEnd}
    >
      <div className="zen-card-title-row">
        <span>{task.title}</span>
        <input
          type="checkbox"
          checked={task.completed}
          onChange={() => onCompleteTask(task.id, !task.completed)}
          aria-label="Toggle completion"
        />
      </div>
      {task.dueDate && <div className="zen-card-meta">Due {task.dueDate}</div>}
    </div>
  );

  return (
    <div className="zen-today-layout">
      <section className="zen-today-column">
        <header className="zen-section-header">
          <button type="button" className="zen-inline-btn" onClick={onBackToLanding}>
            ← Back to Landing
          </button>
          <h2>Today&apos;s Flow</h2>
        </header>
        <div
          className="zen-today-list"
          ref={todayRef}
          onDragEnter={(event) => handleListDragOver('today', event)}
          onDragOver={(event) => handleListDragOver('today', event)}
          onDragLeave={(event) => handleListDragLeave('today', event)}
          onDrop={(event) => handleListDrop('today', event)}
        >
          {todayList.length === 0 ? (
            <p className="zen-empty-hint">Drag tasks from the week buckets or create something new.</p>
          ) : (
            todayList.map((task, index) => renderCard(task, 'today', index))
          )}
        </div>
      </section>
      <section className="zen-today-column">
        <header className="zen-section-header">
          <h2>Focus Buckets</h2>
        </header>
        <div className="zen-focus-grid">
          <div className="zen-focus-column">
            <h3>{FOCUS_BUCKETS.priority.title}</h3>
            <div
              className="zen-focus-drop"
              ref={priorityRef}
              onDragEnter={(event) => handleListDragOver('priority', event)}
              onDragOver={(event) => handleListDragOver('priority', event)}
              onDragLeave={(event) => handleListDragLeave('priority', event)}
              onDrop={(event) => handleListDrop('priority', event)}
            >
              {priorityList.length === 0
                ? <p className="zen-empty-hint">Set your core intentions here.</p>
                : priorityList.map((task, index) => renderCard(task, 'priority', index))}
            </div>
          </div>
          <div className="zen-focus-column">
            <h3>{FOCUS_BUCKETS.bonus.title}</h3>
            <div
              className="zen-focus-drop"
              ref={bonusRef}
              onDragEnter={(event) => handleListDragOver('bonus', event)}
              onDragOver={(event) => handleListDragOver('bonus', event)}
              onDragLeave={(event) => handleListDragLeave('bonus', event)}
              onDrop={(event) => handleListDrop('bonus', event)}
            >
              {bonusList.length === 0
                ? <p className="zen-empty-hint">Reserve bonus blooms for extra energy.</p>
                : bonusList.map((task, index) => renderCard(task, 'bonus', index))}
            </div>
          </div>
        </div>
        <div className="zen-focus-footer">
          <button type="button" className="zen-primary-btn" onClick={onOpenFocus}>
            Enter Focus Mode ▶
          </button>
        </div>
      </section>
    </div>
  );
};

export default TodayView;
