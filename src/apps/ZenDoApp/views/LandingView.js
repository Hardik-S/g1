import React, { useEffect, useMemo, useRef } from 'react';
import Sortable from 'sortablejs';
import TaskTree from '../components/TaskTree';
import { DAY_LABELS, DAY_ORDER } from '../constants';

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
  const sortablesRef = useRef({});

  useEffect(() => {
    const listElement = allTasksRef.current?.querySelector('.zen-task-tree');
    if (!listElement) return undefined;
    const sortable = Sortable.create(listElement, {
      group: { name: 'zen-weekly', pull: 'clone', put: false },
      animation: 150,
      sort: false,
      draggable: '.zen-root-task',
      fallbackOnBody: true,
      onEnd: (evt) => {
        if (evt.clone) {
          evt.clone.remove();
        }
        if (evt.item && evt.from !== evt.to) {
          evt.item.remove();
        }
      },
    });
    sortablesRef.current.allTasks = sortable;
    return () => {
      sortable.destroy();
      if (sortablesRef.current.allTasks === sortable) {
        delete sortablesRef.current.allTasks;
      }
    };
  }, [tasks]);

  useEffect(() => {
    DAY_ORDER.forEach((day) => {
      const container = bucketRefs.current[day];
      if (!container) return;
      if (sortablesRef.current[day]) {
        sortablesRef.current[day].destroy();
      }
      sortablesRef.current[day] = Sortable.create(container, {
        group: { name: 'zen-weekly', pull: true, put: true },
        animation: 150,
        dataIdAttr: 'data-task-id',
        fallbackOnBody: true,
        onAdd: (evt) => {
          const taskId = evt.item?.dataset?.taskId;
          if (taskId) {
            onAssignTaskToDay(taskId, day, evt.newIndex);
            const order = Array.from(evt.to.querySelectorAll('[data-task-id]')).map((el) => el.dataset.taskId);
            onReorderDay(day, order);
          }
          evt.item.remove();
        },
        onUpdate: (evt) => {
          const order = Array.from(evt.to.querySelectorAll('[data-task-id]')).map((el) => el.dataset.taskId);
          onReorderDay(day, order);
        },
        onRemove: (evt) => {
          const order = Array.from(evt.from.querySelectorAll('[data-task-id]')).map((el) => el.dataset.taskId);
          onReorderDay(day, order);
        },
      });
    });
    return () => {
      DAY_ORDER.forEach((day) => {
        if (sortablesRef.current[day]) {
          sortablesRef.current[day].destroy();
          delete sortablesRef.current[day];
        }
      });
    };
  }, [onAssignTaskToDay, onReorderDay]);

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
                <div className="zen-week-bucket" ref={(el) => { bucketRefs.current[dayKey] = el; }}>
                  {assignments.map((task) => (
                    <div key={task.id} className="zen-week-card" data-task-id={task.id}>
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
