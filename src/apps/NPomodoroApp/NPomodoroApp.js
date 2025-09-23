import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback
} from 'react';
import './NPomodoroApp.css';

const STORAGE_KEY = 'n-pomodoro-sessions-v2';
const RING_RADIUS = 118;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const colorPalette = [
  '#7F5AF0',
  '#2CB1BC',
  '#F25F4C',
  '#FFB627',
  '#26C485',
  '#9966FF',
  '#5BC0BE'
];

const createId = () => Math.random().toString(36).slice(2, 9);

const createDefaultPlan = () => [
  {
    id: createId(),
    name: 'Morning Momentum',
    blocks: [
      { id: createId(), name: 'Ignition Focus', minutes: 30, color: '#7F5AF0' },
      { id: createId(), name: 'Micro Break', minutes: 5, color: '#2CB1BC' },
      { id: createId(), name: 'Deep Dive', minutes: 35, color: '#9966FF' },
      { id: createId(), name: 'Reset Walk', minutes: 10, color: '#26C485' }
    ]
  },
  {
    id: createId(),
    name: 'Midday Flow',
    blocks: [
      { id: createId(), name: 'Focus Sprint', minutes: 25, color: '#7F5AF0' },
      { id: createId(), name: 'Reflect & Stretch', minutes: 10, color: '#2CB1BC' },
      { id: createId(), name: 'Deep Work', minutes: 30, color: '#F25F4C' },
      { id: createId(), name: 'Recharge', minutes: 15, color: '#FFB627' }
    ]
  },
  {
    id: createId(),
    name: 'Evening Cooldown',
    blocks: [
      { id: createId(), name: 'Creative Focus', minutes: 20, color: '#7F5AF0' },
      { id: createId(), name: 'Pause & Breathe', minutes: 5, color: '#2CB1BC' },
      { id: createId(), name: 'Wrap Up', minutes: 20, color: '#5BC0BE' },
      { id: createId(), name: 'Celebrate', minutes: 10, color: '#F25F4C' }
    ]
  }
];

const readStoredPlan = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed;
  } catch (error) {
    console.warn('Unable to read stored N-Pomodoro plan:', error);
    return null;
  }
};

const NPomodoroApp = () => {
  const initialPlanRef = useRef();

  if (!initialPlanRef.current) {
    initialPlanRef.current = readStoredPlan() || createDefaultPlan();
  }

  const [sessions, setSessions] = useState(initialPlanRef.current);
  const [currentSessionIndex, setCurrentSessionIndex] = useState(0);
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(() => {
    const firstBlock = initialPlanRef.current[0]?.blocks[0];
    return firstBlock ? firstBlock.minutes * 60 : 0;
  });
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isPlannerExpanded, setIsPlannerExpanded] = useState(() => {
    if (typeof window === 'undefined') return true;
    return window.innerWidth >= 960;
  });
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [editingSessionId, setEditingSessionId] = useState(null);

  const intervalRef = useRef(null);

  const currentSession = sessions[currentSessionIndex];
  const currentBlock = currentSession?.blocks[currentBlockIndex];
  const accentColor = currentBlock?.color || '#7F5AF0';
  const softenedAccent = useMemo(() => {
    if (!accentColor.startsWith('#') || accentColor.length !== 7) {
      return 'rgba(255, 255, 255, 0.2)';
    }
    return `${accentColor}33`;
  }, [accentColor]);
  const editingSessionIndex = useMemo(
    () => sessions.findIndex((session) => session.id === editingSessionId),
    [sessions, editingSessionId]
  );
  const editingSession =
    editingSessionIndex >= 0 ? sessions[editingSessionIndex] : null;
  const editingSessionMinutes = useMemo(() => {
    if (!editingSession) return 0;
    return editingSession.blocks.reduce((acc, block) => acc + block.minutes, 0);
  }, [editingSession]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    if (!editingSessionId) return undefined;
    const stillExists = sessions.some(
      (session) => session.id === editingSessionId
    );
    if (!stillExists) {
      setEditingSessionId(null);
    }
    return undefined;
  }, [sessions, editingSessionId]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handleResize = () => {
      if (window.innerWidth >= 960) {
        setIsPlannerExpanded(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const body = document.body;
    if (!body) return undefined;
    const className = 'n-pomodoro-focus-active';
    if (isFocusMode) {
      body.classList.add(className);
    } else {
      body.classList.remove(className);
    }
    return () => body.classList.remove(className);
  }, [isFocusMode]);

  useEffect(() => {
    if (!isFocusMode || typeof window === 'undefined') return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsFocusMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFocusMode]);

  useEffect(() => {
    if (!editingSessionId || typeof window === 'undefined') return undefined;
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isFocusMode) {
        setEditingSessionId(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editingSessionId, isFocusMode]);

  const totalSeconds = useMemo(
    () =>
      sessions.reduce((sessionAcc, session) => {
        const blocksTotal = session.blocks.reduce(
          (blockAcc, block) => blockAcc + block.minutes * 60,
          0
        );
        return sessionAcc + blocksTotal;
      }, 0),
    [sessions]
  );

  const completedSeconds = useMemo(() => {
    let tally = 0;
    sessions.forEach((session, sessionIndex) => {
      session.blocks.forEach((block, blockIndex) => {
        const blockDuration = block.minutes * 60;
        if (sessionIndex < currentSessionIndex) {
          tally += blockDuration;
        } else if (sessionIndex === currentSessionIndex) {
          if (blockIndex < currentBlockIndex) {
            tally += blockDuration;
          } else if (blockIndex === currentBlockIndex) {
            tally += blockDuration - timeLeft;
          }
        }
      });
    });
    return tally;
  }, [sessions, currentSessionIndex, currentBlockIndex, timeLeft]);

  const overallProgress = totalSeconds
    ? Math.min(100, (completedSeconds / totalSeconds) * 100)
    : 0;

  const blockProgress = currentBlock
    ? Math.min(
        100,
        ((currentBlock.minutes * 60 - timeLeft) /
          (currentBlock.minutes * 60 || 1)) *
          100
      )
    : 0;

  const starDensity = useMemo(() => {
    const base = 240;
    return Math.max(60, Math.floor(base * (1 - overallProgress / 100)));
  }, [overallProgress]);

  const ritualMinutes = Math.round(totalSeconds / 60);
  const minutesRemaining = Math.max(
    0,
    Math.ceil((totalSeconds - completedSeconds) / 60)
  );
  const sessionMinutes = currentSession
    ? currentSession.blocks.reduce((acc, block) => acc + block.minutes, 0)
    : 0;

  const nextBlockInfo = useMemo(() => {
    if (!sessions.length) return null;
    if (currentSession && currentBlockIndex < currentSession.blocks.length - 1) {
      const block = currentSession.blocks[currentBlockIndex + 1];
      return { label: block.name, minutes: block.minutes, session: currentSession.name };
    }
    const upcomingSession = sessions[currentSessionIndex + 1];
    if (upcomingSession) {
      const block = upcomingSession.blocks[0];
      return {
        label: block?.name,
        minutes: block?.minutes,
        session: upcomingSession.name
      };
    }
    return null;
  }, [sessions, currentSession, currentBlockIndex, currentSessionIndex]);

  const formatTime = (seconds) => {
    const minutes = Math.max(0, Math.ceil(seconds / 60));
    return minutes.toString();
  };

  const focusBlock = useCallback(
    (sessionIndex, blockIndex) => {
      const session = sessions[sessionIndex];
      const block = session?.blocks[blockIndex];
      if (!block) return;
      setCurrentSessionIndex(sessionIndex);
      setCurrentBlockIndex(blockIndex);
      setTimeLeft(block.minutes * 60);
      setIsRunning(false);
      setIsPaused(false);
      setIsComplete(false);
    },
    [sessions]
  );

  const exitFocusMode = useCallback(() => {
    setIsFocusMode(false);
  }, []);

  const closeSessionEditor = useCallback(() => {
    setEditingSessionId(null);
  }, []);

  const handleFocusSession = useCallback(
    (sessionIndex) => {
      if (isFocusMode && sessionIndex === currentSessionIndex) {
        setIsFocusMode(false);
        return;
      }
      focusBlock(sessionIndex, 0);
      setIsFocusMode(true);
    },
    [focusBlock, isFocusMode, currentSessionIndex]
  );

  const advanceToNextBlock = useCallback(() => {
    if (!sessions.length || !currentSession) {
      setIsRunning(false);
      return;
    }

    if (currentBlockIndex < currentSession.blocks.length - 1) {
      const nextBlock = currentSession.blocks[currentBlockIndex + 1];
      setCurrentBlockIndex((prev) => prev + 1);
      setTimeLeft(nextBlock.minutes * 60);
      return;
    }

    if (currentSessionIndex < sessions.length - 1) {
      const nextSession = sessions[currentSessionIndex + 1];
      setCurrentSessionIndex((prev) => prev + 1);
      setCurrentBlockIndex(0);
      const block = nextSession.blocks[0];
      setTimeLeft(block ? block.minutes * 60 : 0);
      return;
    }

    setIsRunning(false);
    setIsPaused(false);
    setIsComplete(true);
    setTimeLeft(0);
  }, [
    sessions,
    currentSession,
    currentBlockIndex,
    currentSessionIndex
  ]);

  useEffect(() => {
    if (!isRunning) {
      clearInterval(intervalRef.current);
      return undefined;
    }

    if (!currentBlock) {
      setIsRunning(false);
      return undefined;
    }

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          advanceToNextBlock();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [isRunning, currentBlock, advanceToNextBlock]);

  useEffect(() => {
    if (isRunning) return;
    if (!currentBlock) {
      setTimeLeft(0);
      return;
    }
    setTimeLeft(currentBlock.minutes * 60);
  }, [currentBlock, isRunning]);

  const startTimer = () => {
    if (!currentBlock) return;
    setIsRunning(true);
    setIsPaused(false);
    setIsComplete(false);
  };

  const pauseTimer = () => {
    setIsRunning(false);
    setIsPaused(true);
  };

  const resetTimer = () => {
    if (!sessions.length) return;
    setIsRunning(false);
    setIsPaused(false);
    setIsComplete(false);
    setCurrentSessionIndex(0);
    setCurrentBlockIndex(0);
    const firstBlock = sessions[0]?.blocks[0];
    setTimeLeft(firstBlock ? firstBlock.minutes * 60 : 0);
  };

  const skipForward = () => {
    setIsRunning(false);
    setIsPaused(false);
    setIsComplete(false);
    advanceToNextBlock();
  };

  const skipBackward = () => {
    if (!sessions.length || !currentSession) return;

    setIsRunning(false);
    setIsPaused(false);
    setIsComplete(false);

    if (currentBlockIndex > 0) {
      const previousBlock = currentSession.blocks[currentBlockIndex - 1];
      setCurrentBlockIndex((prev) => prev - 1);
      setTimeLeft(previousBlock.minutes * 60);
      return;
    }

    if (currentSessionIndex > 0) {
      const previousSession = sessions[currentSessionIndex - 1];
      const lastIndex = previousSession.blocks.length - 1;
      const targetBlock = previousSession.blocks[lastIndex];
      setCurrentSessionIndex((prev) => prev - 1);
      setCurrentBlockIndex(lastIndex);
      setTimeLeft(targetBlock ? targetBlock.minutes * 60 : 0);
      return;
    }

    const block = currentSession.blocks[0];
    setTimeLeft(block ? block.minutes * 60 : 0);
  };

  const updateSessionName = (sessionId, name) => {
    setSessions((prev) =>
      prev.map((session) =>
        session.id === sessionId ? { ...session, name } : session
      )
    );
    setIsComplete(false);
  };

  const updateBlock = (sessionId, blockId, patch) => {
    setSessions((prev) =>
      prev.map((session) => {
        if (session.id !== sessionId) return session;
        return {
          ...session,
          blocks: session.blocks.map((block) =>
            block.id === blockId ? { ...block, ...patch } : block
          )
        };
      })
    );
    setIsComplete(false);
  };

  const addSession = () => {
    let createdSession = null;
    setSessions((prev) => {
      const sessionNumber = prev.length + 1;
      const focusColor = colorPalette[sessionNumber % colorPalette.length];
      const newSession = {
        id: createId(),
        name: `Session ${sessionNumber}`,
        blocks: [
          {
            id: createId(),
            name: 'Focus Block',
            minutes: 25,
            color: focusColor
          },
          {
            id: createId(),
            name: 'Recovery Break',
            minutes: 5,
            color: '#2CB1BC'
          }
        ]
      };
      createdSession = newSession;
      return [...prev, newSession];
    });
    if (createdSession) {
      setEditingSessionId(createdSession.id);
    }
    setIsComplete(false);
  };

  const removeSession = (sessionId) => {
    let removed = false;
    setSessions((prev) => {
      if (prev.length <= 1) return prev;
      const index = prev.findIndex((session) => session.id === sessionId);
      if (index === -1) return prev;
      removed = true;
      const updated = prev.filter((session) => session.id !== sessionId);

      if (!updated.length) {
        setCurrentSessionIndex(0);
        setCurrentBlockIndex(0);
        setTimeLeft(0);
        return updated;
      }

      const tentativeIndex =
        currentSessionIndex > index
          ? currentSessionIndex - 1
          : currentSessionIndex === index
          ? Math.max(0, index - 1)
          : currentSessionIndex;

      const safeIndex = Math.min(tentativeIndex, updated.length - 1);
      const nextSession = updated[safeIndex];
      const nextBlock = nextSession?.blocks[0];

      setCurrentSessionIndex(safeIndex);
      setCurrentBlockIndex(0);
      setTimeLeft(nextBlock ? nextBlock.minutes * 60 : 0);

      return updated;
    });

    if (removed) {
      setIsRunning(false);
      setIsPaused(false);
      setIsComplete(false);
      setIsFocusMode(false);
    }
    if (sessionId === editingSessionId) {
      setEditingSessionId(null);
    }
  };

  const addBlock = (sessionId) => {
    setSessions((prev) =>
      prev.map((session) => {
        if (session.id !== sessionId) return session;
        const nextIndex = session.blocks.length + 1;
        return {
          ...session,
          blocks: [
            ...session.blocks,
            {
              id: createId(),
              name: `Block ${nextIndex}`,
              minutes: 15,
              color:
                colorPalette[session.blocks.length % colorPalette.length]
            }
          ]
        };
      })
    );
    setIsComplete(false);
  };

  const removeBlock = (sessionId, blockId) => {
    let removed = false;
    setSessions((prev) =>
      prev.map((session, sessionIndex) => {
        if (session.id !== sessionId) return session;
        if (session.blocks.length <= 1) return session;
        const blockIndex = session.blocks.findIndex((block) => block.id === blockId);
        if (blockIndex === -1) return session;
        removed = true;
        const updatedBlocks = session.blocks.filter((block) => block.id !== blockId);

        if (
          sessionIndex === currentSessionIndex &&
          currentBlockIndex >= updatedBlocks.length
        ) {
          const nextIndex = Math.max(0, updatedBlocks.length - 1);
          setCurrentBlockIndex(nextIndex);
          const nextBlock = updatedBlocks[nextIndex];
          setTimeLeft(nextBlock ? nextBlock.minutes * 60 : 0);
        } else if (
          sessionIndex === currentSessionIndex &&
          currentBlockIndex > blockIndex
        ) {
          setCurrentBlockIndex((prevIndex) => prevIndex - 1);
        }

        return { ...session, blocks: updatedBlocks };
      })
    );

    if (removed) {
      setIsRunning(false);
      setIsPaused(false);
      setIsComplete(false);
    }
  };

  const restoreDefaults = () => {
    const defaults = createDefaultPlan();
    setSessions(defaults);
    setCurrentSessionIndex(0);
    setCurrentBlockIndex(0);
    const firstBlock = defaults[0]?.blocks[0];
    setTimeLeft(firstBlock ? firstBlock.minutes * 60 : 0);
    setIsRunning(false);
    setIsPaused(false);
    setIsComplete(false);
    setIsFocusMode(false);
    setEditingSessionId(null);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  };

  const timelineSegments = useMemo(() => {
    const activeBlocks = currentSession?.blocks ?? [];
    return sessions.map((session, index) => {
      const sessionSeconds = session.blocks.reduce(
        (acc, block) => acc + block.minutes * 60,
        0
      );
      let completion = 0;
      if (index < currentSessionIndex) {
        completion = 100;
      } else if (index === currentSessionIndex && sessionSeconds > 0) {
        const completedInSession = activeBlocks
          .slice(0, currentBlockIndex)
          .reduce((acc, block) => acc + block.minutes * 60, 0);
        const currentBlockDuration = currentBlock
          ? currentBlock.minutes * 60
          : 0;
        completion =
          ((completedInSession + (currentBlockDuration - timeLeft)) /
            sessionSeconds) *
          100;
        completion = Math.max(0, Math.min(100, completion));
      }
      return {
        id: session.id,
        name: session.name,
        accent: session.blocks[0]?.color || '#7F5AF0',
        completion,
        weight: Math.max(1, sessionSeconds)
      };
    });
  }, [
    sessions,
    currentSessionIndex,
    currentBlockIndex,
    currentSession,
    currentBlock,
    timeLeft
  ]);

  const renderTimerCard = (variant = 'default') => (
    <div
      className={`timer-card ${variant === 'focus' ? 'focus-mode-card' : ''}`}
      data-variant={variant}
    >
      <div className="timer-meta">
        <span className="session-label">
          Session {Math.min(currentSessionIndex + 1, sessions.length)} of {sessions.length}
        </span>
        <h2>{currentSession?.name || 'Create your first session'}</h2>
        <p className="block-label">
          {currentBlock?.name || 'Add blocks to begin your ritual'}
        </p>
      </div>

      <div className="timer-visual">
        <div className="time-display">{formatTime(timeLeft)}</div>
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

      <div className="quick-stats">
        <div className="stat-card">
          <span className="stat-label">Current block</span>
          <strong className="stat-value">
            {currentBlock ? `${currentBlock.minutes} min` : '--'}
          </strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">Session total</span>
          <strong className="stat-value">{sessionMinutes} min</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">Ritual remaining</span>
          <strong className="stat-value">{minutesRemaining} min</strong>
        </div>
        <div className="stat-card">
          <span className="stat-label">Next up</span>
          <strong className="stat-value">
            {nextBlockInfo
              ? `${
                  nextBlockInfo.session &&
                  nextBlockInfo.session !== currentSession?.name
                    ? `${nextBlockInfo.session}: `
                    : ''
                }${nextBlockInfo.label} (${nextBlockInfo.minutes} min)`
              : currentBlock
              ? 'Final block'
              : '--'}
          </strong>
        </div>
      </div>

      <div className="timer-controls">
        <button
          type="button"
          className="control-btn ghost"
          onClick={skipBackward}
          disabled={!currentBlock}
        >
          ⟲ Previous
        </button>
        {!isRunning && !isPaused && (
          <button
            type="button"
            className="control-btn primary"
            onClick={startTimer}
            disabled={!currentBlock}
          >
            ▶ Start
          </button>
        )}
        {isRunning && (
          <button
            type="button"
            className="control-btn warning"
            onClick={pauseTimer}
          >
            ⏸ Pause
          </button>
        )}
        {isPaused && !isRunning && (
          <button type="button" className="control-btn primary" onClick={startTimer}>
            ▶ Resume
          </button>
        )}
        <button
          type="button"
          className="control-btn ghost"
          onClick={resetTimer}
          disabled={!currentBlock}
        >
          ⟲ Reset
        </button>
        <button
          type="button"
          className="control-btn ghost"
          onClick={skipForward}
          disabled={!currentBlock}
        >
          Next ⟳
        </button>
      </div>

      {isComplete && (
        <div className="completion-banner">
          <h3>Cycle complete ✨</h3>
          <p>
            You navigated every planned block. Feel free to adjust your sessions and launch a
            fresh journey.
          </p>
          <button type="button" className="control-btn primary" onClick={resetTimer}>
            Restart journey
          </button>
        </div>
      )}
    </div>
  );

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
              <button
                type="button"
                className="add-session-btn"
                onClick={addSession}
              >
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

          <section className="play-panel">
            {renderTimerCard()}

            <div className="session-timeline">
              {timelineSegments.map((segment, index) => (
                <button
                  key={segment.id}
                  type="button"
                  className={`timeline-segment ${
                    index === currentSessionIndex ? 'active' : ''
                  }`}
                  style={{
                    '--segment-accent': segment.accent,
                    flexGrow: segment.weight
                  }}
                  onClick={() => focusBlock(index, 0)}
                >
                  <div
                    className="timeline-progress"
                    style={{ width: `${segment.completion}%` }}
                  />
                  <span className="timeline-label">{segment.name}</span>
                </button>
              ))}
            </div>
          </section>

          {isPlannerExpanded && (
            <button
              type="button"
              className="planner-overlay"
              onClick={() => setIsPlannerExpanded(false)}
              aria-label="Close planner"
            />
          )}
        </div>

        {editingSession && (
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
                '--session-accent':
                  editingSession.blocks[0]?.color || '#7F5AF0'
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
                            Math.min(
                              999,
                              parseInt(event.target.value, 10) || 0
                            )
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
        )}

        {isFocusMode && (
          <div
            className="focus-mode-overlay"
            role="dialog"
            aria-modal="true"
            aria-label="Focus session full screen"
            data-testid="focus-mode-overlay"
            onClick={exitFocusMode}
          >
            <div
              className="focus-mode-shell"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="focus-mode-header">
                <span className="focus-mode-subtitle">
                  {currentSession?.name || 'Focus session'}
                </span>
                <button
                  type="button"
                  className="focus-mode-close"
                  onClick={exitFocusMode}
                >
                  Exit focus
                </button>
              </div>
              {renderTimerCard('focus')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NPomodoroApp;
