const DIRECTIONS = [
  { dr: 0, dc: 1 },
  { dr: 1, dc: 0 },
  { dr: 1, dc: 1 },
  { dr: 1, dc: -1 },
];

export const createEmptyBoard = (rows, columns) => (
  Array.from({ length: rows }, () => Array.from({ length: columns }, () => null))
);

export const getLowestEmptyRow = (board, column) => {
  for (let row = board.length - 1; row >= 0; row -= 1) {
    if (!board[row][column]) {
      return row;
    }
  }
  return -1;
};

export const dropPiece = (board, column, value) => {
  const row = getLowestEmptyRow(board, column);
  if (row === -1) {
    return { board, row };
  }
  const next = board.map((r) => r.slice());
  next[row][column] = value;
  return { board: next, row };
};

export const getAvailableColumns = (board) => {
  const columns = [];
  for (let c = 0; c < board[0].length; c += 1) {
    if (!board[0][c]) {
      columns.push(c);
    }
  }
  return columns;
};

export const isBoardFull = (board) => getAvailableColumns(board).length === 0;

export const checkWinner = (board, connect) => {
  const rows = board.length;
  const columns = board[0].length;

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < columns; c += 1) {
      const player = board[r][c];
      if (!player) continue;

      for (const { dr, dc } of DIRECTIONS) {
        const cells = [[r, c]];
        for (let step = 1; step < connect; step += 1) {
          const nr = r + dr * step;
          const nc = c + dc * step;
          if (nr < 0 || nr >= rows || nc < 0 || nc >= columns) {
            break;
          }
          if (board[nr][nc] !== player) {
            break;
          }
          cells.push([nr, nc]);
        }
        if (cells.length === connect) {
          return { winner: player, cells };
        }
      }
    }
  }

  return null;
};

const windowScore = (values, target, opponent) => {
  const targetCount = values.filter((cell) => cell === target).length;
  const opponentCount = values.filter((cell) => cell === opponent).length;

  if (targetCount > 0 && opponentCount > 0) {
    return 0;
  }
  if (targetCount === 0 && opponentCount === 0) {
    return 1;
  }
  if (targetCount > 0) {
    switch (targetCount) {
      case 1: return 3;
      case 2: return 10;
      case 3: return 40;
      case 4: return 10000;
      default: return 10000;
    }
  }
  switch (opponentCount) {
    case 1: return -4;
    case 2: return -15;
    case 3: return -60;
    case 4: return -10000;
    default: return -10000;
  }
};

const evaluateBoard = (board, target, opponent, connect) => {
  let score = 0;
  const rows = board.length;
  const columns = board[0].length;

  // Center preference
  const centerColumn = Math.floor(columns / 2);
  for (let r = 0; r < rows; r += 1) {
    if (board[r][centerColumn] === target) {
      score += 5;
    } else if (board[r][centerColumn] === opponent) {
      score -= 5;
    }
  }

  const windows = [];

  // Horizontal windows
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c <= columns - connect; c += 1) {
      const window = [];
      for (let offset = 0; offset < connect; offset += 1) {
        window.push(board[r][c + offset]);
      }
      windows.push(window);
    }
  }

  // Vertical windows
  for (let c = 0; c < columns; c += 1) {
    for (let r = 0; r <= rows - connect; r += 1) {
      const window = [];
      for (let offset = 0; offset < connect; offset += 1) {
        window.push(board[r + offset][c]);
      }
      windows.push(window);
    }
  }

  // Diagonal down-right
  for (let r = 0; r <= rows - connect; r += 1) {
    for (let c = 0; c <= columns - connect; c += 1) {
      const window = [];
      for (let offset = 0; offset < connect; offset += 1) {
        window.push(board[r + offset][c + offset]);
      }
      windows.push(window);
    }
  }

  // Diagonal up-right
  for (let r = connect - 1; r < rows; r += 1) {
    for (let c = 0; c <= columns - connect; c += 1) {
      const window = [];
      for (let offset = 0; offset < connect; offset += 1) {
        window.push(board[r - offset][c + offset]);
      }
      windows.push(window);
    }
  }

  windows.forEach((window) => {
    score += windowScore(window, target, opponent);
  });

  return score;
};

const serializeBoard = (board) => board.map((row) => row.map((cell) => cell || '-').join('')).join('|');

const getColumnOrder = (columns) => {
  const order = [];
  const center = Math.floor(columns / 2);
  order.push(center);
  for (let offset = 1; offset <= center; offset += 1) {
    if (center - offset >= 0) {
      order.push(center - offset);
    }
    if (center + offset < columns) {
      order.push(center + offset);
    }
  }
  return order;
};

const negamax = (board, depth, alpha, beta, current, opponent, connect, memo) => {
  const key = `${serializeBoard(board)}|${current}|${depth}`;
  if (memo.has(key)) {
    return memo.get(key);
  }

  const victory = checkWinner(board, connect);
  if (victory) {
    const score = victory.winner === current ? 100000 - (100 - depth) : -100000 + (100 - depth);
    const result = { score, column: null };
    memo.set(key, result);
    return result;
  }

  if (isBoardFull(board)) {
    const result = { score: 0, column: null };
    memo.set(key, result);
    return result;
  }

  if (depth === 0) {
    const result = { score: evaluateBoard(board, current, opponent, connect), column: null };
    memo.set(key, result);
    return result;
  }

  let bestScore = -Infinity;
  let bestColumn = null;
  const order = getColumnOrder(board[0].length);

  for (const column of order) {
    if (board[0][column]) {
      continue;
    }
    const { board: nextBoard } = dropPiece(board, column, current);
    const { score } = negamax(nextBoard, depth - 1, -beta, -alpha, opponent, current, connect, memo);
    const value = -score;
    if (value > bestScore) {
      bestScore = value;
      bestColumn = column;
    }
    alpha = Math.max(alpha, value);
    if (alpha >= beta) {
      break;
    }
  }

  const result = { score: bestScore, column: bestColumn };
  memo.set(key, result);
  return result;
};

export const chooseAIMove = ({
  board,
  aiId,
  opponentId,
  connect,
  blunderRate,
}) => {
  const validColumns = getAvailableColumns(board);
  if (validColumns.length === 0) {
    return null;
  }

  if (Math.random() < blunderRate) {
    const index = Math.floor(Math.random() * validColumns.length);
    return validColumns[index];
  }

  const maxDepth = connect === 4 ? 5 : 6;
  const memo = new Map();
  const { column } = negamax(board, maxDepth, -Infinity, Infinity, aiId, opponentId, connect, memo);
  if (column === null) {
    // Fall back to heuristic choice if search exhausts without explicit column
    let bestColumn = validColumns[0];
    let bestScore = -Infinity;
    validColumns.forEach((col) => {
      const { board: nextBoard } = dropPiece(board, col, aiId);
      const score = evaluateBoard(nextBoard, aiId, opponentId, connect);
      if (score > bestScore) {
        bestScore = score;
        bestColumn = col;
      }
    });
    return bestColumn;
  }
  return column;
};
