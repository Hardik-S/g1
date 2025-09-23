import React, { useMemo } from 'react';

const formatDateHeading = (value) => {
  if (!value) return 'Unknown Day';
  try {
    const date = new Date(value);
    return new Intl.DateTimeFormat(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  } catch (error) {
    return value;
  }
};

const ArchiveView = ({
  completedTasks,
  onBackToLanding,
  onDeleteTask,
  onUnarchiveTask,
}) => {
  const grouped = useMemo(() => {
    const map = new Map();
    completedTasks.forEach((task) => {
      const key = task.completedAt ? task.completedAt.slice(0, 10) : 'unknown';
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key).push(task);
    });
    const entries = Array.from(map.entries());
    entries.sort((a, b) => {
      const aTime = Date.parse(a[0]) || 0;
      const bTime = Date.parse(b[0]) || 0;
      return bTime - aTime;
    });
    return entries;
  }, [completedTasks]);

  return (
    <div className="zen-archive-view">
      <header className="zen-section-header">
        <button type="button" className="zen-inline-btn" onClick={onBackToLanding}>
          ← Back
        </button>
        <h2>Archive</h2>
      </header>
      {grouped.length === 0 ? (
        <p className="zen-empty-hint">Completed tasks will rest here once finished.</p>
      ) : (
        <div className="zen-archive-groups">
          {grouped.map(([dateKey, tasks]) => (
            <section key={dateKey} className="zen-archive-group">
              <h3>{formatDateHeading(dateKey)}</h3>
              <ul>
                {tasks.map((task) => (
                  <li key={task.id} className="zen-archive-item">
                    <div>
                      <div className="zen-archive-title">{task.title}</div>
                      {task.description && <div className="zen-archive-desc">{task.description}</div>}
                    </div>
                    <div>
                      <button
                        type="button"
                        className="zen-mini-btn"
                        onClick={() => onUnarchiveTask(task.id)}
                      >
                        Unarchive
                      </button>
                      <button type="button" className="zen-mini-btn" onClick={() => onDeleteTask(task.id)}>
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
};

export default ArchiveView;
