const TAU = Math.PI * 2;

export const DEFAULT_OPTIONS = {
  boardSize: 520,
  radius: 220,
  paddleArc: (30 * Math.PI) / 180,
  paddleAngularSpeed: Math.PI / 1.8, // ~100 deg/sec
  ballSpeed: 280,
  ballRadius: 10,
  winScore: 3,
  aiReactionDelay: 0.18,
  aiMaxAngularSpeed: Math.PI / 2.5,
  serveAngles: [0, Math.PI / 14, -Math.PI / 14],
};

export function normalizeAngle(angle) {
  let value = angle % TAU;
  if (value < 0) {
    value += TAU;
  }
  return value;
}

export function shortestAngleDiff(a, b) {
  const diff = normalizeAngle(a) - normalizeAngle(b);
  return ((diff + Math.PI) % TAU) - Math.PI;
}

export function isAngleBetween(angle, start, end) {
  const normStart = normalizeAngle(start);
  const normEnd = normalizeAngle(end);
  const normAngle = normalizeAngle(angle);
  const length = (normEnd - normStart + TAU) % TAU;
  const relative = (normAngle - normStart + TAU) % TAU;
  return relative <= length + 1e-6;
}

export function clampAngleToRange(angle, range) {
  const normAngle = normalizeAngle(angle);
  if (isAngleBetween(normAngle, range.start, range.end)) {
    return normAngle;
  }
  const start = normalizeAngle(range.start);
  const end = normalizeAngle(range.end);
  const diffStart = Math.abs(shortestAngleDiff(normAngle, start));
  const diffEnd = Math.abs(shortestAngleDiff(normAngle, end));
  return diffStart <= diffEnd ? start : end;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function createServeBall(state, toward = 'player2') {
  const { options, center } = state;
  const baseAngle = toward === 'player1' ? Math.PI : 0;
  const offset = options.serveAngles[state.nextServeIndex % options.serveAngles.length];
  state.nextServeIndex = (state.nextServeIndex + 1) % options.serveAngles.length;
  const angle = normalizeAngle(baseAngle + offset);
  const vx = Math.cos(angle) * options.ballSpeed;
  const vy = Math.sin(angle) * options.ballSpeed;
  return {
    x: center.x,
    y: center.y,
    vx,
    vy,
    speed: options.ballSpeed,
  };
}

export function createInitialState(config = {}) {
  const { mode = 'versus', ...optionOverrides } = config;
  const options = { ...DEFAULT_OPTIONS, ...optionOverrides };
  const boardSize = options.boardSize;
  const center = { x: boardSize / 2, y: boardSize / 2 };
  const ranges = {
    player1: {
      start: Math.PI / 2,
      end: (3 * Math.PI) / 2,
    },
    player2: {
      start: (3 * Math.PI) / 2,
      end: Math.PI / 2,
    },
  };

  const paddles = {
    player1: {
      angle: Math.PI,
      arc: options.paddleArc,
      angularVelocity: 0,
    },
    player2: {
      angle: 0,
      arc: options.paddleArc,
      angularVelocity: 0,
    },
  };

  const state = {
    options,
    mode,
    center,
    ranges,
    paddles,
    ball: null,
    scores: {
      player1: 0,
      player2: 0,
    },
    isRunning: true,
    winner: null,
    nextServeIndex: 0,
    ai: {
      targetAngle: paddles.player2.angle,
      reactionTimer: 0,
    },
  };

  state.ball = createServeBall(state, 'player2');
  return state;
}

export function createInputState() {
  return {
    player1: 0,
    player2: 0,
  };
}

function updatePaddle(state, playerKey, intent, deltaSeconds) {
  const { paddles, ranges, options } = state;
  const paddle = paddles[playerKey];
  const range = ranges[playerKey];
  const clampedIntent = clamp(intent, -1, 1);
  const angleDelta = clampedIntent * options.paddleAngularSpeed * deltaSeconds;
  const nextAngle = clampAngleToRange(paddle.angle + angleDelta, range);
  if (deltaSeconds > 0) {
    paddle.angularVelocity = (nextAngle - paddle.angle) / deltaSeconds;
  } else {
    paddle.angularVelocity = 0;
  }
  paddle.angle = nextAngle;
}

function reflectBallFromNormal(ball, normal, targetSpeed) {
  const dot = ball.vx * normal.x + ball.vy * normal.y;
  ball.vx -= 2 * dot * normal.x;
  ball.vy -= 2 * dot * normal.y;
  const magnitude = Math.hypot(ball.vx, ball.vy) || 1;
  const speed = targetSpeed ?? ball.speed;
  ball.vx = (ball.vx / magnitude) * speed;
  ball.vy = (ball.vy / magnitude) * speed;
  ball.speed = speed;
}

function awardPoint(state, scoringPlayer, events) {
  state.scores[scoringPlayer] += 1;
  events.push({ type: 'score', scorer: scoringPlayer, scores: { ...state.scores } });

  if (state.scores[scoringPlayer] >= state.options.winScore) {
    state.isRunning = false;
    state.winner = scoringPlayer;
    state.ball = null;
    events.push({ type: 'win', winner: scoringPlayer, scores: { ...state.scores } });
    return;
  }

  const defender = scoringPlayer === 'player1' ? 'player2' : 'player1';
  state.ball = createServeBall(state, defender);
}

export function computeAiInput(state, deltaSeconds) {
  if (state.mode !== 'single' || !state.ball) {
    return 0;
  }

  const { paddles, center, options, ranges, ai } = state;
  ai.reactionTimer += deltaSeconds;
  if (ai.reactionTimer >= options.aiReactionDelay) {
    const ballAngle = normalizeAngle(Math.atan2(state.ball.y - center.y, state.ball.x - center.x));
    ai.targetAngle = clampAngleToRange(ballAngle, ranges.player2);
    ai.reactionTimer = 0;
  }

  if (deltaSeconds <= 0) {
    return 0;
  }

  const diff = shortestAngleDiff(ai.targetAngle, paddles.player2.angle);
  const maxStep = options.aiMaxAngularSpeed * deltaSeconds;
  const limited = clamp(diff, -maxStep, maxStep);
  if (Math.abs(limited) < 1e-4) {
    return 0;
  }
  const desired = limited / (options.paddleAngularSpeed * deltaSeconds);
  return clamp(desired, -1, 1);
}

function handleBall(state, deltaSeconds, events) {
  const { ball, options, center, ranges, paddles } = state;
  if (!ball) {
    return;
  }

  ball.x += ball.vx * deltaSeconds;
  ball.y += ball.vy * deltaSeconds;

  const dx = ball.x - center.x;
  const dy = ball.y - center.y;
  const distance = Math.hypot(dx, dy);
  const boundary = options.radius - options.ballRadius;

  if (distance < boundary) {
    return;
  }

  const angle = normalizeAngle(Math.atan2(dy, dx));
  const onPlayer1Side = isAngleBetween(angle, ranges.player1.start, ranges.player1.end);
  const player = onPlayer1Side ? 'player1' : 'player2';
  const paddle = paddles[player];
  const halfArc = (paddle.arc ?? options.paddleArc) / 2;
  const diff = Math.abs(shortestAngleDiff(angle, paddle.angle));

  const normal = {
    x: dx / (distance || 1),
    y: dy / (distance || 1),
  };

  if (diff <= halfArc + 1e-3) {
    const dot = ball.vx * normal.x + ball.vy * normal.y;
    if (dot > 0) {
      reflectBallFromNormal(ball, normal, options.ballSpeed);
      const placement = boundary - 1.5;
      ball.x = center.x + normal.x * placement;
      ball.y = center.y + normal.y * placement;
    }
    return;
  }

  const scorer = player === 'player1' ? 'player2' : 'player1';
  awardPoint(state, scorer, events);
}

export function stepGame(state, input, deltaSeconds) {
  const events = [];
  if (!state.isRunning) {
    return events;
  }

  const dt = clamp(Number.isFinite(deltaSeconds) ? deltaSeconds : 0, 0, 0.05);
  updatePaddle(state, 'player1', input?.player1 ?? 0, dt);
  const p2Intent = input?.player2 ?? 0;
  updatePaddle(state, 'player2', p2Intent, dt);
  handleBall(state, dt, events);
  return events;
}
