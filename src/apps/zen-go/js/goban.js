'use strict';

const EMPTY = 0;
const BLACK = 'B';
const WHITE = 'W';
const COLUMN_ALPHABET = 'ABCDEFGHJKLMNOPQRSTUVWXYZ';

function normalizeColor(input) {
  const value = typeof input === 'string' ? input.trim().toUpperCase() : '';
  if (value === 'B' || value === 'BLACK') {
    return BLACK;
  }
  if (value === 'W' || value === 'WHITE') {
    return WHITE;
  }
  throw new Error(`Unknown color: ${input}`);
}

function indexToLetters(index) {
  if (!Number.isInteger(index) || index < 0) {
    throw new Error(`Invalid index: ${index}`);
  }
  const base = COLUMN_ALPHABET.length;
  let value = index + 1;
  let result = '';
  while (value > 0) {
    const remainder = (value - 1) % base;
    result = COLUMN_ALPHABET[remainder] + result;
    value = Math.floor((value - 1) / base);
  }
  return result;
}

function lettersToIndex(letters) {
  if (typeof letters !== 'string' || letters.length === 0) {
    throw new Error(`Invalid column label: ${letters}`);
  }
  const base = COLUMN_ALPHABET.length;
  let value = 0;
  for (let i = 0; i < letters.length; i += 1) {
    const char = letters[i];
    const offset = COLUMN_ALPHABET.indexOf(char);
    if (offset === -1) {
      throw new Error(`Invalid column letter: ${char}`);
    }
    value = value * base + (offset + 1);
  }
  return value - 1;
}

function buildColumnLabels(size) {
  return Array.from({ length: size }, (_, index) => indexToLetters(index));
}

function toGtpCoord(x, y, size) {
  if (!Number.isInteger(size) || size <= 0) {
    throw new Error(`Invalid board size: ${size}`);
  }
  if (!Number.isInteger(x) || !Number.isInteger(y)) {
    throw new Error(`Invalid coordinate: (${x}, ${y})`);
  }
  const column = indexToLetters(x);
  const row = size - y;
  return `${column}${row}`;
}

function fromGtpCoord(vertex, size) {
  if (typeof vertex !== 'string' || vertex.trim() === '') {
    throw new Error('Vertex is required.');
  }
  const trimmed = vertex.trim().toUpperCase();
  if (trimmed === 'PASS') {
    return null;
  }
  const match = trimmed.match(/^([A-Z]+)(\d+)$/);
  if (!match) {
    throw new Error(`Invalid vertex: ${vertex}`);
  }
  const [, columnLetters, rowDigits] = match;
  const x = lettersToIndex(columnLetters);
  const row = Number.parseInt(rowDigits, 10);
  if (!Number.isInteger(row) || row < 1 || row > size) {
    throw new Error(`Row out of range for vertex: ${vertex}`);
  }
  const y = size - row;
  if (x < 0 || x >= size) {
    throw new Error(`Column out of range for vertex: ${vertex}`);
  }
  return { x, y };
}

class Goban {
  constructor(size = 9) {
    this.maxSize = 25;
    this.setSize(size);
  }

  setSize(size) {
    if (!Number.isInteger(size) || size < 2 || size > this.maxSize) {
      throw new Error(`Unsupported board size: ${size}`);
    }
    this.size = size;
    this.clear();
  }

  clear() {
    this.board = Array.from({ length: this.size }, () => Array(this.size).fill(EMPTY));
    this.captures = { [BLACK]: 0, [WHITE]: 0 };
    this.prevHash = null;
    this.lastHash = this._serialize();
  }

  get(x, y) {
    if (!this.isOnBoard(x, y)) {
      return null;
    }
    return this.board[y][x];
  }

  isOnBoard(x, y) {
    return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && x < this.size && y >= 0 && y < this.size;
  }

  getNeighborCoords(x, y) {
    const neighbors = [];
    if (this.isOnBoard(x - 1, y)) {
      neighbors.push([x - 1, y]);
    }
    if (this.isOnBoard(x + 1, y)) {
      neighbors.push([x + 1, y]);
    }
    if (this.isOnBoard(x, y - 1)) {
      neighbors.push([x, y - 1]);
    }
    if (this.isOnBoard(x, y + 1)) {
      neighbors.push([x, y + 1]);
    }
    return neighbors;
  }

  _collectGroup(x, y) {
    const color = this.get(x, y);
    if (color !== BLACK && color !== WHITE) {
      return null;
    }
    const stack = [[x, y]];
    const visited = new Set();
    const stones = [];
    const liberties = new Set();
    while (stack.length) {
      const [cx, cy] = stack.pop();
      const key = `${cx},${cy}`;
      if (visited.has(key)) {
        continue;
      }
      visited.add(key);
      stones.push([cx, cy]);
      const neighbors = this.getNeighborCoords(cx, cy);
      for (let i = 0; i < neighbors.length; i += 1) {
        const [nx, ny] = neighbors[i];
        const neighborValue = this.get(nx, ny);
        if (neighborValue === color) {
          stack.push([nx, ny]);
        } else if (neighborValue === EMPTY) {
          liberties.add(`${nx},${ny}`);
        }
      }
    }
    return { stones, liberties: liberties.size };
  }

  _removeGroup(stones) {
    for (let i = 0; i < stones.length; i += 1) {
      const [x, y] = stones[i];
      this.board[y][x] = EMPTY;
    }
  }

  _serialize() {
    return this.board.map((row) => row.map((cell) => {
      if (cell === BLACK) {
        return 'b';
      }
      if (cell === WHITE) {
        return 'w';
      }
      return '.';
    }).join('')).join('|');
  }

  play(colorInput, x, y, options = {}) {
    const { simulate = false } = options;
    const color = normalizeColor(colorInput);
    if (!this.isOnBoard(x, y)) {
      throw new Error('Move is off the board.');
    }
    if (this.get(x, y) !== EMPTY) {
      throw new Error('Intersection already occupied.');
    }

    const backupBoard = this.board.map((row) => row.slice());
    const backupCaptures = { ...this.captures };
    const prevLastHash = this.lastHash;
    const prevPrevHash = this.prevHash;

    this.board[y][x] = color;
    const opponent = color === BLACK ? WHITE : BLACK;
    let capturedStones = 0;

    const neighbors = this.getNeighborCoords(x, y);
    for (let i = 0; i < neighbors.length; i += 1) {
      const [nx, ny] = neighbors[i];
      if (this.get(nx, ny) !== opponent) {
        continue;
      }
      const group = this._collectGroup(nx, ny);
      if (group && group.liberties === 0) {
        this._removeGroup(group.stones);
        capturedStones += group.stones.length;
      }
    }

    const myGroup = this._collectGroup(x, y);
    if (!myGroup) {
      this.board = backupBoard;
      this.captures = backupCaptures;
      this.lastHash = prevLastHash;
      this.prevHash = prevPrevHash;
      throw new Error('Internal error while resolving liberties.');
    }

    if (myGroup.liberties === 0) {
      this.board = backupBoard;
      this.captures = backupCaptures;
      this.lastHash = prevLastHash;
      this.prevHash = prevPrevHash;
      throw new Error('Suicide move is not allowed.');
    }

    const newHash = this._serialize();
    if (prevPrevHash && newHash === prevPrevHash) {
      this.board = backupBoard;
      this.captures = backupCaptures;
      this.lastHash = prevLastHash;
      this.prevHash = prevPrevHash;
      throw new Error('Move violates ko rule.');
    }

    if (simulate) {
      this.board = backupBoard;
      this.captures = backupCaptures;
      this.lastHash = prevLastHash;
      this.prevHash = prevPrevHash;
      return { captured: capturedStones, liberties: myGroup.liberties };
    }

    if (capturedStones > 0) {
      this.captures[color] += capturedStones;
    }
    this.prevHash = prevLastHash;
    this.lastHash = newHash;
    return { captured: capturedStones, liberties: myGroup.liberties };
  }

  isLegal(colorInput, x, y) {
    try {
      this.play(colorInput, x, y, { simulate: true });
      return true;
    } catch (error) {
      return false;
    }
  }

  listLegalMoves(colorInput) {
    const moves = [];
    for (let y = 0; y < this.size; y += 1) {
      for (let x = 0; x < this.size; x += 1) {
        if (this.get(x, y) !== EMPTY) {
          continue;
        }
        if (this.isLegal(colorInput, x, y)) {
          moves.push({ x, y });
        }
      }
    }
    return moves;
  }

  getCaptures() {
    return { ...this.captures };
  }

  exportState() {
    return {
      size: this.size,
      board: this.board.map((row) => row.slice())
    };
  }

  renderAscii() {
    const labels = buildColumnLabels(this.size);
    const header = `  ${labels.join(' ')}`;
    const lines = [header];
    const labelWidth = String(this.size).length;
    for (let y = 0; y < this.size; y += 1) {
      const rowIndex = this.size - y;
      const rowLabel = rowIndex.toString().padStart(labelWidth, ' ');
      const cells = [];
      for (let x = 0; x < this.size; x += 1) {
        const value = this.get(x, y);
        if (value === BLACK) {
          cells.push('X');
        } else if (value === WHITE) {
          cells.push('O');
        } else {
          cells.push('.');
        }
      }
      lines.push(`${rowLabel} ${cells.join(' ')}`);
    }
    lines.push(header);
    lines.push(`Captures B:${this.captures[BLACK]} W:${this.captures[WHITE]}`);
    return lines.join('\n');
  }
}

module.exports = {
  Goban,
  BLACK,
  WHITE,
  EMPTY,
  buildColumnLabels,
  fromGtpCoord,
  toGtpCoord,
  normalizeColor,
  indexToLetters,
  lettersToIndex
};
