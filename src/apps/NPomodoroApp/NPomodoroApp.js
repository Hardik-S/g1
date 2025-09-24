import React from 'react';
import './NPomodoroApp.css';
import TimerCard from './components/TimerCard';
import MiniTimerWindow from '../../components/MiniTimerWindow';
import {
  PomodoroTimerProvider,
  usePomodoroTimer
} from '../n-pomodoro/state/PomodoroTimerProvider';

const createTimerCardProps = (timerState) => {
  const {
    sessions,
    currentSessionIndex,
    currentSession,
    currentBlock,
    formatTime,
    timeLeft,
    softenedAccent,
    accentColor,
    blockProgress,
    sessionMinutes,
    minutesRemaining,
    nextBlockInfo,
    startTimer,
    pauseTimer,
    resetTimer,
    skipBackward,
    skipForward,
    isRunning,
    isPaused,
    isComplete
  } = timerState;

  const sessionCount = sessions.length;
  const sessionLabel = `Session ${Math.min(currentSessionIndex + 1, sessionCount)} of ${sessionCount}`;
  const sessionName = currentSession?.name || 'Create your first session';
  const blockLabel = currentBlock?.name || 'Add blocks to begin your ritual';
  const currentBlockDurationLabel = currentBlock ? `${currentBlock.minutes} min` : '--';
  const sessionTotalLabel = `${sessionMinutes} min`;
  const ritualRemainingLabel = `${minutesRemaining} min`;

  let nextUpLabel;
  if (nextBlockInfo) {
    const prefix =
      nextBlockInfo.session && nextBlockInfo.session !== currentSession?.name
        ? `${nextBlockInfo.session}: `
        : '';
    nextUpLabel = `${prefix}${nextBlockInfo.label} (${nextBlockInfo.minutes} min)`;
  } else if (currentBlock) {
    nextUpLabel = 'Final block';
  } else {
    nextUpLabel = '--';
  }

  return {
    sessionLabel,
    sessionName,
    blockLabel,
    timeLabel: formatTime(timeLeft),
    accentColor,
    softenedAccent,
    blockProgress,
    currentBlockDurationLabel,
    sessionTotalLabel,
    ritualRemainingLabel,
    nextUpLabel,
    controlsDisabled: !currentBlock,
    isRunning,
    isPaused,
    isComplete,
    onStart: startTimer,
    onPause: pauseTimer,
    onReset: resetTimer,
    onSkipBackward: skipBackward,
    onSkipForward: skipForward
  };
};

const PlannerPanel = () => {
  const {
    sessions,
    currentSessionIndex,
    isFocusMode,
    editingSessionId,
    setEditingSessionId,
    addSession,
    restoreDefaults
  } = usePomodoroTimer();

  return (
    <aside className="planner-panel">
      <div className="planner-header">
        <h2>Session planner</h2>
        <p>
          Compose as many sessions as you need (five and beyond), give
          each block a purpose, and sculpt the flow of your day.
        </p>
      </div>

      <div className="session-stack">
        {sessions.map((session, index) => {
          const totalMinutes = session.blocks.reduce(
            (acc, block) => acc + block.minutes,
            0
          );
          const isActiveSession = index === currentSessionIndex;
          const isSessionFocused = isActiveSession && isFocusMode;
          const isEditing = session.id === editingSessionId;
          const accent = session.blocks[0]?.color || '#7F5AF0';
          return (
            <button
              key={session.id}
              type="button"
              className={`session-preview ${
                isActiveSession ? 'active' : ''
              } ${isEditing ? 'editing' : ''} ${
                isSessionFocused ? 'focused' : ''
              }`}
              data-testid="session-preview"
              style={{ '--session-accent': accent }}
              onClick={() => setEditingSessionId(session.id)}
              aria-haspopup="dialog"
            >
              <span className="session-preview-accent" aria-hidden="true" />
              <span className="session-preview-content">
                <span className="session-preview-name">{session.name}</span>
                <span className="session-preview-meta">
                  {totalMinutes} min · {session.blocks.length}{' '}
                  {session.blocks.length === 1 ? 'block' : 'blocks'}
                </span>
              </span>
              <span className="session-preview-indicator">Edit</span>
            </button>
          );
        })}
      </div>

      <div className="planner-footer">
        <button type="button" className="add-session-btn" onClick={addSession}>
          + Add session
        </button>
        <button
          type="button"
          className="restore-defaults-btn"
          onClick={restoreDefaults}
        >
          Restore defaults
        </button>
      </div>
    </aside>
  );
};

const SessionTimeline = () => {
  const { timelineSegments, currentSessionIndex, focusBlock } = usePomodoroTimer();

  return (
    <div className="session-timeline">
      {timelineSegments.map((segment, index) => (
        <button
          key={segment.id}
          type="button"
          className={`timeline-segment ${index === currentSessionIndex ? 'active' : ''}`}
          style={{
            '--segment-accent': segment.accent,
            flexGrow: segment.weight
          }}
          onClick={() => focusBlock(index, 0)}
        >
          <div className="timeline-progress" style={{ width: `${segment.completion}%` }} />
          <span className="timeline-label">{segment.name}</span>
        </button>
      ))}
    </div>
  );
};

const PlayPanel = () => {
  const timerState = usePomodoroTimer();
  const timerCardProps = createTimerCardProps(timerState);

  return (
    <section className="play-panel">
      <TimerCard {...timerCardProps} />
      <SessionTimeline />
    </section>
  );
};

const SessionEditorModal = () => {
  const {
    sessions,
    currentSessionIndex,
    currentBlockIndex,
    isFocusMode,
    editingSession,
    editingSessionIndex,
    editingSessionMinutes,
    closeSessionEditor,
    handleFocusSession,
    removeSession,
    updateSessionName,
    updateBlock,
    removeBlock,
    addBlock,
    focusBlock
  } = usePomodoroTimer();

  if (!editingSession) {
    return null;
  }

  return (
    <div
      className="session-editor-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`Edit ${editingSession.name}`}
      data-testid="session-editor-modal"
      onClick={closeSessionEditor}
    >
      <div
        className="session-editor-shell"
        style={{
          '--session-accent': editingSession.blocks[0]?.color || '#7F5AF0'
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="session-editor-header">
          <div className="session-editor-title">
            <input
              className="session-name-input"
              value={editingSession.name}
              onChange={(event) =>
                updateSessionName(editingSession.id, event.target.value)
              }
              autoFocus
            />
            <span className="session-duration">
              {editingSessionMinutes} min planned
            </span>
          </div>
          <button
            type="button"
            className="session-editor-close"
            onClick={closeSessionEditor}
            aria-label="Close session editor"
          >
            ✕
          </button>
        </div>
        <div className="session-editor-actions">
          <button
            type="button"
            className={`session-focus-btn ${
              editingSessionIndex === currentSessionIndex && isFocusMode
                ? 'active'
                : ''
            }`}
            onClick={() => handleFocusSession(editingSessionIndex)}
            aria-pressed={
              editingSessionIndex === currentSessionIndex && isFocusMode
            }
            disabled={editingSessionIndex === -1}
          >
            {editingSessionIndex === currentSessionIndex && isFocusMode
              ? 'Exit focus'
              : 'Focus session'}
          </button>
          <button
            type="button"
            className="session-remove-btn"
            onClick={() => removeSession(editingSession.id)}
            disabled={sessions.length <= 1}
          >
            Remove session
          </button>
        </div>
        <div className="block-editor">
          {editingSession.blocks.map((block, blockIndex) => (
            <div
              key={block.id}
              className={`block-row ${
                editingSessionIndex === currentSessionIndex &&
                blockIndex === currentBlockIndex
                  ? 'current'
                  : ''
              }`}
              data-testid="block-row"
            >
              <button
                type="button"
                className="block-handle"
                onClick={() => focusBlock(editingSessionIndex, blockIndex)}
              >
                {blockIndex + 1}
              </button>
              <input
                className="block-name-input"
                value={block.name}
                onChange={(event) =>
                  updateBlock(editingSession.id, block.id, {
                    name: event.target.value
                  })
                }
              />
              <div className="block-duration-input">
                <input
                  type="number"
                  min="1"
                  max="999"
                  value={block.minutes}
                  onChange={(event) => {
                    const value = Math.max(
                      1,
                      Math.min(999, parseInt(event.target.value, 10) || 0)
                    );
                    updateBlock(editingSession.id, block.id, {
                      minutes: value
                    });
                  }}
                />
                <span>min</span>
              </div>
              <input
                type="color"
                className="block-color-input"
                value={block.color}
                onChange={(event) =>
                  updateBlock(editingSession.id, block.id, {
                    color: event.target.value
                  })
                }
              />
              <button
                type="button"
                className="block-remove-btn"
                onClick={() => removeBlock(editingSession.id, block.id)}
                disabled={editingSession.blocks.length <= 1}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          className="add-block-btn"
          onClick={() => addBlock(editingSession.id)}
        >
          + Add block
        </button>
      </div>
    </div>
  );
};

const FocusModeOverlay = () => {
  const timerState = usePomodoroTimer();
  const { isFocusMode, currentSession, exitFocusMode } = timerState;

  if (!isFocusMode) {
    return null;
  }

  const timerCardProps = createTimerCardProps(timerState);

  return (
    <div
      className="focus-mode-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Focus session full screen"
      data-testid="focus-mode-overlay"
      onClick={exitFocusMode}
    >
      <div className="focus-mode-shell" onClick={(event) => event.stopPropagation()}>
        <div className="focus-mode-header">
          <span className="focus-mode-subtitle">
            {currentSession?.name || 'Focus session'}
          </span>
          <button type="button" className="focus-mode-close" onClick={exitFocusMode}>
            Exit focus
          </button>
        </div>
        <TimerCard variant="focus" {...timerCardProps} />
      </div>
    </div>
  );
};

const NPomodoroAppContent = () => {
  const timerState = usePomodoroTimer();
  const {
    starDensity,
    overallProgress,
    ritualMinutes,
    isPlannerExpanded,
    setIsPlannerExpanded
  } = timerState;
  const [isMiniTimerOpen, setIsMiniTimerOpen] = React.useState(false);
  const miniTimerWindowRef = React.useRef(null);

  const handleMiniTimerButtonClick = React.useCallback(() => {
    const popup = miniTimerWindowRef.current;
    if (popup && !popup.closed) {
      popup.focus();
      return;
    }
    setIsMiniTimerOpen(true);
  }, []);

  const handleMiniTimerOpen = React.useCallback((popup) => {
    miniTimerWindowRef.current = popup || null;
  }, []);

  const handleMiniTimerClose = React.useCallback(() => {
    miniTimerWindowRef.current = null;
    setIsMiniTimerOpen(false);
  }, []);

  const handleMiniTimerBlocked = React.useCallback(() => {
    miniTimerWindowRef.current = null;
    setIsMiniTimerOpen(false);
  }, []);

  return (
    <div className="n-pomodoro-app">
      <div className="cosmic-backdrop">
        <div className="stellar-dust" style={{ '--star-count': starDensity }} />
        <div className="aurora" />
      </div>

      <div className="n-pomodoro-shell">
        <header className="n-pomodoro-header">
          <div className="header-copy">
            <h1>N-Pomodoro Designer</h1>
            <p>
              Build intentional focus rituals that span multiple sessions. Name
              every block, tune durations, and let the cosmic timer carry you
              from lift-off to landing.
            </p>
          </div>
          <div className="header-actions">
            <div className="journey-progress">
              <span className="label">Journey Progress</span>
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{ width: `${overallProgress}%` }}
                />
              </div>
              <span className="value">{Math.round(overallProgress)}%</span>
              <span className="supplement">{ritualMinutes} min planned</span>
            </div>
            <button
              type="button"
              className="popout-timer-btn"
              onClick={handleMiniTimerButtonClick}
              aria-pressed={isMiniTimerOpen}
              aria-label={
                isMiniTimerOpen ? 'Focus mini timer window' : 'Open mini timer window'
              }
              title="Pop out timer"
            >
              Pop out timer
            </button>
            <button
              type="button"
              className="planner-toggle"
              onClick={() => setIsPlannerExpanded((prev) => !prev)}
            >
              {isPlannerExpanded ? 'Hide planner' : 'Show planner'}
            </button>
          </div>
        </header>

        <div
          className={`n-pomodoro-layout ${
            isPlannerExpanded ? 'planner-open' : 'planner-collapsed'
          }`}
        >
          <PlannerPanel />
          <PlayPanel />

          {isPlannerExpanded && (
            <button
              type="button"
              className="planner-overlay"
              onClick={() => setIsPlannerExpanded(false)}
              aria-label="Close planner"
            />
          )}
        </div>

        <SessionEditorModal />
        <FocusModeOverlay />
        {isMiniTimerOpen && (
          <MiniTimerWindow
            windowName="n-pomodoro-mini-timer"
            onOpen={handleMiniTimerOpen}
            onClose={handleMiniTimerClose}
            onBlocked={handleMiniTimerBlocked}
            width={360}
            height={520}
          >
            <div className="mini-timer-window">
              <TimerCard variant="mini" {...createTimerCardProps(timerState)} />
            </div>
          </MiniTimerWindow>
        )}
      </div>
    </div>
  );
};

const NPomodoroApp = () => (
  <PomodoroTimerProvider>
    <NPomodoroAppContent />
  </PomodoroTimerProvider>
);

export default NPomodoroApp;
