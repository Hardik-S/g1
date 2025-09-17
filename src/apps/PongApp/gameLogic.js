const DEFAULT_OPTIONS = {
  width: 720,
  height: 420,
  paddleWidth: 12,
  paddleHeight: 88,
  paddleOffset: 28,
  paddleSpeed: 360,
  aiSpeed: 320,
  aiReactionDistance: 14,
  aiDelay: 0,
  ballRadius: 8,
  ballSpeed: 360,
  ballSpeedIncrement: 18,
  ballMaxSpeed: 520,
  maxBounceAngle: Math.PI / 3,
  serveAngle: Math.PI / 5,
  winScore: 3,
  krazyWinScore: 10,
  krazyPasses: 5,
  krazyMode: false,
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
    balls: state.balls.map(ball => ({ ...ball })),
    scores: { ...state.scores },
  };
}

function serveBall(state, direction = 1) {
  const { bounds, options } = state;
  const { serveAngle } = options;

  const verticalSign = state.nextServeVertical;
  state.nextServeVertical *= -1;

  const cos = Math.cos(serveAngle);
  const sin = Math.sin(serveAngle) * verticalSign;

  const speed = options.ballSpeed;
  return {
    id: state.nextBallId += 1,
    x: bounds.width / 2,
    y: bounds.height / 2,
    vx: cos * speed * direction,
    vy: sin * speed,
    radius: options.ballRadius,
    speed,
  };
}

function awardPoint(state, side, events) {
  state.scores[side] += 1;
  const serveDirection = side === LEFT ? 1 : -1;
  const winner = state.scores[side] >= state.options.winScore;

  events.push({
    type: 'score',
    side,
    scores: { ...state.scores },
  });

  if (winner) {
    state.isPaused = true;
    state.winner = side;
    state.balls = [];
    events.push({ type: 'win', winner: side, scores: { ...state.scores } });
    return;
  }

  state.balls = [serveBall(state, serveDirection)];
  state.successfulPasses = 0;
  if (serveDirection === 1) {
    state.aiDelayTimer = 0;
  }
}

function handlePaddleInteraction(state, ball, side) {
  const { paddles, options } = state;
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
  ball.speed = speed;
  const bounceAngle = clampedIntersect * options.maxBounceAngle;
  const directionMultiplier = side === LEFT ? 1 : -1;

  const cos = Math.cos(bounceAngle);
  const sin = Math.sin(bounceAngle);
  ball.vx = cos * speed * directionMultiplier;
  ball.vy = sin * speed;

  ball.x = side === LEFT ? paddle.x + options.paddleWidth + ball.radius : paddle.x - ball.radius;

  return 'bounce';
}

export function createInputState(overrides = {}) {
  return {
    left: 0,
    right: 0,
    usesAi: true,
    pausePressed: false,
    aiDelay: 0,
    ...overrides,
  };
}

export function createInitialState(overrides = {}) {
  const options = deepMergeOptions(overrides);
  if (options.krazyMode && overrides.winScore == null) {
    options.winScore = DEFAULT_OPTIONS.krazyWinScore;
  }
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
    balls: [],
    scores: {
      left: 0,
      right: 0,
    },
    isPaused: false,
    nextServeVertical: 1,
    nextBallId: 0,
    successfulPasses: 0,
    winner: null,
    aiDelayTimer: 0,
  };

  state.balls.push(serveBall(state, 1));

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
  const aiDelay = input.aiDelay ?? 0;
  if (input.usesAi) {
    if (aiDelay > 0 && next.aiDelayTimer < aiDelay) {
      next.aiDelayTimer = Math.min(aiDelay, next.aiDelayTimer + clampedDelta);
    }
  } else {
    next.aiDelayTimer = 0;
  }

  let targetBall = null;
  let closestDistance = Infinity;
  next.balls.forEach(ball => {
    const headingRight = ball.vx > 0;
    if (headingRight) {
      const distance = Math.abs(bounds.width - ball.x);
      if (distance < closestDistance) {
        closestDistance = distance;
        targetBall = ball;
      }
    }
  });

  if (!targetBall) {
    targetBall = next.balls[0] ?? null;
  }

  if (!input.usesAi) {
    rightMovement = clamp(input.right ?? 0, -1, 1);
  } else {
    const targetY = targetBall ? targetBall.y : bounds.height / 2;
    const paddleCenter = next.paddles.right.y + options.paddleHeight / 2;
    const deltaY = targetY - paddleCenter;
    const headingRight = targetBall ? targetBall.vx > 0 : false;
    const delaying = headingRight && aiDelay > 0 && next.aiDelayTimer < aiDelay;
    if (!delaying && Math.abs(deltaY) > options.aiReactionDistance) {
      rightMovement = deltaY > 0 ? 1 : -1;
    }
  }

  const rightSpeed = input.usesAi ? options.aiSpeed : options.paddleSpeed;
  next.paddles.right.y = clamp(
    next.paddles.right.y + rightMovement * rightSpeed * clampedDelta,
    0,
    bounds.height - options.paddleHeight,
  );

  for (let i = 0; i < next.balls.length; i += 1) {
    const ball = next.balls[i];
    ball.x += ball.vx * clampedDelta;
    ball.y += ball.vy * clampedDelta;

    if (ball.y - ball.radius <= 0) {
      ball.y = ball.radius;
      ball.vy = Math.abs(ball.vy);
    } else if (ball.y + ball.radius >= bounds.height) {
      ball.y = bounds.height - ball.radius;
      ball.vy = -Math.abs(ball.vy);
    }

    const leftResult = handlePaddleInteraction(next, ball, LEFT);
    if (leftResult === 'miss') {
      awardPoint(next, RIGHT, events);
      return { state: next, events };
    }
    if (leftResult === 'bounce') {
      next.successfulPasses += 1;
      if (ball.vx > 0 && aiDelay > 0) {
        next.aiDelayTimer = 0;
      }
      if (options.krazyMode && next.successfulPasses % options.krazyPasses === 0) {
        const newBall = serveBall(next, ball.vx > 0 ? -1 : 1);
        next.balls.push(newBall);
        if (newBall.vx > 0 && aiDelay > 0) {
          next.aiDelayTimer = 0;
        }
      }
    }

    const rightResult = handlePaddleInteraction(next, ball, RIGHT);
    if (rightResult === 'miss') {
      awardPoint(next, LEFT, events);
      return { state: next, events };
    }
    if (rightResult === 'bounce') {
      next.successfulPasses += 1;
      if (ball.vx > 0 && aiDelay > 0) {
        next.aiDelayTimer = 0;
      }
      if (options.krazyMode && next.successfulPasses % options.krazyPasses === 0) {
        const newBall = serveBall(next, ball.vx > 0 ? -1 : 1);
        next.balls.push(newBall);
        if (newBall.vx > 0 && aiDelay > 0) {
          next.aiDelayTimer = 0;
        }
      }
    }

    if (ball.x + ball.radius < 0) {
      awardPoint(next, RIGHT, events);
      return { state: next, events };
    }

    if (ball.x - ball.radius > bounds.width) {
      awardPoint(next, LEFT, events);
      return { state: next, events };
    }
  }

  return { state: next, events };
}

export { DEFAULT_OPTIONS };
export const INTERNALS = { clamp, serveBall, awardPoint, handlePaddleInteraction };
