import React from 'react';

const RING_RADIUS = 118;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

type TimerCardProps = {
  variant?: 'default' | 'focus' | 'mini';
  sessionLabel: string;
  sessionName: string;
  blockLabel: string;
  timeLabel: string;
  accentColor: string;
  softenedAccent: string;
  blockProgress: number;
  currentBlockDurationLabel: string;
  sessionTotalLabel: string;
  ritualRemainingLabel: string;
  nextUpLabel: string;
  controlsDisabled: boolean;
  isRunning: boolean;
  isPaused: boolean;
  isComplete: boolean;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onSkipBackward: () => void;
  onSkipForward: () => void;
};

const TimerCard: React.FC<TimerCardProps> = ({
  variant = 'default',
  sessionLabel,
  sessionName,
  blockLabel,
  timeLabel,
  accentColor,
  softenedAccent,
  blockProgress,
  currentBlockDurationLabel,
  sessionTotalLabel,
  ritualRemainingLabel,
  nextUpLabel,
  controlsDisabled,
  isRunning,
  isPaused,
  isComplete,
  onStart,
  onPause,
  onReset,
  onSkipBackward,
  onSkipForward
}) => {
  const showQuickStats = variant !== 'mini';
  const showCompletionBanner = variant !== 'mini' && isComplete;

  return (
    <div
      className={`timer-card ${variant === 'focus' ? 'focus-mode-card' : ''}`}
      data-variant={variant}
    >
      <div className="timer-meta">
        <span className="session-label">{sessionLabel}</span>
        <h2>{sessionName}</h2>
        <p className="block-label">{blockLabel}</p>
      </div>

      <div className="timer-visual">
        <div className="time-display">{timeLabel}</div>
        <svg className="progress-ring" viewBox="0 0 260 260">
          <circle className="progress-ring-bg" cx="130" cy="130" r={RING_RADIUS} />
          <circle
            className="progress-ring-track"
            cx="130"
            cy="130"
            r={RING_RADIUS}
            style={{ stroke: softenedAccent }}
          />
          <circle
            className="progress-ring-indicator"
            cx="130"
            cy="130"
            r={RING_RADIUS}
            style={{
              stroke: accentColor,
              strokeDasharray: RING_CIRCUMFERENCE,
              strokeDashoffset: RING_CIRCUMFERENCE * (1 - blockProgress / 100)
            }}
          />
        </svg>
      </div>

      {showQuickStats && (
        <div className="quick-stats">
          <div className="stat-card">
            <span className="stat-label">Current block</span>
            <strong className="stat-value">{currentBlockDurationLabel}</strong>
          </div>
          <div className="stat-card">
            <span className="stat-label">Session total</span>
            <strong className="stat-value">{sessionTotalLabel}</strong>
          </div>
          <div className="stat-card">
            <span className="stat-label">Ritual remaining</span>
            <strong className="stat-value">{ritualRemainingLabel}</strong>
          </div>
          <div className="stat-card">
            <span className="stat-label">Next up</span>
            <strong className="stat-value">{nextUpLabel}</strong>
          </div>
        </div>
      )}

      <div className="timer-controls">
        <button
          type="button"
          className="control-btn ghost"
          onClick={onSkipBackward}
          disabled={controlsDisabled}
        >
          ⟲ Previous
        </button>
        {!isRunning && !isPaused && (
          <button
            type="button"
            className="control-btn primary"
            onClick={onStart}
            disabled={controlsDisabled}
          >
            ▶ Start
          </button>
        )}
        {isRunning && (
          <button type="button" className="control-btn warning" onClick={onPause}>
            ⏸ Pause
          </button>
        )}
        {isPaused && !isRunning && (
          <button type="button" className="control-btn primary" onClick={onStart}>
            ▶ Resume
          </button>
        )}
        <button
          type="button"
          className="control-btn ghost"
          onClick={onReset}
          disabled={controlsDisabled}
        >
          ⟲ Reset
        </button>
        <button
          type="button"
          className="control-btn ghost"
          onClick={onSkipForward}
          disabled={controlsDisabled}
        >
          Next ⟳
        </button>
      </div>

      {showCompletionBanner && (
        <div className="completion-banner">
          <h3>Cycle complete ✨</h3>
          <p>
            You navigated every planned block. Feel free to adjust your sessions and
            launch a fresh journey.
          </p>
          <button type="button" className="control-btn primary" onClick={onReset}>
            Restart journey
          </button>
        </div>
      )}
    </div>
  );
};

export type { TimerCardProps };
export default TimerCard;
