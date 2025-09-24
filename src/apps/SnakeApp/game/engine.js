import { createDeterministicRng, DeterministicRng } from './rng';
import { DIRECTIONS, GameStatus, DEFAULT_GRID_SIZE, DEFAULT_STEP_MS } from './constants';

const clonePosition = (position) => ({ x: position.x, y: position.y });
const directionsEqual = (a, b) => a.x === b.x && a.y === b.y;
const isOppositeDirection = (a, b) => a.x === -b.x && a.y === -b.y;
const isZeroDirection = (dir) => dir.x === 0 && dir.y === 0;

const normalizeDirection = (direction) => {
  if (!direction) {
    return DIRECTIONS.None;
  }
  const x = Math.sign(direction.x ?? 0);
  const y = Math.sign(direction.y ?? 0);
  if (x !== 0 && y !== 0) {
    // prefer horizontal movement when both axes provided
    return { x, y: 0 };
  }
  return { x, y };
};

const positionKey = (pos) => `${pos.x},${pos.y}`;

const DEFAULT_OPTIONS = {
  gridSize: DEFAULT_GRID_SIZE,
  stepMs: DEFAULT_STEP_MS,
  initialSnake: [{ x: 10, y: 10 }],
  initialFood: null,
  initialDirection: DIRECTIONS.None,
  seed: undefined
};

const GAME_OVER_REASONS = Object.freeze({
  Wall: 'wall',
  Self: 'self',
  Victory: 'victory'
});

export class SnakeGameEngine {
  constructor(options = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.gridSize = this.options.gridSize;
    this.stepMs = this.options.stepMs;
    this.seed = this.options.seed ?? `${Date.now()}`;
    this.rng = options.rng instanceof DeterministicRng
      ? options.rng.clone()
      : createDeterministicRng(this.seed, options.rngOffset ?? 0);
    this.accumulator = 0;
    this.replayEvents = [];
    this._initState();
  }

  _initState() {
    const initialSnake = this.options.initialSnake.map(clonePosition);
    const initialDirection = normalizeDirection(this.options.initialDirection);
    const foodSource = this.options.initialFood
      ? clonePosition(this.options.initialFood)
      : this._generateFood(initialSnake);

    this.state = {
      status: GameStatus.Idle,
      snake: initialSnake,
      direction: initialDirection,
      pendingDirection: initialDirection,
      food: foodSource,
      score: 0,
      step: 0,
      gameOverReason: null,
      seed: this.seed
    };
    this.accumulator = 0;
    this.replayEvents = [];
    this._logEvent({ type: 'init', payload: this._snapshotStateForReplay() });
  }

  getState() {
    return {
      status: this.state.status,
      snake: this.state.snake.map(clonePosition),
      direction: { ...this.state.direction },
      pendingDirection: { ...this.state.pendingDirection },
      food: this.state.food ? clonePosition(this.state.food) : null,
      score: this.state.score,
      step: this.state.step,
      gameOverReason: this.state.gameOverReason,
      seed: this.state.seed,
      stepMs: this.stepMs,
      gridSize: this.gridSize
    };
  }

  setDirection(direction) {
    const normalized = normalizeDirection(direction);
    const currentDirection = this.state.direction;
    if (isZeroDirection(normalized)) {
      return this.getState();
    }

    if (
      !isZeroDirection(currentDirection) &&
      isOppositeDirection(currentDirection, normalized) &&
      this.state.snake.length > 1
    ) {
      return this.getState();
    }

    if (directionsEqual(this.state.pendingDirection, normalized)) {
      return this.getState();
    }

    this.state.pendingDirection = normalized;
    if (this.state.status === GameStatus.Idle) {
      this.state.status = GameStatus.Running;
    }

    this._logEvent({
      type: 'direction',
      payload: {
        step: this.state.step,
        direction: { ...normalized }
      }
    });

    return this.getState();
  }

  start() {
    if (this.state.status === GameStatus.Idle) {
      this.state.status = GameStatus.Running;
    }
    return this.getState();
  }

  pause() {
    if (this.state.status === GameStatus.Running) {
      this.state.status = GameStatus.Paused;
    }
    return this.getState();
  }

  resume() {
    if (this.state.status === GameStatus.Paused) {
      this.state.status = GameStatus.Running;
    }
    return this.getState();
  }

  reset({ seed } = {}) {
    if (seed) {
      this.seed = String(seed);
    }
    this.rng = createDeterministicRng(this.seed);
    this._initState();
    return this.getState();
  }

  updateOptions(options = {}) {
    if (typeof options.stepMs === 'number') {
      this.stepMs = options.stepMs;
    }
    if (typeof options.gridSize === 'number' && options.gridSize !== this.gridSize) {
      this.gridSize = options.gridSize;
      this.options.gridSize = options.gridSize;
      this.reset({ seed: this.seed });
    }
    return this.getState();
  }

  tick(elapsedMs) {
    if (this.state.status !== GameStatus.Running) {
      return this.getState();
    }

    this.accumulator += typeof elapsedMs === 'number' ? elapsedMs : this.stepMs;
    while (this.accumulator >= this.stepMs && this.state.status === GameStatus.Running) {
      this.accumulator -= this.stepMs;
      this._advance();
    }
    return this.getState();
  }

  serialize() {
    return JSON.stringify({
      options: {
        gridSize: this.gridSize,
        stepMs: this.stepMs
      },
      rng: this.rng.getState(),
      state: this.getState(),
      replay: this.getReplay()
    });
  }

  load(serialized) {
    const payload = typeof serialized === 'string' ? JSON.parse(serialized) : serialized;
    if (!payload || !payload.state) {
      throw new Error('Invalid serialized state');
    }
    this.gridSize = payload.options?.gridSize ?? this.gridSize;
    this.stepMs = payload.options?.stepMs ?? this.stepMs;
    this.seed = payload.state.seed ?? this.seed;
    this.rng = payload.rng
      ? DeterministicRng.fromState(payload.rng)
      : createDeterministicRng(this.seed);

    const state = payload.state;
    this.state = {
      status: state.status,
      snake: state.snake.map(clonePosition),
      direction: { ...state.direction },
      pendingDirection: { ...state.pendingDirection },
      food: state.food ? clonePosition(state.food) : null,
      score: state.score,
      step: state.step,
      gameOverReason: state.gameOverReason ?? null,
      seed: state.seed ?? this.seed
    };
    this.accumulator = 0;
    this.replayEvents = payload.replay?.events?.map((event) => ({
      ...event,
      payload: event.payload ? { ...event.payload } : undefined
    })) ?? [];
    return this.getState();
  }

  getReplay() {
    return {
      seed: this.seed,
      options: {
        gridSize: this.gridSize,
        stepMs: this.stepMs
      },
      events: this.replayEvents.map((event) => ({
        type: event.type,
        payload: event.payload ? { ...event.payload } : undefined
      }))
    };
  }

  _advance() {
    const direction = this.state.pendingDirection;
    if (isZeroDirection(direction)) {
      return;
    }

    this.state.direction = direction;
    const currentSnake = this.state.snake.map(clonePosition);
    const head = clonePosition(currentSnake[0]);
    head.x += direction.x;
    head.y += direction.y;

    if (!this._isWithinBounds(head)) {
      this._finishGame(GAME_OVER_REASONS.Wall);
      return;
    }

    const isEating = this.state.food && head.x === this.state.food.x && head.y === this.state.food.y;
    const bodyToCheck = isEating ? currentSnake : currentSnake.slice(0, -1);
    if (this._isOccupied(head, bodyToCheck)) {
      this._finishGame(GAME_OVER_REASONS.Self);
      return;
    }

    currentSnake.unshift(head);
    if (isEating) {
      this.state.score += 1;
      const nextFood = this._generateFood(currentSnake);
      this.state.food = nextFood;
      if (!nextFood) {
        this._finishGame(GAME_OVER_REASONS.Victory, { keepRunning: false });
        return;
      }
    } else {
      currentSnake.pop();
    }

    this.state.snake = currentSnake;
    this.state.step += 1;
    this._logEvent({
      type: 'step',
      payload: {
        step: this.state.step,
        head: clonePosition(head),
        ateFood: isEating
      }
    });
  }

  _generateFood(snakeBody) {
    const occupied = new Set(snakeBody.map(positionKey));
    if (occupied.size >= this.gridSize * this.gridSize) {
      return null;
    }

    let candidate;
    let attempts = 0;
    do {
      candidate = {
        x: this.rng.nextInt(this.gridSize),
        y: this.rng.nextInt(this.gridSize)
      };
      attempts += 1;
      if (attempts > this.gridSize * this.gridSize) {
        break;
      }
    } while (occupied.has(positionKey(candidate)));
    return candidate;
  }

  _isWithinBounds(position) {
    return (
      position.x >= 0 &&
      position.x < this.gridSize &&
      position.y >= 0 &&
      position.y < this.gridSize
    );
  }

  _isOccupied(position, snakeBody) {
    return snakeBody.some((segment) => segment.x === position.x && segment.y === position.y);
  }

  _finishGame(reason, { keepRunning = false } = {}) {
    this.state.status = reason === GAME_OVER_REASONS.Victory ? GameStatus.Completed : GameStatus.GameOver;
    this.state.gameOverReason = reason;
    if (!keepRunning) {
      this.accumulator = 0;
    }
    this._logEvent({
      type: 'game_end',
      payload: {
        reason,
        step: this.state.step,
        score: this.state.score
      }
    });
  }

  _logEvent(event) {
    this.replayEvents.push({ ...event });
  }

  _snapshotStateForReplay() {
    return {
      snake: this.state.snake.map(clonePosition),
      food: this.state.food ? clonePosition(this.state.food) : null,
      direction: { ...this.state.direction },
      score: this.state.score,
      step: this.state.step,
      status: this.state.status
    };
  }
}

export { GAME_OVER_REASONS };
