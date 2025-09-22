import React, { useEffect, useRef } from 'react';
import Sortable from 'sortablejs';
import { FOCUS_BUCKETS } from '../constants';

const createSortable = (element, options) => {
  if (!element) return null;
  return Sortable.create(element, options);
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
  const sortablesRef = useRef({});

  useEffect(() => {
    sortablesRef.current.today = createSortable(todayRef.current, {
      group: { name: 'zen-today', pull: true, put: true },
      animation: 150,
      dataIdAttr: 'data-task-id',
      fallbackOnBody: true,
      onAdd: (evt) => {
        const taskId = evt.item?.dataset?.taskId;
        if (taskId) {
          onClearBucket(taskId);
          const order = Array.from(evt.to.querySelectorAll('[data-task-id]')).map((el) => el.dataset.taskId);
          onReorderBucket('today', order);
        }
        evt.item.remove();
      },
      onRemove: (evt) => {
        const order = Array.from(evt.from.querySelectorAll('[data-task-id]')).map((el) => el.dataset.taskId);
        onReorderBucket('today', order);
      },
    });

    sortablesRef.current.priority = createSortable(priorityRef.current, {
      group: { name: 'zen-today', pull: true, put: true },
      animation: 150,
      dataIdAttr: 'data-task-id',
      fallbackOnBody: true,
      onAdd: (evt) => {
        const taskId = evt.item?.dataset?.taskId;
        if (taskId) {
          onAssignToBucket(taskId, 'priority', evt.newIndex);
          const order = Array.from(evt.to.querySelectorAll('[data-task-id]')).map((el) => el.dataset.taskId);
          onReorderBucket('priority', order);
        }
        evt.item.remove();
      },
      onUpdate: (evt) => {
        const order = Array.from(evt.to.querySelectorAll('[data-task-id]')).map((el) => el.dataset.taskId);
        onReorderBucket('priority', order);
      },
      onRemove: (evt) => {
        const order = Array.from(evt.from.querySelectorAll('[data-task-id]')).map((el) => el.dataset.taskId);
        onReorderBucket('priority', order);
      },
    });

    sortablesRef.current.bonus = createSortable(bonusRef.current, {
      group: { name: 'zen-today', pull: true, put: true },
      animation: 150,
      dataIdAttr: 'data-task-id',
      fallbackOnBody: true,
      onAdd: (evt) => {
        const taskId = evt.item?.dataset?.taskId;
        if (taskId) {
          onAssignToBucket(taskId, 'bonus', evt.newIndex);
          const order = Array.from(evt.to.querySelectorAll('[data-task-id]')).map((el) => el.dataset.taskId);
          onReorderBucket('bonus', order);
        }
        evt.item.remove();
      },
      onUpdate: (evt) => {
        const order = Array.from(evt.to.querySelectorAll('[data-task-id]')).map((el) => el.dataset.taskId);
        onReorderBucket('bonus', order);
      },
      onRemove: (evt) => {
        const order = Array.from(evt.from.querySelectorAll('[data-task-id]')).map((el) => el.dataset.taskId);
        onReorderBucket('bonus', order);
      },
    });

    return () => {
      Object.values(sortablesRef.current).forEach((instance) => {
        if (instance) {
          instance.destroy();
        }
      });
    };
  }, [onAssignToBucket, onReorderBucket, onClearBucket]);

  const renderCard = (task) => (
    <div key={task.id} className="zen-focus-card" data-task-id={task.id}>
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
        <div className="zen-today-list" ref={todayRef}>
          {todayList.length === 0 ? (
            <p className="zen-empty-hint">Drag tasks from the week buckets or create something new.</p>
          ) : (
            todayList.map(renderCard)
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
            <div className="zen-focus-drop" ref={priorityRef}>
              {priorityList.length === 0 ? <p className="zen-empty-hint">Set your core intentions here.</p> : priorityList.map(renderCard)}
            </div>
          </div>
          <div className="zen-focus-column">
            <h3>{FOCUS_BUCKETS.bonus.title}</h3>
            <div className="zen-focus-drop" ref={bonusRef}>
              {bonusList.length === 0 ? <p className="zen-empty-hint">Reserve bonus blooms for extra energy.</p> : bonusList.map(renderCard)}
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
