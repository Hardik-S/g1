import React from 'react';
import { DAY_LABELS } from '../constants';
import { MAX_TASK_DEPTH } from '../taskUtils';

const formatDueDate = (dueDate) => {
  if (!dueDate) return null;
  try {
    const date = new Date(dueDate);
    if (Number.isNaN(date.getTime())) return null;
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
    }).format(date);
  } catch (error) {
    return null;
  }
};

const TaskNode = ({
  task,
  depth,
  expanded,
  onToggle,
  onEdit,
  onDelete,
  onComplete,
  onAddSubtask,
  expandedIds,
  isRoot,
  onStartRootDrag,
}) => {
  const hasChildren = task.subtasks && task.subtasks.length > 0;
  const dueLabel = formatDueDate(task.dueDate);

  const handlePointerDown = (event) => {
    if (!isRoot || typeof onStartRootDrag !== 'function') {
      return;
    }
    if (typeof event.button === 'number' && event.button !== 0) {
      return;
    }
    const interactive = event.target.closest('button, input, a, textarea, select, label');
    if (interactive) {
      return;
    }
    onStartRootDrag(event, task);
  };

  return (
    <li
      className={`zen-task-node depth-${depth} ${task.completed ? 'is-complete' : ''} ${isRoot ? 'zen-root-task' : ''}`}
      data-task-id={task.id}
    >
      <div className="zen-task-row" onPointerDown={handlePointerDown}>
        <div className="zen-task-controls">
          {hasChildren ? (
            <button
              type="button"
              className={`zen-toggle ${expanded ? 'open' : ''}`}
              onClick={() => onToggle(task.id)}
              aria-label={expanded ? 'Collapse subtasks' : 'Expand subtasks'}
            >
              {expanded ? '−' : '+'}
            </button>
          ) : (
            <span className="zen-toggle placeholder" />
          )}
          <input
            type="checkbox"
            checked={task.completed}
            onChange={() => onComplete(task.id, !task.completed)}
            aria-label={task.completed ? 'Mark as incomplete' : 'Mark as complete'}
          />
        </div>
        <div className="zen-task-main">
          <div className="zen-task-title-line">
            <span className="zen-task-title">{task.title}</span>
            {dueLabel && <span className="zen-task-badge">Due {dueLabel}</span>}
            {task.schedule?.day && (
              <span className="zen-task-badge muted">{DAY_LABELS[task.schedule.day] || task.schedule.day}</span>
            )}
            {task.schedule?.focusBucket && (
              <span className="zen-task-badge focus">{task.schedule.focusBucket === 'priority' ? 'Priority' : 'Bonus'}</span>
            )}
          </div>
          {task.description && (
            <p className="zen-task-description">{task.description}</p>
          )}
        </div>
        <div className="zen-task-actions">
          {depth < MAX_TASK_DEPTH && (
            <button
              type="button"
              className="zen-action-btn"
              onClick={() => onAddSubtask(task.id)}
              aria-label="Add subtask"
            >
              +
            </button>
          )}
          <button type="button" className="zen-action-btn" onClick={() => onEdit(task)} aria-label="Edit task">
            ✎
          </button>
          <button type="button" className="zen-action-btn" onClick={() => onDelete(task.id)} aria-label="Delete task">
            ×
          </button>
        </div>
      </div>
      {hasChildren && expanded && (
        <ul className="zen-subtasks">
          {task.subtasks.map((child) => (
            <TaskNode
              key={child.id}
              task={child}
              depth={depth + 1}
              expanded={expandedIds.has(child.id)}
              onToggle={onToggle}
              onEdit={onEdit}
              onDelete={onDelete}
              onComplete={onComplete}
              onAddSubtask={onAddSubtask}
              expandedIds={expandedIds}
              isRoot={false}
              onStartRootDrag={onStartRootDrag}
            />
          ))}
        </ul>
      )}
    </li>
  );
};

const TaskTree = ({
  tasks,
  expandedIds,
  onToggleExpand,
  onEditTask,
  onDeleteTask,
  onCompleteTask,
  onAddSubtask,
  onStartRootDrag,
}) => {
  if (!tasks.length) {
    return (
      <div className="zen-empty-list">
        <p>No tasks yet. Tap + to begin cultivating your zen garden.</p>
      </div>
    );
  }

  return (
    <ul className="zen-task-tree">
      {tasks.map((task) => (
        <TaskNode
          key={task.id}
          task={task}
          depth={0}
          expanded={expandedIds.has(task.id)}
          onToggle={onToggleExpand}
          onEdit={onEditTask}
          onDelete={onDeleteTask}
          onComplete={onCompleteTask}
          onAddSubtask={onAddSubtask}
          expandedIds={expandedIds}
          isRoot
          onStartRootDrag={onStartRootDrag}
        />
      ))}
    </ul>
  );
};

export default TaskTree;
