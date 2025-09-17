const COOKIE_NAME = 'neonPongHistory';
const WINNING_SCORE = 3;
const BASE_BALL_SPEED = 6.2;
const BALL_ACCELERATION = 0.45;
const MAX_BALL_SPEED = 11;

const canvas = document.getElementById('pongCanvas');
const ctx = canvas.getContext('2d');

const modeLabelEl = document.getElementById('modeLabel');
const scoreLeftEl = document.getElementById('scoreLeft');
const scoreRightEl = document.getElementById('scoreRight');
const rightLabelEl = document.getElementById('rightLabel');
const overlayEl = document.getElementById('overlay');
const overlayTitleEl = document.getElementById('overlayTitle');
const overlaySubtitleEl = document.getElementById('overlaySubtitle');
const playAgainBtn = document.getElementById('playAgainBtn');
const resetHistoryBtn = document.getElementById('resetHistoryBtn');
const historyListEl = document.getElementById('historyList');

const state = {
  mode: '1p',
  leftScore: 0,
  rightScore: 0,
  isPaused: false,
  matchOver: false,
};

const paddles = {
  left: {
    x: 36,
    y: canvas.height / 2 - 70,
    width: 14,
    height: 140,
    speed: 8,
  },
  right: {
    x: canvas.width - 50,
    y: canvas.height / 2 - 70,
    width: 14,
    height: 140,
    speed: 8,
    aiSpeed: 6.5,
  },
};

const ball = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  radius: 10,
  vx: 0,
  vy: 0,
  speed: BASE_BALL_SPEED,
};

const keys = new Set();
let lastTime = null;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function setCookie(name, value, days = 30) {
  const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${name}=${value}; expires=${expires}; path=/`;
}

function getCookie(name) {
  const nameEq = `${name}=`;
  return document.cookie
    .split(';')
    .map(entry => entry.trim())
    .find(entry => entry.startsWith(nameEq))
    ?.substring(nameEq.length) || null;
}

function deleteCookie(name) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

function loadHistory() {
  const raw = getCookie(COOKIE_NAME);
  if (!raw) {
    return [];
  }
  try {
    return JSON.parse(decodeURIComponent(raw));
  } catch (error) {
    console.warn('Unable to parse pong history cookie, resetting.', error);
    deleteCookie(COOKIE_NAME);
    return [];
  }
}

function saveHistory(history) {
  const serialised = encodeURIComponent(JSON.stringify(history));
  setCookie(COOKIE_NAME, serialised);
}

function formatModeLabel(mode) {
  return mode === '1p' ? '1 Player' : '2 Players';
}

function updateModeLabel() {
  modeLabelEl.textContent = formatModeLabel(state.mode);
  rightLabelEl.textContent = state.mode === '1p' ? 'Computer' : 'Player 2';
}

function updateScoreboard() {
  scoreLeftEl.textContent = state.leftScore.toString();
  scoreRightEl.textContent = state.rightScore.toString();
}

function renderHistory(history) {
  historyListEl.innerHTML = '';

  if (!history.length) {
    const emptyItem = document.createElement('li');
    emptyItem.classList.add('empty');
    emptyItem.textContent = 'Play a match to start building your neon pong legacy.';
    historyListEl.appendChild(emptyItem);
    return;
  }

  history.forEach(entry => {
    const item = document.createElement('li');

    const resultSpan = document.createElement('span');
    const winnerStrong = document.createElement('strong');
    winnerStrong.textContent = entry.winner;
    resultSpan.appendChild(winnerStrong);
    resultSpan.appendChild(document.createTextNode(` defeated ${entry.loser}`));

    const detailsSpan = document.createElement('span');
    detailsSpan.textContent = `${entry.score} • ${entry.modeLabel}`;

    const timeSpan = document.createElement('span');
    const timestamp = new Date(entry.timestamp);
    timeSpan.textContent = timestamp.toLocaleString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      month: 'short',
      day: 'numeric',
    });

    item.append(resultSpan, detailsSpan, timeSpan);
    historyListEl.appendChild(item);
  });
}

function addHistoryEntry(entry) {
  const history = loadHistory();
  history.unshift(entry);
  if (history.length > 20) {
    history.length = 20;
  }
  saveHistory(history);
  renderHistory(history);
}

function resetHistory() {
  deleteCookie(COOKIE_NAME);
  renderHistory([]);
}

function resetPaddles() {
  paddles.left.y = canvas.height / 2 - paddles.left.height / 2;
  paddles.right.y = canvas.height / 2 - paddles.right.height / 2;
}

function launchBall(direction = Math.random() > 0.5 ? 1 : -1) {
  ball.x = canvas.width / 2;
  ball.y = canvas.height / 2;
  ball.speed = BASE_BALL_SPEED;
  const angle = (Math.random() * Math.PI) / 4 - Math.PI / 8; // -22.5° to 22.5°
  ball.vx = Math.cos(angle) * ball.speed * direction;
  ball.vy = Math.sin(angle) * ball.speed;
}

function hideOverlay() {
  overlayEl.classList.add('hidden');
}

function showOverlay(title, subtitle) {
  overlayTitleEl.textContent = title;
  overlaySubtitleEl.textContent = subtitle;
  overlayEl.classList.remove('hidden');
}

function resetMatch() {
  state.leftScore = 0;
  state.rightScore = 0;
  state.isPaused = false;
  state.matchOver = false;
  updateScoreboard();
  hideOverlay();
  resetPaddles();
  keys.clear();
  launchBall();
}

function handlePoint(scoringSide) {
  if (scoringSide === 'left') {
    state.leftScore += 1;
  } else {
    state.rightScore += 1;
  }
  updateScoreboard();

  if (state.leftScore >= WINNING_SCORE || state.rightScore >= WINNING_SCORE) {
    handleWin();
  } else {
    const direction = scoringSide === 'left' ? 1 : -1;
    launchBall(direction);
  }
}

function handleWin() {
  state.isPaused = true;
  state.matchOver = true;

  const winnerIsLeft = state.leftScore > state.rightScore;
  const winner = winnerIsLeft ? 'Player 1' : state.mode === '1p' ? 'Computer' : 'Player 2';
  const loser = winnerIsLeft ? (state.mode === '1p' ? 'Computer' : 'Player 2') : 'Player 1';
  const scoreLine = `${state.leftScore} - ${state.rightScore}`;
  const modeLabel = state.mode === '1p' ? 'Solo Showdown' : 'Versus Duel';

  showOverlay(`${winner} Wins!`, `${scoreLine} • ${modeLabel}`);

  addHistoryEntry({
    winner,
    loser,
    score: scoreLine,
    modeLabel: formatModeLabel(state.mode),
    timestamp: new Date().toISOString(),
  });
}

function setMode(nextMode) {
  if (state.mode === nextMode) {
    return;
  }
  state.mode = nextMode;
  updateModeLabel();
  resetMatch();
}

function toggleMode() {
  setMode(state.mode === '1p' ? '2p' : '1p');
}

function update(delta) {
  if (state.isPaused) {
    return;
  }

  const step = Math.min(delta / 16.67, 1.6);

  // Player 1 paddle
  if (keys.has('w')) {
    paddles.left.y -= paddles.left.speed * step;
  }
  if (keys.has('s')) {
    paddles.left.y += paddles.left.speed * step;
  }
  paddles.left.y = clamp(paddles.left.y, 0, canvas.height - paddles.left.height);

  // Player 2 or AI
  if (state.mode === '2p') {
    if (keys.has('o')) {
      paddles.right.y -= paddles.right.speed * step;
    }
    if (keys.has('l')) {
      paddles.right.y += paddles.right.speed * step;
    }
  } else {
    const paddleCenter = paddles.right.y + paddles.right.height / 2;
    const threshold = 16;
    if (Math.abs(ball.y - paddleCenter) > threshold) {
      const direction = ball.y < paddleCenter ? -1 : 1;
      paddles.right.y += direction * paddles.right.aiSpeed * step;
    }
  }
  paddles.right.y = clamp(paddles.right.y, 0, canvas.height - paddles.right.height);

  // Move ball
  ball.x += ball.vx * step;
  ball.y += ball.vy * step;

  // Wall collisions
  if (ball.y - ball.radius <= 0 && ball.vy < 0) {
    ball.y = ball.radius;
    ball.vy *= -1;
  } else if (ball.y + ball.radius >= canvas.height && ball.vy > 0) {
    ball.y = canvas.height - ball.radius;
    ball.vy *= -1;
  }

  // Paddle collisions
  const leftPaddle = paddles.left;
  if (
    ball.x - ball.radius <= leftPaddle.x + leftPaddle.width &&
    ball.y >= leftPaddle.y &&
    ball.y <= leftPaddle.y + leftPaddle.height &&
    ball.vx < 0
  ) {
    ball.x = leftPaddle.x + leftPaddle.width + ball.radius;
    const relativeIntersect = (ball.y - (leftPaddle.y + leftPaddle.height / 2)) / (leftPaddle.height / 2);
    const clampedIntersect = clamp(relativeIntersect, -1, 1);
    ball.speed = Math.min(ball.speed + BALL_ACCELERATION, MAX_BALL_SPEED);
    const bounceAngle = (Math.PI / 3) * clampedIntersect; // up to 60°
    ball.vx = Math.cos(bounceAngle) * ball.speed;
    ball.vy = Math.sin(bounceAngle) * ball.speed;
  }

  const rightPaddle = paddles.right;
  if (
    ball.x + ball.radius >= rightPaddle.x &&
    ball.y >= rightPaddle.y &&
    ball.y <= rightPaddle.y + rightPaddle.height &&
    ball.vx > 0
  ) {
    ball.x = rightPaddle.x - ball.radius;
    const relativeIntersect = (ball.y - (rightPaddle.y + rightPaddle.height / 2)) / (rightPaddle.height / 2);
    const clampedIntersect = clamp(relativeIntersect, -1, 1);
    ball.speed = Math.min(ball.speed + BALL_ACCELERATION, MAX_BALL_SPEED);
    const bounceAngle = (Math.PI / 3) * clampedIntersect;
    ball.vx = -Math.cos(bounceAngle) * ball.speed;
    ball.vy = Math.sin(bounceAngle) * ball.speed;
  }

  // Scoring
  if (ball.x + ball.radius < 0) {
    handlePoint('right');
  } else if (ball.x - ball.radius > canvas.width) {
    handlePoint('left');
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const gradient = ctx.createRadialGradient(
    canvas.width / 2,
    canvas.height / 2,
    80,
    canvas.width / 2,
    canvas.height / 2,
    canvas.width
  );
  gradient.addColorStop(0, 'rgba(0, 234, 255, 0.12)');
  gradient.addColorStop(1, 'rgba(5, 1, 20, 0.95)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Center line
  ctx.save();
  ctx.strokeStyle = 'rgba(0, 234, 255, 0.35)';
  ctx.lineWidth = 4;
  ctx.setLineDash([18, 18]);
  ctx.beginPath();
  ctx.moveTo(canvas.width / 2, 0);
  ctx.lineTo(canvas.width / 2, canvas.height);
  ctx.stroke();
  ctx.restore();

  // Paddles
  drawPaddle(paddles.left, '#00eaff');
  drawPaddle(paddles.right, '#ff00ff');

  // Ball
  drawBall();
}

function drawPaddle(paddle, color) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 25;
  ctx.fillStyle = color;
  ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
  ctx.restore();
}

function drawBall() {
  ctx.save();
  const gradient = ctx.createRadialGradient(ball.x, ball.y, 2, ball.x, ball.y, 16);
  gradient.addColorStop(0, '#fcee09');
  gradient.addColorStop(0.6, 'rgba(252, 238, 9, 0.5)');
  gradient.addColorStop(1, 'rgba(252, 238, 9, 0)');
  ctx.fillStyle = gradient;
  ctx.shadowColor = '#fcee09';
  ctx.shadowBlur = 25;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function handleKeyDown(event) {
  const key = event.key.toLowerCase();

  if (['w', 's', 'o', 'l'].includes(key)) {
    keys.add(key);
  }

  if (event.repeat) {
    return;
  }

  if (key === '1') {
    setMode('1p');
  } else if (key === '2') {
    setMode('2p');
  } else if (key === 'p') {
    toggleMode();
  }
}

function handleKeyUp(event) {
  const key = event.key.toLowerCase();
  if (['w', 's', 'o', 'l'].includes(key)) {
    keys.delete(key);
  }
}

function handleBlur() {
  keys.clear();
}

function gameLoop(timestamp) {
  if (lastTime === null) {
    lastTime = timestamp;
  }
  const delta = timestamp - lastTime;
  lastTime = timestamp;

  update(delta);
  draw();

  requestAnimationFrame(gameLoop);
}

playAgainBtn.addEventListener('click', () => {
  resetMatch();
});

resetHistoryBtn.addEventListener('click', () => {
  resetHistory();
});

document.addEventListener('keydown', handleKeyDown);
document.addEventListener('keyup', handleKeyUp);
window.addEventListener('blur', handleBlur);

updateModeLabel();
renderHistory(loadHistory());
resetMatch();
requestAnimationFrame(gameLoop);
