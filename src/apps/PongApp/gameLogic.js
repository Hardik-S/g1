const DEFAULT_OPTIONS = {
  width: 720,
  height: 420,
  paddleWidth: 12,
  paddleHeight: 88,
  paddleOffset: 28,
  paddleSpeed: 360,
  aiSpeed: 320,
  aiReactionDistance: 14,
  ballRadius: 8,
  ballSpeed: 360,
  ballSpeedIncrement: 18,
  ballMaxSpeed: 520,
  maxBounceAngle: Math.PI / 3,
  serveAngle: Math.PI / 5,
};

const LEFT = 'left';
const RIGHT = 'right';

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function deepMergeOptions(overrides = {}) {
  return {
    ...DEFAULT_OPTIONS,
    ...overrides,
  };
}

function cloneState(state) {
  return {
    ...state,
    paddles: {
      left: { ...state.paddles.left },
      right: { ...state.paddles.right },
    },
    ball: { ...state.ball },
    scores: { ...state.scores },
  };
}

function serveBall(state, direction = 1) {
  const { bounds, options } = state;
  const { serveAngle } = options;

  state.ball.x = bounds.width / 2;
  state.ball.y = bounds.height / 2;
  state.ball.speed = options.ballSpeed;
  const verticalSign = state.nextServeVertical;
  state.nextServeVertical *= -1;

  const cos = Math.cos(serveAngle);
  const sin = Math.sin(serveAngle) * verticalSign;

  state.ball.vx = cos * state.ball.speed * direction;
  state.ball.vy = sin * state.ball.speed;

  return state;
}

function awardPoint(state, side, events) {
  state.scores[side] += 1;
  const serveDirection = side === LEFT ? 1 : -1;
  serveBall(state, serveDirection);
  events.push({
    type: 'score',
    side,
    scores: { ...state.scores },
  });
}

function handlePaddleInteraction(state, side) {
  const { ball, paddles, options } = state;
  const paddle = paddles[side];
  const headingTowardPaddle = side === LEFT ? ball.vx < 0 : ball.vx > 0;

  if (!headingTowardPaddle) {
    return 'none';
  }

  const boundary = side === LEFT ? paddle.x + options.paddleWidth : paddle.x;
  const ballEdge = side === LEFT ? ball.x - ball.radius : ball.x + ball.radius;

  const crossedBoundary = side === LEFT ? ballEdge <= boundary : ballEdge >= boundary;
  if (!crossedBoundary) {
    return 'none';
  }

  const overshoot = side === LEFT ? boundary - ballEdge : ballEdge - boundary;
  if (overshoot > ball.radius * 1.25) {
    return 'miss';
  }

  const paddleTop = paddle.y;
  const paddleBottom = paddle.y + options.paddleHeight;

  if (ball.y < paddleTop || ball.y > paddleBottom) {
    return 'miss';
  }

  const relativeIntersect = (ball.y - (paddleTop + options.paddleHeight / 2)) / (options.paddleHeight / 2);
  const clampedIntersect = clamp(relativeIntersect, -1, 1);

  const speed = Math.min(ball.speed + options.ballSpeedIncrement, options.ballMaxSpeed);
  state.ball.speed = speed;
  const bounceAngle = clampedIntersect * options.maxBounceAngle;
  const directionMultiplier = side === LEFT ? 1 : -1;

  const cos = Math.cos(bounceAngle);
  const sin = Math.sin(bounceAngle);
  state.ball.vx = cos * speed * directionMultiplier;
  state.ball.vy = sin * speed;

  state.ball.x =
    side === LEFT ? paddle.x + options.paddleWidth + ball.radius : paddle.x - ball.radius;

  return 'bounce';
}

export function createInputState(overrides = {}) {
  return {
    left: 0,
    right: 0,
    usesAi: true,
    pausePressed: false,
    ...overrides,
  };
}

export function createInitialState(overrides = {}) {
  const options = deepMergeOptions(overrides);
  const bounds = { width: options.width, height: options.height };
  const paddles = {
    left: {
      x: options.paddleOffset,
      y: (options.height - options.paddleHeight) / 2,
    },
    right: {
      x: options.width - options.paddleOffset - options.paddleWidth,
      y: (options.height - options.paddleHeight) / 2,
    },
  };

  const state = {
    options,
    bounds,
    paddles,
    ball: {
      x: bounds.width / 2,
      y: bounds.height / 2,
      vx: 0,
      vy: 0,
      radius: options.ballRadius,
      speed: options.ballSpeed,
    },
    scores: {
      left: 0,
      right: 0,
    },
    isPaused: false,
    nextServeVertical: 1,
  };

  serveBall(state, 1);

  return state;
}

export function stepGame(state, input, deltaSeconds, overrides = {}) {
  const options = { ...DEFAULT_OPTIONS, ...state.options, ...overrides };
  const bounds = { width: options.width, height: options.height };
  const events = [];
  const next = cloneState({ ...state, options, bounds });
  const clampedDelta = clamp(Number.isFinite(deltaSeconds) ? deltaSeconds : 0, 0, 0.1);

  if (input.pausePressed) {
    next.isPaused = !state.isPaused;
    input.pausePressed = false;
    events.push({ type: 'pause', isPaused: next.isPaused });
  }

  if (next.isPaused) {
    return { state: next, events };
  }

  const leftInput = clamp(input.left ?? 0, -1, 1);
  next.paddles.left.y = clamp(
    next.paddles.left.y + leftInput * options.paddleSpeed * clampedDelta,
    0,
    bounds.height - options.paddleHeight,
  );

  let rightMovement = 0;
  if (!input.usesAi) {
    rightMovement = clamp(input.right ?? 0, -1, 1);
  } else {
    const targetY = next.ball.y;
    const paddleCenter = next.paddles.right.y + options.paddleHeight / 2;
    const deltaY = targetY - paddleCenter;
    if (Math.abs(deltaY) > options.aiReactionDistance) {
      rightMovement = deltaY > 0 ? 1 : -1;
    }
  }

  const rightSpeed = input.usesAi ? options.aiSpeed : options.paddleSpeed;
  next.paddles.right.y = clamp(
    next.paddles.right.y + rightMovement * rightSpeed * clampedDelta,
    0,
    bounds.height - options.paddleHeight,
  );

  next.ball.x += next.ball.vx * clampedDelta;
  next.ball.y += next.ball.vy * clampedDelta;

  if (next.ball.y - next.ball.radius <= 0) {
    next.ball.y = next.ball.radius;
    next.ball.vy = Math.abs(next.ball.vy);
  } else if (next.ball.y + next.ball.radius >= bounds.height) {
    next.ball.y = bounds.height - next.ball.radius;
    next.ball.vy = -Math.abs(next.ball.vy);
  }

  const leftResult = handlePaddleInteraction(next, LEFT);
  if (leftResult === 'miss') {
    awardPoint(next, RIGHT, events);
    return { state: next, events };
  }

  const rightResult = handlePaddleInteraction(next, RIGHT);
  if (rightResult === 'miss') {
    awardPoint(next, LEFT, events);
    return { state: next, events };
  }

  if (next.ball.x + next.ball.radius < 0) {
    awardPoint(next, RIGHT, events);
    return { state: next, events };
  }

  if (next.ball.x - next.ball.radius > bounds.width) {
    awardPoint(next, LEFT, events);
    return { state: next, events };
  }

  return { state: next, events };
}

export { DEFAULT_OPTIONS };
export const INTERNALS = { clamp, serveBall, awardPoint, handlePaddleInteraction };
