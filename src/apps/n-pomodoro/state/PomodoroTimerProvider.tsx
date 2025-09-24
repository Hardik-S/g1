import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';

const STORAGE_KEY = 'n-pomodoro-sessions-v2';

const colorPalette = [
  '#7F5AF0',
  '#2CB1BC',
  '#F25F4C',
  '#FFB627',
  '#26C485',
  '#9966FF',
  '#5BC0BE'
];

type PomodoroBlock = {
  id: string;
  name: string;
  minutes: number;
  color: string;
};

type PomodoroSession = {
  id: string;
  name: string;
  blocks: PomodoroBlock[];
};

type NextBlockInfo = {
  label: string | undefined;
  minutes: number | undefined;
  session: string | undefined;
} | null;

type TimelineSegment = {
  id: string;
  name: string;
  accent: string;
  completion: number;
  weight: number;
};

type PomodoroTimerContextValue = {
  providerVersion: number;
  sessions: PomodoroSession[];
  currentSessionIndex: number;
  currentBlockIndex: number;
  timeLeft: number;
  isRunning: boolean;
  isPaused: boolean;
  isComplete: boolean;
  isPlannerExpanded: boolean;
  setIsPlannerExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  isFocusMode: boolean;
  editingSessionId: string | null;
  setEditingSessionId: React.Dispatch<React.SetStateAction<string | null>>;
  currentSession: PomodoroSession | undefined;
  currentBlock: PomodoroBlock | undefined;
  accentColor: string;
  softenedAccent: string;
  editingSessionIndex: number;
  editingSession: PomodoroSession | null;
  editingSessionMinutes: number;
  totalSeconds: number;
  completedSeconds: number;
  overallProgress: number;
  blockProgress: number;
  starDensity: number;
  ritualMinutes: number;
  minutesRemaining: number;
  sessionMinutes: number;
  nextBlockInfo: NextBlockInfo;
  formatTime: (seconds: number) => string;
  focusBlock: (sessionIndex: number, blockIndex: number) => void;
  exitFocusMode: () => void;
  closeSessionEditor: () => void;
  handleFocusSession: (sessionIndex: number) => void;
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  skipForward: () => void;
  skipBackward: () => void;
  updateSessionName: (sessionId: string, name: string) => void;
  updateBlock: (
    sessionId: string,
    blockId: string,
    patch: Partial<PomodoroBlock>
  ) => void;
  addSession: () => void;
  removeSession: (sessionId: string) => void;
  addBlock: (sessionId: string) => void;
  removeBlock: (sessionId: string, blockId: string) => void;
  restoreDefaults: () => void;
  timelineSegments: TimelineSegment[];
};

const PomodoroTimerContext = createContext<PomodoroTimerContextValue | undefined>(
  undefined
);

const createId = () => Math.random().toString(36).slice(2, 9);

const createDefaultPlan = (): PomodoroSession[] => [
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
      {
        id: createId(),
        name: 'Reflect & Stretch',
        minutes: 10,
        color: '#2CB1BC'
      },
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

const readStoredPlan = (): PomodoroSession[] | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed as PomodoroSession[];
  } catch (error) {
    console.warn('Unable to read stored N-Pomodoro plan:', error);
    return null;
  }
};

export const PomodoroTimerProvider: React.FC<React.PropsWithChildren> = ({
  children
}) => {
  const initialPlanRef = useRef<PomodoroSession[] | null>(null);

  if (!initialPlanRef.current) {
    initialPlanRef.current = readStoredPlan() || createDefaultPlan();
  }

  const [sessions, setSessions] = useState<PomodoroSession[]>(
    initialPlanRef.current || []
  );
  const [currentSessionIndex, setCurrentSessionIndex] = useState(0);
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(() => {
    const firstBlock = initialPlanRef.current?.[0]?.blocks[0];
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
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [providerVersion, setProviderVersion] = useState(0);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    if (!editingSessionId) return;
    const stillExists = sessions.some((session) => session.id === editingSessionId);
    if (!stillExists) {
      setEditingSessionId(null);
    }
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
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsFocusMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFocusMode]);

  useEffect(() => {
    if (!editingSessionId || typeof window === 'undefined') return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
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

  const nextBlockInfo: NextBlockInfo = useMemo(() => {
    if (!sessions.length) return null;
    if (currentSession && currentBlockIndex < currentSession.blocks.length - 1) {
      const block = currentSession.blocks[currentBlockIndex + 1];
      return {
        label: block.name,
        minutes: block.minutes,
        session: currentSession.name
      };
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

  const formatTime = (seconds: number) => {
    const minutes = Math.max(0, Math.ceil(seconds / 60));
    return minutes.toString();
  };

  const focusBlock = useCallback(
    (sessionIndex: number, blockIndex: number) => {
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
    (sessionIndex: number) => {
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
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      return undefined;
    }

    if (!currentBlock) {
      setIsRunning(false);
      return undefined;
    }

    intervalRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
          advanceToNextBlock();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
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

  const updateSessionName = (sessionId: string, name: string) => {
    setSessions((prev) =>
      prev.map((session) =>
        session.id === sessionId ? { ...session, name } : session
      )
    );
    setIsComplete(false);
  };

  const updateBlock = (
    sessionId: string,
    blockId: string,
    patch: Partial<PomodoroBlock>
  ) => {
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
    let createdSession: PomodoroSession | null = null;
    setSessions((prev) => {
      const sessionNumber = prev.length + 1;
      const focusColor = colorPalette[sessionNumber % colorPalette.length];
      const newSession: PomodoroSession = {
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

  const removeSession = (sessionId: string) => {
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

  const addBlock = (sessionId: string) => {
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

  const removeBlock = (sessionId: string, blockId: string) => {
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
    setProviderVersion((version) => version + 1);
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  };

  const timelineSegments = useMemo<TimelineSegment[]>(() => {
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

  const contextValue: PomodoroTimerContextValue = {
    providerVersion,
    sessions,
    currentSessionIndex,
    currentBlockIndex,
    timeLeft,
    isRunning,
    isPaused,
    isComplete,
    isPlannerExpanded,
    setIsPlannerExpanded,
    isFocusMode,
    editingSessionId,
    setEditingSessionId,
    currentSession,
    currentBlock,
    accentColor,
    softenedAccent,
    editingSessionIndex,
    editingSession,
    editingSessionMinutes,
    totalSeconds,
    completedSeconds,
    overallProgress,
    blockProgress,
    starDensity,
    ritualMinutes,
    minutesRemaining,
    sessionMinutes,
    nextBlockInfo,
    formatTime,
    focusBlock,
    exitFocusMode,
    closeSessionEditor,
    handleFocusSession,
    startTimer,
    pauseTimer,
    resetTimer,
    skipForward,
    skipBackward,
    updateSessionName,
    updateBlock,
    addSession,
    removeSession,
    addBlock,
    removeBlock,
    restoreDefaults,
    timelineSegments
  };

  return (
    <PomodoroTimerContext.Provider value={contextValue}>
      {children}
    </PomodoroTimerContext.Provider>
  );
};

export const usePomodoroTimer = (): PomodoroTimerContextValue => {
  const context = useContext(PomodoroTimerContext);
  if (!context) {
    throw new Error('usePomodoroTimer must be used within a PomodoroTimerProvider');
  }
  return context;
};
