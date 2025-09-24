import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SnakeGameEngine } from './engine';
import { DIRECTIONS, GameStatus, DEFAULT_GRID_SIZE, DEFAULT_STEP_MS } from './constants';

const createEngine = (config) => new SnakeGameEngine(config);

export const useSnakeGame = (config = {}) => {
  const { gridSize = DEFAULT_GRID_SIZE, stepMs = DEFAULT_STEP_MS, seed } = config;
  const engineRef = useRef(null);
  const frameRef = useRef(null);
  const lastTimestampRef = useRef(null);

  if (!engineRef.current) {
    engineRef.current = createEngine({ gridSize, stepMs, seed });
  }

  const [state, setState] = useState(engineRef.current.getState());

  const syncState = useCallback(() => {
    setState(engineRef.current.getState());
  }, []);

  const cancelLoop = useCallback(() => {
    if (frameRef.current != null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
  }, []);

  const stepFrame = useCallback(
    (timestamp) => {
      if (lastTimestampRef.current == null) {
        lastTimestampRef.current = timestamp;
      }
      const delta = timestamp - lastTimestampRef.current;
      lastTimestampRef.current = timestamp;
      const nextState = engineRef.current.tick(delta);
      setState(nextState);
      if (nextState.status === GameStatus.Running) {
        frameRef.current = requestAnimationFrame(stepFrame);
      } else {
        frameRef.current = null;
      }
    },
    []
  );

  const ensureLoop = useCallback(() => {
    if (frameRef.current == null) {
      lastTimestampRef.current = null;
      frameRef.current = requestAnimationFrame(stepFrame);
    }
  }, [stepFrame]);

  useEffect(() => {
    return () => {
      cancelLoop();
    };
  }, [cancelLoop]);

  useEffect(() => {
    engineRef.current.updateOptions({ gridSize, stepMs });
    syncState();
  }, [gridSize, stepMs, syncState]);

  const setDirection = useCallback(
    (direction) => {
      const next = engineRef.current.setDirection(direction);
      setState(next);
      if (next.status === GameStatus.Running) {
        ensureLoop();
      }
    },
    [ensureLoop]
  );

  const start = useCallback(() => {
    const next = engineRef.current.start();
    setState(next);
    if (next.status === GameStatus.Running) {
      ensureLoop();
    }
  }, [ensureLoop]);

  const pause = useCallback(() => {
    const next = engineRef.current.pause();
    cancelLoop();
    setState(next);
  }, [cancelLoop]);

  const resume = useCallback(() => {
    const next = engineRef.current.resume();
    setState(next);
    if (next.status === GameStatus.Running) {
      ensureLoop();
    }
  }, [ensureLoop]);

  const reset = useCallback(
    ({ seed: nextSeed } = {}) => {
      const next = engineRef.current.reset({ seed: nextSeed });
      cancelLoop();
      setState(next);
    },
    [cancelLoop]
  );

  const load = useCallback(
    (payload) => {
      const next = engineRef.current.load(payload);
      cancelLoop();
      setState(next);
    },
    [cancelLoop]
  );

  const replay = useMemo(() => engineRef.current.getReplay(), [state.step, state.score]);

  return {
    state,
    actions: {
      setDirection,
      start,
      pause,
      resume,
      reset,
      load
    },
    replay,
    engine: engineRef.current
  };
};

export { DIRECTIONS, GameStatus };
