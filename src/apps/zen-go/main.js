import Goban, { BOARD_SIZE, COLORS, PASS_MOVE } from './js/goban.js';

const LETTERS = 'ABCDEFGHJKLMNOPQRST';
const BOARD_PADDING = 36;
const STAR_POINTS = [3, 9, 15];
const CENTER = (BOARD_SIZE - 1) / 2;
const MAX_CENTER_DISTANCE = Math.hypot(CENTER, CENTER);

const MODELS = [
  {
    id: 'swift',
    label: '20-block Swift',
    description: 'Lighter KataGo net distilled for quick, exploratory answers.',
    temperature: 0.85,
    captureBonus: 3.6,
    influenceWeight: 0.9,
    delay: 260
  },
  {
    id: 'balanced',
    label: '30-block Balanced',
    description: 'Default blend of fighting instincts and territorial judgment.',
    temperature: 0.65,
    captureBonus: 4.2,
    influenceWeight: 1,
    delay: 420
  },
  {
    id: 'deep',
    label: '40-block Insight',
    description: 'Lower temperature emphasises thick connections and endgame feel.',
    temperature: 0.45,
    captureBonus: 4.8,
    influenceWeight: 1.12,
    delay: 520
  }
];

const state = {
  goban: new Goban(BOARD_SIZE),
  humanColor: COLORS.BLACK,
  aiColor: COLORS.WHITE,
  currentPlayer: COLORS.BLACK,
  model: MODELS[1],
  waiting: false,
  gameOver: false,
  pendingHandle: null,
  metrics: {
    pixelRatio: window.devicePixelRatio || 1,
    padding: BOARD_PADDING,
    cellSize: 0
  }
};

let canvas;
let ctx;
let statusText;
let turnLabel;
let moveNumber;
let scoreLead;
let lastMove;
let blackCaptures;
let whiteCaptures;
let modelSelect;
let modelNote;
let historyList;
let newGameButton;
let passButton;
let resignButton;

document.addEventListener('DOMContentLoaded', init);

function init() {
  cacheDom();
  setupModelOptions();
  attachEvents();
  handleResize();
  startNewGame(false);
}

function cacheDom() {
  canvas = document.getElementById('boardCanvas');
  ctx = canvas.getContext('2d');
  statusText = document.getElementById('statusText');
  turnLabel = document.getElementById('turnLabel');
  moveNumber = document.getElementById('moveNumber');
  scoreLead = document.getElementById('scoreLead');
  lastMove = document.getElementById('lastMove');
  blackCaptures = document.getElementById('blackCaptures');
  whiteCaptures = document.getElementById('whiteCaptures');
  modelSelect = document.getElementById('modelSelect');
  modelNote = document.getElementById('modelNote');
  historyList = document.getElementById('historyList');
  newGameButton = document.getElementById('newGameButton');
  passButton = document.getElementById('passButton');
  resignButton = document.getElementById('resignButton');
}

function setupModelOptions() {
  MODELS.forEach((model) => {
    const option = document.createElement('option');
    option.value = model.id;
    option.textContent = model.label;
    modelSelect.appendChild(option);
  });
  modelSelect.value = state.model.id;
  updateModelNote();
}

function attachEvents() {
  window.addEventListener('resize', handleResize);
  canvas.addEventListener('click', handleBoardClick);
  modelSelect.addEventListener('change', handleModelChange);
  newGameButton.addEventListener('click', () => startNewGame(true));
  passButton.addEventListener('click', handlePass);
  resignButton.addEventListener('click', handleResign);
}

function handleResize() {
  const rect = canvas.getBoundingClientRect();
  const minSize = Math.min(rect.width || 0, rect.height || 0);
  const fallbackSize = Math.max(minSize, 500);
  const ratio = window.devicePixelRatio || 1;
  const size = minSize > 0 ? minSize : fallbackSize;

  canvas.width = size * ratio;
  canvas.height = size * ratio;
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;

  state.metrics.pixelRatio = ratio;
  state.metrics.padding = BOARD_PADDING * ratio;
  state.metrics.cellSize =
    (canvas.width - state.metrics.padding * 2) / (BOARD_SIZE - 1);

  drawBoard();
}

function startNewGame(announce = true) {
  if (state.pendingHandle) {
    clearTimeout(state.pendingHandle);
    state.pendingHandle = null;
  }
  state.goban.reset();
  state.currentPlayer = state.humanColor;
  state.waiting = false;
  state.gameOver = false;
  updateControls();
  drawBoard();
  updateHud();
  updateHistory();
  if (announce) {
    setStatus('New 19×19 game. Black to move.', 'info');
  } else {
    setStatus('Tap a point to begin as Black.', 'info');
  }
}

function handleBoardClick(event) {
  if (state.waiting || state.gameOver || state.currentPlayer !== state.humanColor) {
    return;
  }
  const point = eventToBoardPoint(event);
  if (!point) {
    return;
  }
  const result = state.goban.playMove(point.x, point.y, state.humanColor);
  if (!result.ok) {
    setStatus(formatIllegalReason(result.reason), 'error');
    return;
  }

  state.currentPlayer = state.goban.opponent(state.currentPlayer);
  drawBoard();
  updateHud();
  updateHistory();
  setStatus(
    `You played ${formatMove(point.x, point.y)}. Engine pondering…`,
    'thinking'
  );
  queueEngineTurn();
}

function handleModelChange() {
  const next = MODELS.find((item) => item.id === modelSelect.value);
  if (!next) {
    return;
  }
  state.model = next;
  updateModelNote();
  if (!state.gameOver) {
    setStatus(`${next.label} model armed.`, 'info');
  }
}

function handlePass() {
  if (state.waiting || state.gameOver || state.currentPlayer !== state.humanColor) {
    return;
  }
  state.goban.passMove(state.humanColor);
  state.currentPlayer = state.goban.opponent(state.currentPlayer);
  drawBoard();
  updateHud();
  updateHistory();
  setStatus('You passed. KataGo will respond.', 'passive');
  queueEngineTurn();
}

function handleResign() {
  if (state.waiting || state.gameOver || state.currentPlayer !== state.humanColor) {
    return;
  }
  state.gameOver = true;
  updateControls();
  updateHud();
  setStatus('You resigned. KataGo wins by resignation.', 'error');
}

function queueEngineTurn() {
  if (state.pendingHandle) {
    clearTimeout(state.pendingHandle);
  }
  state.waiting = true;
  updateControls();
  state.pendingHandle = setTimeout(() => {
    state.pendingHandle = null;
    playEngineMove();
  }, state.model.delay);
}

function playEngineMove() {
  if (state.gameOver) {
    state.waiting = false;
    updateControls();
    return;
  }

  const policy = buildPolicy(state.goban, state.aiColor);
  const choice = state.goban.topThreePolicy(
    policy,
    state.aiColor,
    state.model.temperature
  );

  if (choice.type === PASS_MOVE) {
    state.goban.passMove(state.aiColor, { policy: choice.policy ?? null });
    setStatus('KataGo passes.', 'passive');
  } else {
    const result = state.goban.playMove(choice.x, choice.y, state.aiColor, {
      policy: choice.policy ?? null
    });
    if (result.ok) {
      setStatus(`KataGo plays ${formatMove(choice.x, choice.y)}.`, 'info');
    } else {
      state.goban.passMove(state.aiColor);
      setStatus('KataGo passes.', 'passive');
    }
  }

  state.currentPlayer = state.goban.opponent(state.currentPlayer);
  state.waiting = false;
  drawBoard();
  updateHud();
  updateHistory();
  updateControls();
  checkForEnd();
}

function checkForEnd() {
  if (state.gameOver) {
    return;
  }
  if (state.goban.consecutivePasses >= 2) {
    state.gameOver = true;
    const estimate = state.goban.estimateScore();
    const summary = formatScoreLead(estimate);
    setStatus(`Both players passed. Estimated score ${summary}.`, 'success');
    updateControls();
    return;
  }

  if (
    state.currentPlayer === state.humanColor &&
    !state.goban.listLegalMoves(state.humanColor).length
  ) {
    setStatus('No legal moves remain. Consider passing.', 'passive');
  }
}

function updateHud() {
  const captures = state.goban.getCaptures();
  blackCaptures.textContent = captures.black;
  whiteCaptures.textContent = captures.white;

  const history = state.goban.getMoveHistory();
  moveNumber.textContent = history.length;

  const score = state.goban.estimateScore();
  scoreLead.textContent = formatScoreLead(score);

  const latest = state.goban.getLastMove();
  lastMove.textContent = formatLastMove(latest);

  if (state.gameOver) {
    turnLabel.textContent = 'Game complete';
  } else if (state.currentPlayer === state.humanColor) {
    turnLabel.textContent = 'Your move (Black)';
  } else if (state.waiting) {
    turnLabel.textContent = 'Engine pondering';
  } else {
    turnLabel.textContent = 'Engine to move';
  }
}

function updateHistory() {
  historyList.innerHTML = '';
  const moves = state.goban.getMoveHistory();
  if (!moves.length) {
    const placeholder = document.createElement('li');
    placeholder.className = 'insight-empty';
    placeholder.textContent = 'No moves yet.';
    historyList.appendChild(placeholder);
    return;
  }

  const recent = moves.slice(-12).reverse();
  recent.forEach((move) => {
    const item = document.createElement('li');
    item.textContent = formatHistoryEntry(move);
    historyList.appendChild(item);
  });
}

function updateControls() {
  const playerTurn =
    !state.gameOver && !state.waiting && state.currentPlayer === state.humanColor;
  passButton.disabled = !playerTurn;
  resignButton.disabled = !playerTurn;
  newGameButton.disabled = state.waiting;
  modelSelect.disabled = state.waiting;
}

function updateModelNote() {
  if (modelNote) {
    modelNote.textContent = state.model.description;
  }
}

function drawBoard() {
  if (!ctx) {
    return;
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBoardBackground();
  drawGridLines();
  drawStarPoints();
  drawStones();
  highlightLastMove();
}

function drawBoardBackground() {
  ctx.fillStyle = '#f1d29c';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawGridLines() {
  const pad = state.metrics.padding;
  const cell = state.metrics.cellSize;
  const end = canvas.width - pad;

  ctx.strokeStyle = '#7c4a1b';
  ctx.lineWidth = 1.4 * state.metrics.pixelRatio;
  ctx.lineCap = 'round';

  for (let i = 0; i < BOARD_SIZE; i += 1) {
    const offset = pad + cell * i;
    ctx.beginPath();
    ctx.moveTo(pad, offset);
    ctx.lineTo(end, offset);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(offset, pad);
    ctx.lineTo(offset, end);
    ctx.stroke();
  }
}

function drawStarPoints() {
  const pad = state.metrics.padding;
  const cell = state.metrics.cellSize;
  const radius = 3 * state.metrics.pixelRatio;

  ctx.fillStyle = '#3f2a14';

  STAR_POINTS.forEach((ix) => {
    STAR_POINTS.forEach((iy) => {
      const x = pad + cell * ix;
      const y = pad + cell * iy;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    });
  });
}

function drawStones() {
  const pad = state.metrics.padding;
  const cell = state.metrics.cellSize;
  const radius = cell * 0.42;

  for (let y = 0; y < BOARD_SIZE; y += 1) {
    for (let x = 0; x < BOARD_SIZE; x += 1) {
      const stone = state.goban.getStone(x, y);
      if (stone !== COLORS.BLACK && stone !== COLORS.WHITE) {
        continue;
      }
      const cx = pad + cell * x;
      const cy = pad + cell * y;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      if (stone === COLORS.BLACK) {
        const gradient = ctx.createRadialGradient(
          cx - radius * 0.3,
          cy - radius * 0.3,
          radius * 0.2,
          cx,
          cy,
          radius
        );
        gradient.addColorStop(0, '#4a4a4a');
        gradient.addColorStop(1, '#121212');
        ctx.fillStyle = gradient;
      } else {
        const gradient = ctx.createRadialGradient(
          cx - radius * 0.25,
          cy - radius * 0.25,
          radius * 0.2,
          cx,
          cy,
          radius
        );
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(1, '#d9d9d9');
        ctx.fillStyle = gradient;
      }
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.lineWidth = state.metrics.pixelRatio * 0.8;
      ctx.stroke();
    }
  }
}

function highlightLastMove() {
  const move = state.goban.getLastMove();
  if (!move || move.pass) {
    return;
  }
  const pad = state.metrics.padding;
  const cell = state.metrics.cellSize;
  const radius = cell * 0.18;
  const cx = pad + cell * move.x;
  const cy = pad + cell * move.y;

  ctx.save();
  ctx.strokeStyle = '#facc15';
  ctx.lineWidth = state.metrics.pixelRatio * 2.4;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function eventToBoardPoint(event) {
  const rect = canvas.getBoundingClientRect();
  const ratioX = canvas.width / rect.width;
  const ratioY = canvas.height / rect.height;
  const x = (event.clientX - rect.left) * ratioX;
  const y = (event.clientY - rect.top) * ratioY;
  const pad = state.metrics.padding;
  const cell = state.metrics.cellSize;

  const gridX = Math.round((x - pad) / cell);
  const gridY = Math.round((y - pad) / cell);
  if (
    gridX < 0 ||
    gridX >= BOARD_SIZE ||
    gridY < 0 ||
    gridY >= BOARD_SIZE
  ) {
    return null;
  }

  const targetX = pad + gridX * cell;
  const targetY = pad + gridY * cell;
  const tolerance = cell * 0.48;
  const distance = Math.hypot(targetX - x, targetY - y);
  if (distance > tolerance) {
    return null;
  }

  return { x: gridX, y: gridY };
}

function buildPolicy(goban, color) {
  const moves = goban.listLegalMoves(color);
  const entries = [];
  const last = goban.getLastMove();

  moves.forEach(({ x, y }) => {
    const base = baseInfluence(x, y, last) * (state.model.influenceWeight || 1);
    const value = withSimulatedMove(goban, color, x, y, (result, board) => {
      const simulation = evaluateSimulation(board, result, x, y, color);
      return base + simulation;
    });
    if (value && value > 0) {
      entries.push({ x, y, policy: value });
    }
  });

  const estimate = goban.estimateScore();
  if (estimate.leader === color && estimate.leadValue > 12) {
    entries.push({ pass: true, policy: estimate.leadValue / 12 });
  }

  return entries;
}

function baseInfluence(x, y, lastMoveInfo) {
  const distance = Math.hypot(x - CENTER, y - CENTER);
  let score = 0.45 + (1 - distance / MAX_CENTER_DISTANCE) * 1.35;

  if (STAR_POINTS.includes(x) && STAR_POINTS.includes(y)) {
    score += 0.8;
  }

  if (lastMoveInfo && !lastMoveInfo.pass) {
    const proximity = Math.hypot(x - lastMoveInfo.x, y - lastMoveInfo.y);
    if (proximity <= 6) {
      score += (6 - proximity) * 0.28;
    }
  }

  if (x <= 1 || y <= 1 || x >= BOARD_SIZE - 2 || y >= BOARD_SIZE - 2) {
    score *= 0.82;
  }

  return score;
}

function evaluateSimulation(board, result, x, y, color) {
  const opponent = board.opponent(color);
  let score = (result.captured?.length || 0) * (state.model.captureBonus || 4.2);
  score += Math.min(result.liberties, 4) * 0.22;

  const neighbors = board.getNeighborCoords(x, y);
  let connections = 0;
  let pressure = 0;
  neighbors.forEach((neighbor) => {
    const stone = board.getStone(neighbor.x, neighbor.y);
    if (stone === color) {
      connections += 1;
    } else if (stone === opponent) {
      const info = board.countLibertiesAt(neighbor.x, neighbor.y, opponent);
      pressure += Math.max(0, 4 - info.libertyCount);
    }
  });

  score += connections * 0.55;
  score += pressure * 0.65;

  return score;
}

function withSimulatedMove(goban, color, x, y, fn) {
  const snapshot = goban.createSnapshot();
  const result = goban.setStone(x, y, color);
  if (!result.ok) {
    goban.restoreBoard(snapshot);
    return null;
  }
  const output = fn(result, goban);
  goban.restoreBoard(snapshot);
  return output;
}

function formatMove(x, y) {
  const letter = LETTERS[x] ?? '?';
  const row = BOARD_SIZE - y;
  return `${letter}${row}`;
}

function formatIllegalReason(reason) {
  switch (reason) {
    case 'occupied':
      return 'That point is already occupied.';
    case 'suicide':
      return 'Playing there would be suicide.';
    case 'off_board':
      return 'Move is outside the board.';
    default:
      return 'Illegal move.';
  }
}

function formatScoreLead(score) {
  if (!score.leader || score.leadValue === 0) {
    return 'Tied';
  }
  const color = score.leader === COLORS.BLACK ? 'Black' : 'White';
  return `${color} +${score.leadValue.toFixed(1)}`;
}

function formatLastMove(move) {
  if (!move) {
    return 'None';
  }
  const color = move.color === COLORS.BLACK ? 'Black' : 'White';
  if (move.pass) {
    return `${color} pass`;
  }
  const captureSuffix = move.captured?.length
    ? ` (captures ${move.captured.length})`
    : '';
  return `${color} ${formatMove(move.x, move.y)}${captureSuffix}`;
}

function formatHistoryEntry(move) {
  const prefix = `${move.moveNumber}. ${move.color === COLORS.BLACK ? 'B' : 'W'}`;
  if (move.type === PASS_MOVE || move.pass) {
    return `${prefix} pass`;
  }
  const captureSuffix = move.captured?.length ? ` ×${move.captured.length}` : '';
  return `${prefix} ${formatMove(move.x, move.y)}${captureSuffix}`;
}

function setStatus(message, tone = 'info') {
  if (!statusText) {
    return;
  }
  statusText.textContent = message;
  statusText.className = 'zen-go-status';
  statusText.classList.add(`zen-go-status--${tone}`);
}
