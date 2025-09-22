'use strict';

const {
  Goban,
  fromGtpCoord,
  toGtpCoord,
  normalizeColor,
  BLACK,
  WHITE
} = require('./goban.js');
const { loadZenGoModel } = require('./model-wrapper.js');

function cloneMove(move) {
  if (!move || typeof move !== 'object') {
    return null;
  }
  const result = {};
  if (typeof move.x === 'number') {
    result.x = move.x;
  }
  if (typeof move.y === 'number') {
    result.y = move.y;
  }
  if (typeof move.vertex === 'string') {
    result.vertex = move.vertex;
  }
  if (typeof move.pass === 'boolean') {
    result.pass = move.pass;
  }
  if (typeof move.color === 'string') {
    result.color = move.color;
  }
  return result;
}

class ZenGoEngine {
  constructor(options = {}) {
    const { size = 9 } = options;
    this.goban = new Goban(size);
    this.moveHistory = [];
  }

  get size() {
    return this.goban.size;
  }

  setBoardSize(size) {
    this.goban.setSize(size);
    this.moveHistory = [];
  }

  clearBoard() {
    this.goban.clear();
    this.moveHistory = [];
  }

  showBoard() {
    return this.goban.renderAscii();
  }

  getCaptures() {
    return this.goban.getCaptures();
  }

  play(colorInput, vertexInput) {
    const color = normalizeColor(colorInput);
    if (typeof vertexInput !== 'string') {
      throw new Error('Vertex is required for play command.');
    }
    const vertex = vertexInput.trim();
    if (vertex.toUpperCase() === 'PASS') {
      this.moveHistory.push({ color, pass: true });
      return { pass: true };
    }
    const coords = fromGtpCoord(vertex, this.goban.size);
    if (!coords) {
      this.moveHistory.push({ color, pass: true });
      return { pass: true };
    }
    try {
      this.goban.play(color, coords.x, coords.y);
      const move = { color, x: coords.x, y: coords.y, vertex: toGtpCoord(coords.x, coords.y, this.goban.size) };
      this.moveHistory.push(move);
      return move;
    } catch (error) {
      throw new Error(`Illegal move: ${error.message}`);
    }
  }

  listLegalMoves(colorInput) {
    const color = normalizeColor(colorInput);
    return this.goban.listLegalMoves(color);
  }

  async genMove(colorInput) {
    const color = normalizeColor(colorInput);
    const legalMoves = this.goban.listLegalMoves(color);
    if (legalMoves.length === 0) {
      const passMove = { color, pass: true };
      this.moveHistory.push(passMove);
      return passMove;
    }

    let model;
    try {
      model = await loadZenGoModel();
    } catch (error) {
      model = null;
    }

    let suggestion = null;
    if (model && typeof model.suggestMove === 'function') {
      try {
        const context = {
          color,
          legalMoves: legalMoves.map((move) => ({ ...move })),
          board: this.goban.exportState(),
          history: this.moveHistory.map(cloneMove),
          toVertex: (move) => toGtpCoord(move.x, move.y, this.goban.size)
        };
        suggestion = await model.suggestMove(context);
      } catch (error) {
        suggestion = null;
      }
    }

    let chosen = null;
    if (suggestion) {
      let candidate = suggestion;
      if (typeof candidate === 'string') {
        try {
          const coords = fromGtpCoord(candidate, this.goban.size);
          if (coords) {
            candidate = coords;
          }
        } catch (error) {
          candidate = null;
        }
      } else if (candidate && typeof candidate.vertex === 'string') {
        try {
          const coords = fromGtpCoord(candidate.vertex, this.goban.size);
          if (coords) {
            candidate = { x: coords.x, y: coords.y };
          }
        } catch (error) {
          candidate = null;
        }
      }
      if (
        candidate &&
        Number.isInteger(candidate.x) &&
        Number.isInteger(candidate.y) &&
        this.goban.isOnBoard(candidate.x, candidate.y) &&
        this.goban.isLegal(color, candidate.x, candidate.y)
      ) {
        chosen = { x: candidate.x, y: candidate.y };
      }
    }

    if (!chosen) {
      const randomIndex = Math.floor(Math.random() * legalMoves.length);
      chosen = legalMoves[randomIndex];
    }

    this.goban.play(color, chosen.x, chosen.y);
    const resultMove = {
      color,
      x: chosen.x,
      y: chosen.y,
      vertex: toGtpCoord(chosen.x, chosen.y, this.goban.size),
      generated: true
    };
    this.moveHistory.push(resultMove);
    return resultMove;
  }
}

function createEngine(options) {
  return new ZenGoEngine(options);
}

module.exports = {
  ZenGoEngine,
  createEngine,
  Goban,
  BLACK,
  WHITE
};
