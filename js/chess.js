(function (global) {
  function ready(callback) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true });
    } else {
      callback();
    }
  }

  function describeStatus(game) {
    if (game.isCheckmate()) {
      const winner = game.turn() === 'w' ? 'Black' : 'White';
      return `${winner} wins by checkmate.`;
    }

    if (game.isDraw()) {
      return 'Drawn position.';
    }

    if (game.isCheck()) {
      const defender = game.turn() === 'w' ? 'White' : 'Black';
      return `${defender} is in check.`;
    }

    const turn = game.turn() === 'w' ? 'White' : 'Black';
    return `${turn} to move.`;
  }

  ready(() => {
    const boardElementId = 'chessboard';
    const modeSelect = document.getElementById('mode-select');
    const newGameButton = document.getElementById('new-game');
    const statusTurn = document.getElementById('status-turn');
    const statusInfo = document.getElementById('status-info');
    const modeNote = document.getElementById('mode-note');
    const skillInput = document.getElementById('skill-level');
    const skillValue = document.getElementById('skill-value');

    const BoardManagerCtor = global.BoardManager?.default ?? global.BoardManager;

    if (!BoardManagerCtor) {
      throw new Error('BoardManager must be loaded before chess.js');
    }

    const boardManager = new BoardManagerCtor({
      elementId: boardElementId,
    });

    let engineEnabled = false;
    let engineMoveInProgress = false;
    let engineInstance = null;
    let engineRequestId = 0;

    function ensureEngine() {
      if (!engineInstance) {
        const StockfishEngineCtor =
          global.StockfishEngine?.default ?? global.StockfishEngine;

        if (!StockfishEngineCtor) {
          throw new Error('StockfishEngine must be loaded before enabling single player mode');
        }
        engineInstance = new StockfishEngineCtor();
      }
      return engineInstance;
    }

    function updateSkillDisplay() {
      const value = parseInt(skillInput.value, 10);
      skillValue.textContent = value;
      if (engineInstance) {
        engineInstance.setSkillLevel(value);
      }
    }

    function updateModeNote() {
      modeNote.textContent = engineEnabled
        ? 'You control White. Stockfish will play Black after a short delay.'
        : 'Both sides are controlled locally. Take turns at the board!';
      skillInput.disabled = !engineEnabled;
    }

    function updateStatus() {
      const turn = boardManager.getCurrentTurn() === 'w' ? 'White' : 'Black';
      statusTurn.textContent = `Turn: ${turn}`;
      statusInfo.textContent = describeStatus(boardManager.game);
    }

    async function triggerEngineMove() {
      if (!engineEnabled || engineMoveInProgress) {
        return;
      }

      if (boardManager.isGameOver()) {
        return;
      }

      if (!boardManager.isEngineTurn()) {
        return;
      }

      engineMoveInProgress = true;
      const requestId = ++engineRequestId;
      const engine = ensureEngine();
      const fen = boardManager.getFen();
      const move = await engine.requestMove(fen);
      engineMoveInProgress = false;

      if (requestId !== engineRequestId) {
        return;
      }

      if (!engineEnabled) {
        return;
      }

      if (move) {
        const applied = boardManager.applyEngineMove(move);
        if (applied) {
          updateStatus();
        }
      }
    }

    boardManager.onAfterMove(() => {
      updateStatus();
      triggerEngineMove();
    });

    newGameButton.addEventListener('click', () => {
      engineMoveInProgress = false;
      engineRequestId += 1;
      if (engineInstance) {
        engineInstance.stop();
      }
      boardManager.reset();
      if (engineEnabled) {
        boardManager.setPlayers({ white: 'human', black: 'engine' });
      } else {
        boardManager.setPlayers({ white: 'human', black: 'human' });
      }
      updateStatus();
      updateModeNote();
    });

    modeSelect.addEventListener('change', (event) => {
      const value = event.target.value;
      if (value === 'single') {
        engineEnabled = true;
        boardManager.setPlayers({ white: 'human', black: 'engine' });
        ensureEngine();
        updateSkillDisplay();
      } else {
        engineEnabled = false;
        engineRequestId += 1;
        if (engineInstance) {
          engineInstance.stop();
        }
        boardManager.setPlayers({ white: 'human', black: 'human' });
      }
      updateModeNote();
      updateStatus();
      triggerEngineMove();
    });

    skillInput.addEventListener('input', () => {
      updateSkillDisplay();
    });

    boardManager.setPlayers({ white: 'human', black: 'human' });
    updateSkillDisplay();
    updateModeNote();
    updateStatus();
  });
})(typeof window !== 'undefined' ? window : globalThis);
