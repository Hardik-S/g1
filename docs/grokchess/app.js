(function () {
  const statusEl = document.getElementById('status');
  const whiteClockEl = document.getElementById('white-clock');
  const blackClockEl = document.getElementById('black-clock');
  const newGameBtn = document.getElementById('new-game');
  const timeControlSelect = document.getElementById('time-control');

  const timeControls = {
    '3m': { base: 3 * 60 * 1000, increment: 0 },
    '5m+2s': { base: 5 * 60 * 1000, increment: 2000 }
  };

  const game = new Chess();
  let board = null;
  let stockfish = null;
  let stockfishReady = false;
  let isEngineThinking = false;
  let pendingFen = null;

  let currentTimeControlKey = timeControlSelect.value;
  let clocks = {
    w: timeControls[currentTimeControlKey].base,
    b: timeControls[currentTimeControlKey].base
  };

  let activeColor = null;
  let timerId = null;
  let lastTick = null;
  let gameStarted = false;
  let gameEnded = false;
  let overrideStatus = null;

  function formatTime(ms) {
    const safeMs = Math.max(0, Math.floor(ms));
    const minutes = Math.floor(safeMs / 60000);
    const seconds = Math.floor((safeMs % 60000) / 1000);
    const paddedSeconds = seconds.toString().padStart(2, '0');
    return `${minutes.toString().padStart(2, '0')}:${paddedSeconds}`;
  }

  function updateClockDisplay() {
    whiteClockEl.textContent = formatTime(clocks.w);
    blackClockEl.textContent = formatTime(clocks.b);
  }

  function pauseClock() {
    if (timerId) {
      window.clearInterval(timerId);
      timerId = null;
    }
    activeColor = null;
    lastTick = null;
  }

  function advanceClock() {
    if (!activeColor || lastTick === null || gameEnded) {
      return;
    }

    const now = performance.now();
    const elapsed = now - lastTick;
    if (elapsed <= 0) {
      return;
    }

    lastTick = now;
    clocks[activeColor] -= elapsed;

    if (clocks[activeColor] <= 0) {
      clocks[activeColor] = 0;
      updateClockDisplay();
      declareTimeout(activeColor);
    }
  }

  function tick() {
    advanceClock();
    if (!gameEnded) {
      updateClockDisplay();
    }
  }

  function startClockFor(color) {
    if (gameEnded) {
      return;
    }

    activeColor = color;
    lastTick = performance.now();
    if (!timerId) {
      timerId = window.setInterval(tick, 100);
    }
  }

  function applyIncrement(color) {
    const increment = timeControls[currentTimeControlKey].increment;
    if (increment > 0) {
      clocks[color] += increment;
    }
  }

  function declareTimeout(color) {
    if (gameEnded) {
      return;
    }

    const loser = color === 'w' ? 'White' : 'Black';
    const winner = color === 'w' ? 'Black' : 'White';
    overrideStatus = `${loser} flagged. ${winner} wins on time.`;
    gameEnded = true;
    isEngineThinking = false;
    pauseClock();
    updateStatus();
  }

  function resetClocks() {
    clocks = {
      w: timeControls[currentTimeControlKey].base,
      b: timeControls[currentTimeControlKey].base
    };
    updateClockDisplay();
  }

  function resetGame() {
    game.reset();
    board.start(false);
    pendingFen = null;
    pauseClock();
    resetClocks();
    activeColor = null;
    lastTick = null;
    gameStarted = false;
    gameEnded = false;
    overrideStatus = null;
    isEngineThinking = false;
    statusEl.textContent = 'White to move.';

    if (stockfishReady && stockfish) {
      stockfish.postMessage('ucinewgame');
    }
  }

  function updateStatus() {
    if (!overrideStatus) {
      if (game.in_checkmate()) {
        const winner = game.turn() === 'w' ? 'Black' : 'White';
        overrideStatus = `Checkmate! ${winner} wins.`;
        gameEnded = true;
        isEngineThinking = false;
        pauseClock();
      } else if (game.in_stalemate()) {
        overrideStatus = 'Draw by stalemate.';
        gameEnded = true;
        isEngineThinking = false;
        pauseClock();
      } else if (game.insufficient_material()) {
        overrideStatus = 'Draw by insufficient material.';
        gameEnded = true;
        isEngineThinking = false;
        pauseClock();
      } else if (game.in_threefold_repetition()) {
        overrideStatus = 'Draw by threefold repetition.';
        gameEnded = true;
        isEngineThinking = false;
        pauseClock();
      } else if (game.in_draw()) {
        overrideStatus = 'Draw by fifty-move rule.';
        gameEnded = true;
        isEngineThinking = false;
        pauseClock();
      }
    }

    if (overrideStatus) {
      statusEl.textContent = overrideStatus;
      return;
    }

    let message = `${game.turn() === 'w' ? 'White' : 'Black'} to move.`;
    if (game.in_check()) {
      message += ` ${game.turn() === 'w' ? 'White' : 'Black'} is in check.`;
    }
    if (isEngineThinking && game.turn() === 'b') {
      message += ' Stockfish is thinking...';
    }
    statusEl.textContent = message;
  }

  function requestEngineMove() {
    if (!stockfish || gameEnded) {
      return;
    }

    const fen = game.fen();
    if (!stockfishReady) {
      pendingFen = fen;
      return;
    }

    pendingFen = null;
    stockfish.postMessage(`position fen ${fen}`);
    stockfish.postMessage('go depth 10');
  }

  function handlePlayerMove() {
    advanceClock();
    applyIncrement('w');
    updateClockDisplay();

    if (!gameStarted) {
      gameStarted = true;
    }

    if (gameEnded || game.game_over()) {
      updateStatus();
      return;
    }

    isEngineThinking = true;
    updateStatus();
    startClockFor('b');
    requestEngineMove();
  }

  function handleEngineMove(move) {
    if (gameEnded) {
      return;
    }

    advanceClock();
    applyIncrement('b');
    updateClockDisplay();
    isEngineThinking = false;

    if (gameEnded || game.game_over()) {
      updateStatus();
      return;
    }

    startClockFor('w');
    updateStatus();
  }

  function initStockfish() {
    try {
      stockfish = new Worker('stockfish.js');
    } catch (error) {
      console.error('Stockfish worker failed to load:', error);
      alert('Failed to load Stockfish engine. Please ensure stockfish.js and stockfish.wasm are available.');
      overrideStatus = 'Stockfish engine failed to load.';
      gameEnded = true;
      isEngineThinking = false;
      pauseClock();
      updateStatus();
      return;
    }

    stockfish.onmessage = (event) => {
      const message = event.data;
      if (typeof message !== 'string') {
        return;
      }

      if (message === 'uciok') {
        stockfish.postMessage('isready');
        return;
      }

      if (message === 'readyok') {
        stockfishReady = true;
        if (pendingFen && !gameEnded) {
          requestEngineMove();
        }
        return;
      }

      if (message.startsWith('bestmove')) {
        const [, bestMove] = message.split(' ');
        if (!bestMove || bestMove === '(none)') {
          pendingFen = null;
          isEngineThinking = false;
          pauseClock();
          updateStatus();
          return;
        }

        const from = bestMove.slice(0, 2);
        const to = bestMove.slice(2, 4);
        const promotion = bestMove.length > 4 ? bestMove.slice(4) : 'q';
        const move = game.move({ from, to, promotion });
        if (move) {
          board.position(game.fen(), true);
          pendingFen = null;
          handleEngineMove(move);
          updateStatus();
        }
        return;
      }
    };

    stockfish.onerror = (error) => {
      console.error('Stockfish worker error:', error);
      alert('Stockfish engine encountered an error. Please refresh the page.');
      overrideStatus = 'Stockfish engine error.';
      gameEnded = true;
      isEngineThinking = false;
      pauseClock();
      updateStatus();
    };

    stockfish.postMessage('uci');
  }

  function initBoard() {
    board = Chessboard('board', {
      draggable: true,
      position: 'start',
      orientation: 'white',
      pieceTheme: 'https://cdnjs.cloudflare.com/ajax/libs/chessboard-js/1.0.0/img/chesspieces/wikipedia/{piece}.png',
      onDragStart(source, piece) {
        if (gameEnded || isEngineThinking) {
          return false;
        }
        if (piece.startsWith('b')) {
          return false;
        }
        if (game.turn() !== 'w') {
          return false;
        }
        if (game.in_checkmate() || game.in_draw()) {
          return false;
        }
        return true;
      },
      onDrop(source, target) {
        const move = game.move({ from: source, to: target, promotion: 'q' });
        if (!move) {
          return 'snapback';
        }
        updateStatus();
        window.requestAnimationFrame(() => {
          board.position(game.fen(), true);
        });
        handlePlayerMove();
        return undefined;
      },
      onSnapEnd() {
        board.position(game.fen(), true);
      }
    });

    window.addEventListener('resize', () => {
      board.resize();
    });
  }

  newGameBtn.addEventListener('click', () => {
    resetGame();
  });

  timeControlSelect.addEventListener('change', (event) => {
    const value = event.target.value;
    if (!timeControls[value]) {
      return;
    }
    currentTimeControlKey = value;
    resetGame();
  });

  initBoard();
  initStockfish();
  resetGame();
})();
