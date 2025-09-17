import { Chess } from 'chess.js';

class ChessGameManager {
  constructor() {
    this.game = new Chess();
    this.mode = 'single';
    this.difficulty = 5;
    this.lastMove = null;
  }

  reset() {
    this.game.reset();
    this.lastMove = null;
  }

  setMode(mode) {
    this.mode = mode === 'two' ? 'two' : 'single';
  }

  getMode() {
    return this.mode;
  }

  setDifficulty(level) {
    this.difficulty = typeof level === 'number' ? level : this.difficulty;
  }

  getDifficulty() {
    return this.difficulty;
  }

  getBoard() {
    return this.game.board();
  }

  getFen() {
    return this.game.fen();
  }

  getTurn() {
    return this.game.turn();
  }

  isGameOver() {
    return this.game.isGameOver();
  }

  isCheckmate() {
    return this.game.isCheckmate();
  }

  isStalemate() {
    return this.game.isStalemate();
  }

  isDraw() {
    return this.game.isDraw();
  }

  inCheck() {
    return this.game.inCheck();
  }

  loadState(state = {}) {
    if (state.fen) {
      this.game.load(state.fen);
    } else {
      this.game.reset();
    }
    if (state.mode) {
      this.setMode(state.mode);
    }
    if (typeof state.difficulty === 'number') {
      this.setDifficulty(state.difficulty);
    }
    this.lastMove = state.lastMove || this.extractLastMove();
  }

  extractLastMove() {
    const history = this.game.history({ verbose: true });
    const tail = history[history.length - 1];
    return tail ? { from: tail.from, to: tail.to } : null;
  }

  attemptMove(from, to, promotion = 'q') {
    try {
      const move = this.game.move({ from, to, promotion });
      if (move) {
        this.lastMove = { from: move.from, to: move.to };
        return move;
      }
    } catch (error) {
      return null;
    }
    return null;
  }

  getLastMove() {
    return this.lastMove;
  }

  getLegalTargets(square, restrictToWhite) {
    const piece = square ? this.game.get(square) : null;
    if (!piece) return [];
    if (restrictToWhite && piece.color !== 'w') return [];
    return this.game.moves({ square, verbose: true }).map((move) => move.to);
  }

  toJSON() {
    return {
      fen: this.getFen(),
      mode: this.mode,
      difficulty: this.difficulty,
      lastMove: this.lastMove,
    };
  }
}

export default ChessGameManager;
