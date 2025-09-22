(() => {
  'use strict';

  const BOARD_SIZE = 9;
  const COLUMN_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J'];
  const DIFFICULTIES = [
    {
      id: 'beginner',
      label: 'Beginner',
      rank: '20 kyu',
      elo: 800,
      seeds: [0, 1, 2, 3, 4, 5, 6, 7, 8],
      randomness: 0.8,
      note: 'Picks from broader Monte Carlo samples for a friendlier sparring partner.'
    },
    {
      id: 'intermediate',
      label: 'Intermediate',
      rank: '10 kyu',
      elo: 1200,
      seeds: [0, 1, 2, 3, 4],
      randomness: 0.45,
      note: 'Balances principled suggestions with a dash of experimentation.'
    },
    {
      id: 'advanced',
      label: 'Advanced',
      rank: '1 dan',
      elo: 2100,
      seeds: [0, 1],
      randomness: 0.05,
      note: 'Leans on GNU Go\'s strongest variations for sharp tactical play.'
    }
  ];

  const HANDICAP_POINTS = [
    { x: 2, y: 2 },
    { x: 6, y: 6 },
    { x: 2, y: 6 },
    { x: 6, y: 2 },
    { x: 4, y: 4 },
    { x: 2, y: 4 },
    { x: 6, y: 4 },
    { x: 4, y: 2 },
    { x: 4, y: 6 }
  ];

  const state = {
    difficulty: DIFFICULTIES[1],
    handicap: 0,
    handicapStones: [],
    moves: [],
    aiThinking: false,
    gameOver: false,
    pendingAiMoveId: null,
    currentSgf: '',
    lastHighlight: null
  };

  let board;
  let game;

  let boardCanvas;
  let statusText;
  let engineStatus;
  let blackCaptures;
  let whiteCaptures;
  let difficultySelect;
  let handicapSelect;
  let rankLabel;
  let eloLabel;
  let difficultyNote;
  let newGameButton;
  let undoButton;
  let resignButton;

  document.addEventListener('DOMContentLoaded', init);

  function init() {
    if (typeof WGo === 'undefined') {
      console.error('WGo.js failed to load.');
      return;
    }

    cacheDom();
    setupDifficultyOptions();
    setupBoard();
    attachEvents();
    setEngineStatus('Random opponent ready.', 'success');
    startNewGame();
  }

  function cacheDom() {
    boardCanvas = document.getElementById('board');
    statusText = document.getElementById('statusText');
    engineStatus = document.getElementById('engineStatus');
    blackCaptures = document.getElementById('blackCaptures');
    whiteCaptures = document.getElementById('whiteCaptures');
    difficultySelect = document.getElementById('difficultySelect');
    handicapSelect = document.getElementById('handicapSelect');
    rankLabel = document.getElementById('rankLabel');
    eloLabel = document.getElementById('eloLabel');
    difficultyNote = document.getElementById('difficultyNote');
    newGameButton = document.getElementById('newGameButton');
    undoButton = document.getElementById('undoButton');
    resignButton = document.getElementById('resignButton');
  }

  function setupDifficultyOptions() {
    DIFFICULTIES.forEach((entry) => {
      const option = document.createElement('option');
      option.value = entry.id;
      option.textContent = `${entry.label} — ${entry.rank}`;
      difficultySelect.appendChild(option);
    });
    difficultySelect.value = state.difficulty.id;
    updateDifficultyUi();
  }

  function setupBoard() {
    board = new WGo.Board(boardCanvas, {
      size: BOARD_SIZE,
      background: '#f8dcb6'
    });
    game = new WGo.Game(BOARD_SIZE);
    adjustBoardSize();
    window.addEventListener('resize', adjustBoardSize);
  }

  function attachEvents() {
    board.addEventListener('click', handleBoardClick);

    difficultySelect.addEventListener('change', () => {
      const next = DIFFICULTIES.find((item) => item.id === difficultySelect.value);
      if (!next) {
        return;
      }
      state.difficulty = next;
      updateDifficultyUi();
      if (!state.aiThinking && !state.gameOver) {
        setStatusMessage(`Difficulty set to ${next.rank}.`, 'passive');
      }
    });

    handicapSelect.addEventListener('change', () => {
      if (state.aiThinking) {
        return;
      }
      const value = parseInt(handicapSelect.value, 10);
      state.handicap = Number.isFinite(value) ? value : 0;
      startNewGame();
    });

    newGameButton.addEventListener('click', () => {
      if (state.aiThinking) {
        return;
      }
      startNewGame();
    });

    undoButton.addEventListener('click', handleUndo);
    resignButton.addEventListener('click', handleResign);
  }

  function adjustBoardSize() {
    const width = boardCanvas.clientWidth;
    if (width) {
      board.setWidth(width);
    }
  }

  function startNewGame() {
    if (state.pendingAiMoveId !== null) {
      window.clearTimeout(state.pendingAiMoveId);
      state.pendingAiMoveId = null;
    }
    state.moves = [];
    state.gameOver = false;
    state.aiThinking = false;
    state.handicapStones = state.handicap >= 2 ? HANDICAP_POINTS.slice(0, Math.min(state.handicap, HANDICAP_POINTS.length)) : [];

    game = new WGo.Game(BOARD_SIZE);
    if (state.handicapStones.length) {
      state.handicapStones.forEach(({ x, y }) => {
        game.addStone(x, y, WGo.B);
      });
      game.turn = WGo.W;
    }

    state.currentSgf = buildSgf();
    updateBoardFromGame();
    updateCaptureCounts();
    setStatusMessage(state.handicapStones.length ? 'White to play.' : 'Your move as Black.', 'passive');
    setEngineStatus('Random opponent ready.', 'success');
    updateButtons();
  }

  function handleBoardClick(x, y) {
    if (state.aiThinking || state.gameOver) {
      return;
    }

    const gridX = Math.round(x);
    const gridY = Math.round(y);

    if (gridX < 0 || gridX >= BOARD_SIZE || gridY < 0 || gridY >= BOARD_SIZE) {
      return;
    }

    const playResult = game.play(gridX, gridY, WGo.B);
    if (typeof playResult === 'number') {
      flashStatus('Illegal move. Try another point.', true);
      return;
    }

    state.moves.push({ color: 'B', x: gridX, y: gridY });
    state.currentSgf = buildSgf();
    updateBoardFromGame({ x: gridX, y: gridY, color: 'B' });
    updateCaptureCounts();
    setStatusMessage('Zen Go is thinking…', 'active');
    state.aiThinking = true;
    updateButtons();
    setEngineStatus('Calculating move…', 'pending');
    scheduleRandomAiMove();
  }

  function scheduleRandomAiMove() {
    if (state.pendingAiMoveId !== null) {
      window.clearTimeout(state.pendingAiMoveId);
    }
    state.pendingAiMoveId = window.setTimeout(() => {
      state.pendingAiMoveId = null;
      if (state.gameOver) {
        state.aiThinking = false;
        updateButtons();
        setEngineStatus('Match finished.', 'passive');
        return;
      }
      const move = computeRandomAiMove();
      applyAiMove(move);
    }, 400);
  }

  function computeRandomAiMove() {
    const legalMoves = [];
    const position = game.getPosition();

    for (let x = 0; x < BOARD_SIZE; x += 1) {
      for (let y = 0; y < BOARD_SIZE; y += 1) {
        if (position.get(x, y) !== 0) {
          continue;
        }
        if (!game.isValid(x, y, WGo.W)) {
          continue;
        }
        legalMoves.push({ x, y });
      }
    }

    if (!legalMoves.length) {
      return { pass: true };
    }

    const choice = legalMoves[Math.floor(Math.random() * legalMoves.length)];
    return { ...choice, pass: false };
  }

  function applyAiMove(move) {
    if (!move) {
      setEngineStatus('Random opponent error.', 'error');
      setStatusMessage('Zen Go could not find a move.', 'error');
      state.aiThinking = false;
      updateButtons();
      return;
    }

    if (move.pass) {
      game.pass(WGo.W);
      state.moves.push({ color: 'W', pass: true });
      state.currentSgf = buildSgf();
      updateBoardFromGame();
      updateCaptureCounts();
      state.aiThinking = false;
      setEngineStatus('Random opponent ready.', 'success');
      setStatusMessage('Zen Go passes. Your move.', 'passive');
      updateButtons();
      return;
    }

    const result = game.play(move.x, move.y, WGo.W);
    if (typeof result === 'number') {
      state.aiThinking = false;
      setEngineStatus('Random opponent error.', 'error');
      setStatusMessage('Zen Go attempted an illegal move.', 'error');
      updateButtons();
      return;
    }

    state.moves.push({ color: 'W', x: move.x, y: move.y });
    state.currentSgf = buildSgf();
    updateBoardFromGame({ x: move.x, y: move.y, color: 'W' });
    updateCaptureCounts();
    state.aiThinking = false;
    const readable = toHumanCoord(move.x, move.y);
    setStatusMessage(`Zen Go (${state.difficulty.rank}) plays ${readable}. Your move.`, 'passive');
    setEngineStatus('Random opponent ready.', 'success');
    updateButtons();
  }

  function handleUndo() {
    if (state.aiThinking || state.moves.length === 0) {
      return;
    }

    const lastMove = state.moves.pop();
    if (lastMove && lastMove.color === 'W' && state.moves.length) {
      const maybePlayer = state.moves[state.moves.length - 1];
      if (maybePlayer.color === 'B') {
        state.moves.pop();
      }
    }

    replayGameFromHistory();
    updateBoardFromGame();
    updateCaptureCounts();
    state.currentSgf = buildSgf();
    setStatusMessage('Move undone. Your turn.', 'passive');
    updateButtons();
  }

  function handleResign() {
    if (state.gameOver) {
      return;
    }
    if (state.pendingAiMoveId !== null) {
      window.clearTimeout(state.pendingAiMoveId);
      state.pendingAiMoveId = null;
    }
    state.gameOver = true;
    state.aiThinking = false;
    setStatusMessage('You resigned. Start a new game to play again.', 'error');
    setEngineStatus('Match finished.', 'passive');
    updateButtons();
  }

  function replayGameFromHistory() {
    game = new WGo.Game(BOARD_SIZE);
    if (state.handicapStones.length) {
      state.handicapStones.forEach(({ x, y }) => {
        game.addStone(x, y, WGo.B);
      });
      game.turn = WGo.W;
    }

    const restoredMoves = [];
    state.moves.forEach((move) => {
      if (move.pass) {
        game.pass(move.color === 'B' ? WGo.B : WGo.W);
        restoredMoves.push({ ...move });
        return;
      }
      const playResult = game.play(move.x, move.y, move.color === 'B' ? WGo.B : WGo.W);
      if (typeof playResult !== 'number') {
        restoredMoves.push({ ...move });
      }
    });

    state.moves = restoredMoves;
  }

  function buildSgf() {
    const now = new Date();
    const isoDate = now.toISOString().split('T')[0];
    const header = [
      '(;GM[1]FF[4]',
      'SZ[9]',
      'KM[6.5]',
      `PB[You]`,
      `PW[Zen Go ${state.difficulty.rank}]`,
      'RU[Japanese]',
      `DT[${isoDate}]`,
      'AP[Zen Go v1]'
    ];

    if (state.handicapStones.length) {
      header.push(`HA[${state.handicapStones.length}]`);
      header.push('PL[W]');
      state.handicapStones.forEach(({ x, y }) => {
        header.push(`AB[${coordToSgf(x, y)}]`);
      });
    }

    const moves = state.moves
      .map((move) => {
        if (move.pass) {
          return `;${move.color}[]`;
        }
        return `;${move.color}[${coordToSgf(move.x, move.y)}]`;
      })
      .join('');

    return `${header.join('')}${moves})`;
  }

  function updateBoardFromGame(highlight) {
    board.removeAllObjects();
    const position = game.getPosition();
    for (let x = 0; x < BOARD_SIZE; x += 1) {
      for (let y = 0; y < BOARD_SIZE; y += 1) {
        const stone = position.get(x, y);
        if (stone === WGo.B) {
          board.addObject({ x, y, c: WGo.B });
        } else if (stone === WGo.W) {
          board.addObject({ x, y, c: WGo.W });
        }
      }
    }

    if (highlight && typeof highlight.x === 'number' && typeof highlight.y === 'number') {
      board.addObject({
        type: 'CR',
        x: highlight.x,
        y: highlight.y,
        c: highlight.color === 'W' ? '#1d4ed8' : '#f97316'
      });
      state.lastHighlight = highlight;
    } else {
      state.lastHighlight = null;
    }
  }

  function updateCaptureCounts() {
    const position = game.getPosition();
    blackCaptures.textContent = position.capCount.black ?? 0;
    whiteCaptures.textContent = position.capCount.white ?? 0;
  }

  function updateButtons() {
    undoButton.disabled = state.aiThinking || state.moves.length === 0 || state.gameOver;
    resignButton.disabled = state.gameOver;
  }

  function updateDifficultyUi() {
    rankLabel.textContent = state.difficulty.rank;
    eloLabel.textContent = `≈ ${state.difficulty.elo.toLocaleString()} ELO`;
    difficultyNote.textContent = state.difficulty.note;
  }

  function setStatusMessage(message, tone) {
    statusText.textContent = message;
    statusText.classList.remove('error', 'passive', 'active');
    if (tone === 'error') {
      statusText.classList.add('error');
    } else if (tone === 'passive') {
      statusText.classList.add('passive');
    } else if (tone === 'active') {
      statusText.classList.remove('passive');
    }
  }

  function flashStatus(message, isError) {
    setStatusMessage(message, isError ? 'error' : 'active');
    window.clearTimeout(flashStatus.timeoutId);
    flashStatus.timeoutId = window.setTimeout(() => {
      setStatusMessage(state.aiThinking ? 'Zen Go is thinking…' : 'Your move.', state.aiThinking ? 'active' : 'passive');
    }, 1600);
  }

  function setEngineStatus(message, tone) {
    engineStatus.textContent = message;
    engineStatus.classList.remove('pending', 'error', 'success', 'passive');
    if (tone === 'pending') {
      engineStatus.classList.add('pending');
    } else if (tone === 'error') {
      engineStatus.classList.add('error');
    } else if (tone === 'success') {
      engineStatus.classList.add('success');
    } else if (tone === 'passive') {
      engineStatus.classList.add('passive');
    }
  }

  function coordToSgf(x, y) {
    return `${String.fromCharCode(97 + x)}${String.fromCharCode(97 + y)}`;
  }

  function toHumanCoord(x, y) {
    const column = COLUMN_LABELS[x] ?? '?';
    const row = BOARD_SIZE - y;
    return `${column}${row}`;
  }
})();
