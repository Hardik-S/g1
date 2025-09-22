import React, { useEffect, useMemo, useRef, useState } from 'react';

const FOCUS_SECONDS = 25 * 60;
const BREAK_SECONDS = 5 * 60;

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const FocusTask = ({ task, onToggle }) => (
  <div className={`zen-focus-task ${task.completed ? 'is-complete' : ''}`}>
    <div className="zen-focus-task-row">
      <input
        type="checkbox"
        checked={task.completed}
        onChange={() => onToggle(task.id, !task.completed)}
        aria-label={task.completed ? 'Mark as incomplete' : 'Mark as complete'}
      />
      <div className="zen-focus-task-body">
        <div className="zen-focus-task-title">{task.title}</div>
        {task.description && <div className="zen-focus-task-desc">{task.description}</div>}
        {task.dueDate && <div className="zen-focus-task-meta">Due {task.dueDate}</div>}
      </div>
    </div>
    {task.subtasks?.length > 0 && (
      <div className="zen-focus-subtasks">
        {task.subtasks.map((child) => (
          <FocusTask key={child.id} task={child} onToggle={onToggle} />
        ))}
      </div>
    )}
  </div>
);

const FocusView = ({
  priorityList,
  bonusList,
  onCompleteTask,
  onBackToToday,
}) => {
  const [phase, setPhase] = useState('focus');
  const [secondsLeft, setSecondsLeft] = useState(FOCUS_SECONDS);
  const [paused, setPaused] = useState(false);
  const intervalRef = useRef(null);

  useEffect(() => {
    setSecondsLeft(phase === 'focus' ? FOCUS_SECONDS : BREAK_SECONDS);
  }, [phase]);

  useEffect(() => {
    if (paused) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return undefined;
    }
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setPhase((current) => (current === 'focus' ? 'break' : 'focus'));
          return prev === 0 ? 0 : 0;
        }
        return prev - 1;
      });
      return undefined;
    }, 1000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [paused]);

  useEffect(() => () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  }, []);

  const formattedTime = useMemo(() => formatTime(secondsLeft), [secondsLeft]);
  const phaseLabel = phase === 'focus' ? 'Focus' : 'Rest';

  const handleSkip = () => {
    setPhase((current) => (current === 'focus' ? 'break' : 'focus'));
  };

  const handlePauseToggle = () => {
    setPaused((prev) => !prev);
  };

  return (
    <div className="zen-focus-layout">
      <header className="zen-focus-header">
        <button type="button" className="zen-inline-btn" onClick={onBackToToday}>
          ← Back to Today
        </button>
        <div className="zen-timer" aria-live="polite">
          <div className="zen-timer-label">{phaseLabel}</div>
          <div className="zen-timer-display">{formattedTime}</div>
          <div className="zen-timer-controls">
            <button
              type="button"
              onClick={handlePauseToggle}
              aria-label={paused ? 'Resume timer' : 'Pause timer'}
            >
              {paused ? '▶️' : '⏸️'}
            </button>
            <button type="button" onClick={handleSkip} aria-label="Skip phase">
              ⏭️
            </button>
          </div>
        </div>
      </header>
      <div className="zen-focus-columns">
        <section className="zen-focus-primary">
          <h2>Priority Garden</h2>
          {priorityList.length === 0 ? (
            <p className="zen-empty-hint">Assign key tasks in Today view to cultivate here.</p>
          ) : (
            priorityList.map((task) => (
              <FocusTask key={task.id} task={task} onToggle={onCompleteTask} />
            ))
          )}
        </section>
        <section className="zen-focus-secondary">
          <h2>Bonus Blooms</h2>
          {bonusList.length === 0 ? (
            <p className="zen-empty-hint">Lightweight wins wait patiently.</p>
          ) : (
            bonusList.map((task) => (
              <FocusTask key={task.id} task={task} onToggle={onCompleteTask} />
            ))
          )}
        </section>
      </div>
    </div>
  );
};

export default FocusView;
