export const DIRECTIONS = Object.freeze({
  None: Object.freeze({ x: 0, y: 0 }),
  Up: Object.freeze({ x: 0, y: -1 }),
  Down: Object.freeze({ x: 0, y: 1 }),
  Left: Object.freeze({ x: -1, y: 0 }),
  Right: Object.freeze({ x: 1, y: 0 })
});

export const GameStatus = Object.freeze({
  Idle: 'idle',
  Running: 'running',
  Paused: 'paused',
  GameOver: 'game_over',
  Completed: 'completed'
});

export const DEFAULT_GRID_SIZE = 20;
export const DEFAULT_STEP_MS = 120;
