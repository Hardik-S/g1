(function (global) {
  const DEFAULT_PROMOTION = 'q';

  function getGlobalChess() {
    if (global && global.Chess) {
      return global.Chess;
    }
    throw new Error('Chess.js is required before creating a BoardManager');
  }

  function extractMoveParts(moveString) {
    if (!moveString) {
      return null;
    }
    const from = moveString.slice(0, 2);
    const to = moveString.slice(2, 4);
    const promotion = moveString.slice(4) || DEFAULT_PROMOTION;
    return { from, to, promotion };
  }

  class BoardManager {
    constructor(options = {}) {
      const {
        elementId = 'chessboard',
        orientation = 'white',
        boardFactory,
        createGame,
      } = options;

      this.elementId = elementId;
      this.orientation = orientation;
      this.createGame = createGame || (() => new (getGlobalChess())());
      this.players = {
        white: 'human',
        black: 'human',
      };
      this.afterMoveCallbacks = [];
      this.game = this.createGame();
      this.boardFactory = boardFactory || ((config) => {
        if (!global.Chessboard) {
          throw new Error('Chessboard.js must be loaded before initializing the board');
        }
        return global.Chessboard(this.elementId, config);
      });

      const config = {
        draggable: true,
        position: 'start',
        orientation: this.orientation,
        pieceTheme:
          'https://cdn.jsdelivr.net/npm/@chrisoakman/chessboardjs@1.0.0/img/chesspieces/wikipedia/{piece}.png',
        onDragStart: this.handleDragStart.bind(this),
        onDrop: this.handleDrop.bind(this),
        onSnapEnd: this.syncBoard.bind(this),
      };

      this.board = this.boardFactory(config);
    }

    reset() {
      this.game = this.createGame();
      this.syncBoard();
    }

    setPlayers(config = {}) {
      this.players = {
        white: config.white || 'human',
        black: config.black || 'human',
      };
    }

    onAfterMove(callback) {
      if (typeof callback === 'function') {
        this.afterMoveCallbacks.push(callback);
      }
    }

    getCurrentTurn() {
      return this.game.turn();
    }

    isGameOver() {
      return this.game.isGameOver();
    }

    getFen() {
      return this.game.fen();
    }

    attemptMove(from, to, promotion = DEFAULT_PROMOTION) {
      let move = null;
      try {
        move = this.game.move({ from, to, promotion });
      } catch (error) {
        move = null;
      }
      if (move) {
        this.syncBoard();
        this.notifyAfterMove(move);
      }
      return move;
    }

    attemptLocalMove(from, to) {
      return this.attemptMove(from, to, DEFAULT_PROMOTION);
    }

    handleDragStart(source, piece) {
      if (this.isGameOver()) {
        return false;
      }

      const pieceColor = piece.charAt(0) === 'w' ? 'w' : 'b';
      const playersTurn = this.getCurrentTurn();

      if (pieceColor !== playersTurn) {
        return false;
      }

      const isHumanTurn =
        (playersTurn === 'w' && this.players.white === 'human') ||
        (playersTurn === 'b' && this.players.black === 'human');

      return isHumanTurn;
    }

    handleDrop(source, target) {
      if (source === target) {
        return 'snapback';
      }

      const isHumanTurn =
        (this.getCurrentTurn() === 'w' && this.players.white === 'human') ||
        (this.getCurrentTurn() === 'b' && this.players.black === 'human');

      if (!isHumanTurn) {
        return 'snapback';
      }

      const move = this.attemptMove(source, target, DEFAULT_PROMOTION);
      if (!move) {
        return 'snapback';
      }

      return undefined;
    }

    syncBoard() {
      if (this.board && typeof this.board.position === 'function') {
        this.board.position(this.game.fen());
      }
    }

    applyEngineMove(moveString) {
      const moveParts = extractMoveParts(moveString);
      if (!moveParts) {
        return null;
      }

      const move = this.attemptMove(moveParts.from, moveParts.to, moveParts.promotion);
      return move;
    }

    isEngineTurn() {
      const turn = this.getCurrentTurn();
      return (
        (turn === 'w' && this.players.white === 'engine') ||
        (turn === 'b' && this.players.black === 'engine')
      );
    }

    notifyAfterMove(move) {
      const payload = {
        move,
        fen: this.getFen(),
        game: this.game,
      };
      this.afterMoveCallbacks.forEach((callback) => {
        callback(payload);
      });
    }

    dispose() {
      if (this.board && typeof this.board.destroy === 'function') {
        this.board.destroy();
      }
      this.board = null;
      this.afterMoveCallbacks = [];
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = BoardManager;
    module.exports.default = BoardManager;
  } else {
    global.BoardManager = BoardManager;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
