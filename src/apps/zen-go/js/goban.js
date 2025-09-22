const BOARD_SIZE = 19;
const EMPTY = 0;
const BLACK = 1;
const WHITE = 2;
const BORDER = 3;

export const COLORS = Object.freeze({
  BLACK,
  WHITE
});

export const PASS_MOVE = 'pass';

const LETTERS = 'ABCDEFGHJKLMNOPQRST';

function clampTemperature(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return 1;
  }
  return value;
}

export default class Goban {
  constructor(size = BOARD_SIZE) {
    this.size = size;
    this.gridSize = size + 2; // build a 21×21 board with a sentinel border
    this.board = new Uint8Array(this.gridSize * this.gridSize);
    this.captures = {
      [BLACK]: 0,
      [WHITE]: 0
    };
    this.moveHistory = [];
    this.snapshots = [];
    this.lastMove = null;
    this.consecutivePasses = 0;
    this.reset();
  }

  reset() {
    const total = this.gridSize * this.gridSize;
    for (let i = 0; i < total; i += 1) {
      this.board[i] = BORDER;
    }
    for (let y = 0; y < this.size; y += 1) {
      for (let x = 0; x < this.size; x += 1) {
        this.board[this.toIndex(x, y)] = EMPTY;
      }
    }
    this.captures[BLACK] = 0;
    this.captures[WHITE] = 0;
    this.moveHistory = [];
    this.snapshots = [];
    this.lastMove = null;
    this.consecutivePasses = 0;
  }

  createSnapshot() {
    return {
      board: Uint8Array.from(this.board),
      captures: {
        [BLACK]: this.captures[BLACK],
        [WHITE]: this.captures[WHITE]
      },
      lastMove: this.lastMove ? { ...this.lastMove } : null,
      consecutivePasses: this.consecutivePasses
    };
  }

  restoreBoard(snapshot) {
    if (!snapshot) {
      return;
    }
    this.board.set(snapshot.board);
    this.captures[BLACK] = snapshot.captures[BLACK];
    this.captures[WHITE] = snapshot.captures[WHITE];
    this.lastMove = snapshot.lastMove ? { ...snapshot.lastMove } : null;
    this.consecutivePasses = snapshot.consecutivePasses ?? 0;
  }

  toIndex(x, y) {
    return (y + 1) * this.gridSize + (x + 1);
  }

  indexToPoint(index) {
    const row = Math.floor(index / this.gridSize) - 1;
    const col = index % this.gridSize - 1;
    return { x: col, y: row };
  }

  isOnBoard(x, y) {
    return x >= 0 && x < this.size && y >= 0 && y < this.size;
  }

  getStone(x, y) {
    if (!this.isOnBoard(x, y)) {
      return BORDER;
    }
    return this.board[this.toIndex(x, y)];
  }

  getCaptures() {
    return {
      black: this.captures[BLACK],
      white: this.captures[WHITE]
    };
  }

  getMoveHistory() {
    return this.moveHistory.slice();
  }

  getLastMove() {
    return this.lastMove ? { ...this.lastMove } : null;
  }

  opponent(color) {
    return color === BLACK ? WHITE : BLACK;
  }

  setStone(x, y, color) {
    if (!this.isOnBoard(x, y)) {
      return { ok: false, reason: 'off_board' };
    }
    const index = this.toIndex(x, y);
    if (this.board[index] !== EMPTY) {
      return { ok: false, reason: 'occupied' };
    }

    this.board[index] = color;

    const opponent = this.opponent(color);
    const captured = [];

    for (const neighbor of this.getNeighborIndexes(index)) {
      if (this.board[neighbor] === opponent) {
        const info = this.countLiberties(neighbor, opponent);
        if (info.libertyCount === 0) {
          const removed = this.clearBlock(info.stones);
          if (removed.length) {
            captured.push(...removed);
          }
        }
      }
    }

    const ownInfo = this.countLiberties(index, color);
    if (ownInfo.libertyCount === 0 && captured.length === 0) {
      this.board[index] = EMPTY;
      return { ok: false, reason: 'suicide' };
    }

    if (captured.length) {
      this.captures[color] += captured.length;
    }

    return {
      ok: true,
      captured,
      liberties: ownInfo.libertyCount
    };
  }

  playMove(x, y, color, meta = {}) {
    const snapshot = this.createSnapshot();
    const result = this.setStone(x, y, color);
    if (!result.ok) {
      this.restoreBoard(snapshot);
      return result;
    }

    this.snapshots.push(snapshot);
    const moveRecord = {
      type: 'play',
      moveNumber: this.moveHistory.length + 1,
      color,
      x,
      y,
      captured: result.captured,
      liberties: result.liberties,
      ...meta
    };
    this.moveHistory.push(moveRecord);
    this.lastMove = {
      color,
      x,
      y,
      captured: result.captured,
      liberties: result.liberties
    };
    this.consecutivePasses = 0;
    return { ...result, move: moveRecord };
  }

  passMove(color, meta = {}) {
    const snapshot = this.createSnapshot();
    this.snapshots.push(snapshot);
    const moveRecord = {
      type: PASS_MOVE,
      moveNumber: this.moveHistory.length + 1,
      color,
      pass: true,
      ...meta
    };
    this.moveHistory.push(moveRecord);
    this.lastMove = {
      color,
      pass: true
    };
    this.consecutivePasses += 1;
    return { ok: true, move: moveRecord };
  }

  undo() {
    if (!this.moveHistory.length) {
      return false;
    }
    const snapshot = this.snapshots.pop();
    if (!snapshot) {
      return false;
    }
    this.restoreBoard(snapshot);
    this.moveHistory.pop();
    this.lastMove = this.moveHistory.length
      ? { ...this.moveHistory[this.moveHistory.length - 1] }
      : null;
    return true;
  }

  getNeighborIndexes(index) {
    return [
      index - 1,
      index + 1,
      index - this.gridSize,
      index + this.gridSize
    ];
  }

  getNeighborCoords(x, y) {
    return [
      { x: x - 1, y },
      { x: x + 1, y },
      { x, y: y - 1 },
      { x, y: y + 1 }
    ].filter((point) => this.isOnBoard(point.x, point.y));
  }

  countLiberties(startIndex, color) {
    const stack = [startIndex];
    const visited = new Set();
    const liberties = new Set();

    while (stack.length) {
      const index = stack.pop();
      if (visited.has(index)) {
        continue;
      }
      visited.add(index);
      for (const neighbor of this.getNeighborIndexes(index)) {
        const stone = this.board[neighbor];
        if (stone === color) {
          stack.push(neighbor);
        } else if (stone === EMPTY) {
          liberties.add(neighbor);
        }
      }
    }

    return {
      libertyCount: liberties.size,
      liberties: Array.from(liberties),
      stones: Array.from(visited)
    };
  }

  countLibertiesAt(x, y, color = this.getStone(x, y)) {
    if (!this.isOnBoard(x, y) || (color !== BLACK && color !== WHITE)) {
      return { libertyCount: 0, liberties: [], stones: [] };
    }
    return this.countLiberties(this.toIndex(x, y), color);
  }

  clearBlock(stones) {
    const removed = [];
    for (const index of stones) {
      const stoneColor = this.board[index];
      if (stoneColor === BLACK || stoneColor === WHITE) {
        const point = this.indexToPoint(index);
        removed.push({
          x: point.x,
          y: point.y,
          color: stoneColor
        });
        this.board[index] = EMPTY;
      }
    }
    return removed;
  }

  listLegalMoves(color) {
    const moves = [];
    for (let y = 0; y < this.size; y += 1) {
      for (let x = 0; x < this.size; x += 1) {
        if (this.isLegal(x, y, color)) {
          moves.push({ x, y });
        }
      }
    }
    return moves;
  }

  isLegal(x, y, color) {
    if (!this.isOnBoard(x, y)) {
      return false;
    }
    if (this.getStone(x, y) !== EMPTY) {
      return false;
    }
    const snapshot = this.createSnapshot();
    const result = this.setStone(x, y, color);
    this.restoreBoard(snapshot);
    return result.ok;
  }

  topThreePolicy(policyEntries, color, temperature = 1) {
    if (!Array.isArray(policyEntries) || !policyEntries.length) {
      return { type: PASS_MOVE, color };
    }

    const temp = clampTemperature(temperature);
    const legalCandidates = [];
    let passWeight = 0;

    for (const entry of policyEntries) {
      if (!entry) {
        continue;
      }
      if (entry.pass || entry.type === PASS_MOVE) {
        const weight = Math.max(0, entry.policy ?? entry.weight ?? 0);
        passWeight = Math.max(passWeight, weight);
        continue;
      }
      const x = entry.x ?? entry.col ?? entry.column;
      const y = entry.y ?? entry.row;
      if (!Number.isInteger(x) || !Number.isInteger(y)) {
        continue;
      }
      if (!this.isLegal(x, y, color)) {
        continue;
      }
      const weight = Math.max(0, entry.policy ?? entry.weight ?? entry.score ?? 0);
      if (weight <= 0) {
        continue;
      }
      legalCandidates.push({ x, y, policy: weight });
    }

    if (!legalCandidates.length) {
      return { type: PASS_MOVE, color, policy: passWeight };
    }

    legalCandidates.sort((a, b) => b.policy - a.policy);
    const top = legalCandidates.slice(0, 3);

    const adjusted = top.map((item) => ({
      ...item,
      weight: Math.pow(item.policy + 1e-9, 1 / temp)
    }));

    const totalWeight = adjusted.reduce((sum, item) => sum + item.weight, 0);
    let threshold = Math.random() * totalWeight;
    for (const item of adjusted) {
      threshold -= item.weight;
      if (threshold <= 0) {
        return { type: 'play', x: item.x, y: item.y, policy: item.policy };
      }
    }

    const fallback = adjusted[0];
    return { type: 'play', x: fallback.x, y: fallback.y, policy: fallback.policy };
  }

  estimateScore() {
    let black = this.captures[BLACK];
    let white = this.captures[WHITE];
    const visited = new Set();

    for (let y = 0; y < this.size; y += 1) {
      for (let x = 0; x < this.size; x += 1) {
        const stone = this.getStone(x, y);
        if (stone === BLACK) {
          black += 1;
        } else if (stone === WHITE) {
          white += 1;
        } else if (stone === EMPTY) {
          const index = this.toIndex(x, y);
          if (visited.has(index)) {
            continue;
          }
          const region = this.exploreEmptyRegion(index, visited);
          if (region.owner === BLACK) {
            black += region.size;
          } else if (region.owner === WHITE) {
            white += region.size;
          }
        }
      }
    }

    const leadValue = Math.abs(black - white);
    const leader = leadValue === 0 ? null : black > white ? BLACK : WHITE;
    return {
      black,
      white,
      leader,
      leadValue
    };
  }

  exploreEmptyRegion(startIndex, visited) {
    const stack = [startIndex];
    const region = [];
    const borderingColors = new Set();

    while (stack.length) {
      const index = stack.pop();
      if (visited.has(index)) {
        continue;
      }
      visited.add(index);
      region.push(index);

      for (const neighbor of this.getNeighborIndexes(index)) {
        const stone = this.board[neighbor];
        if (stone === EMPTY) {
          if (!visited.has(neighbor)) {
            stack.push(neighbor);
          }
        } else if (stone === BLACK || stone === WHITE) {
          borderingColors.add(stone);
        }
      }
    }

    let owner = null;
    if (borderingColors.size === 1) {
      owner = borderingColors.values().next().value;
    }

    return {
      size: region.length,
      owner
    };
  }

  vertexFromPoint(x, y) {
    if (!this.isOnBoard(x, y)) {
      return PASS_MOVE;
    }
    const letter = LETTERS[x] ?? '?';
    const row = this.size - y;
    return `${letter}${row}`;
  }
}

export { BOARD_SIZE };
