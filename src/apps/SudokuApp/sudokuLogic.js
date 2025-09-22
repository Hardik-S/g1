const range = (length) => Array.from({ length }, (_, i) => i);

export const createEmptyBoard = (size) =>
  Array.from({ length: size }, () => Array(size).fill(0));

const cloneBoard = (board) => board.map((row) => row.slice());

const shuffle = (array) => {
  const result = array.slice();
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

export const isValidPlacement = (
  board,
  row,
  col,
  value,
  gridSize,
  subgridSize
) => {
  if (value === 0) return true;

  for (let i = 0; i < gridSize; i += 1) {
    if (board[row][i] === value && i !== col) return false;
    if (board[i][col] === value && i !== row) return false;
  }

  const startRow = Math.floor(row / subgridSize) * subgridSize;
  const startCol = Math.floor(col / subgridSize) * subgridSize;

  for (let r = 0; r < subgridSize; r += 1) {
    for (let c = 0; c < subgridSize; c += 1) {
      const currentRow = startRow + r;
      const currentCol = startCol + c;
      if (
        board[currentRow][currentCol] === value &&
        (currentRow !== row || currentCol !== col)
      ) {
        return false;
      }
    }
  }

  return true;
};

const findEmptyCell = (board, gridSize) => {
  for (let row = 0; row < gridSize; row += 1) {
    for (let col = 0; col < gridSize; col += 1) {
      if (board[row][col] === 0) {
        return { row, col };
      }
    }
  }
  return null;
};

const solveBoardInPlace = (board, gridSize, subgridSize) => {
  const emptyCell = findEmptyCell(board, gridSize);
  if (!emptyCell) return true;

  const { row, col } = emptyCell;
  const candidates = shuffle(range(gridSize).map((i) => i + 1));

  for (let i = 0; i < candidates.length; i += 1) {
    const value = candidates[i];
    if (isValidPlacement(board, row, col, value, gridSize, subgridSize)) {
      board[row][col] = value;
      if (solveBoardInPlace(board, gridSize, subgridSize)) return true;
      board[row][col] = 0;
    }
  }

  return false;
};

export const solveSudoku = (board, gridSize = 9, subgridSize = 3) => {
  const workingBoard = cloneBoard(board);
  const solved = solveBoardInPlace(workingBoard, gridSize, subgridSize);
  return solved ? workingBoard : null;
};

export const countSolutions = (
  board,
  gridSize,
  subgridSize,
  limit = 2
) => {
  const workingBoard = cloneBoard(board);
  let solutions = 0;

  const backtrack = () => {
    if (solutions >= limit) return;
    const emptyCell = findEmptyCell(workingBoard, gridSize);
    if (!emptyCell) {
      solutions += 1;
      return;
    }

    const { row, col } = emptyCell;
    for (let value = 1; value <= gridSize; value += 1) {
      if (isValidPlacement(workingBoard, row, col, value, gridSize, subgridSize)) {
        workingBoard[row][col] = value;
        backtrack();
        workingBoard[row][col] = 0;
        if (solutions >= limit) return;
      }
    }
  };

  backtrack();
  return solutions;
};

const generateCompleteBoard = (gridSize, subgridSize) => {
  const board = createEmptyBoard(gridSize);
  solveBoardInPlace(board, gridSize, subgridSize);
  return board;
};

const generatePuzzleFromSolution = (
  solution,
  gridSize,
  subgridSize,
  cluesTarget
) => {
  const puzzle = cloneBoard(solution);
  const cells = shuffle(range(gridSize * gridSize));
  let remainingClues = gridSize * gridSize;

  for (let i = 0; i < cells.length; i += 1) {
    const cellIndex = cells[i];
    const row = Math.floor(cellIndex / gridSize);
    const col = cellIndex % gridSize;
    const backup = puzzle[row][col];

    if (backup === 0) continue;

    puzzle[row][col] = 0;
    const solutions = countSolutions(puzzle, gridSize, subgridSize, 2);
    if (solutions !== 1 || remainingClues - 1 < cluesTarget) {
      puzzle[row][col] = backup;
    } else {
      remainingClues -= 1;
    }
  }

  return puzzle;
};

const DECAF_PUZZLES = [
  {
    puzzle: [
      [1, 0, 0, 4],
      [0, 4, 0, 0],
      [0, 0, 4, 0],
      [4, 0, 0, 2],
    ],
    solution: [
      [1, 2, 3, 4],
      [3, 4, 2, 1],
      [2, 1, 4, 3],
      [4, 3, 1, 2],
    ],
  },
  {
    puzzle: [
      [2, 0, 4, 0],
      [0, 1, 0, 3],
      [1, 0, 3, 0],
      [0, 2, 0, 4],
    ],
    solution: [
      [2, 3, 4, 1],
      [4, 1, 2, 3],
      [1, 4, 3, 2],
      [3, 2, 1, 4],
    ],
  },
  {
    puzzle: [
      [0, 1, 2, 0],
      [4, 0, 0, 3],
      [0, 4, 0, 2],
      [2, 0, 4, 1],
    ],
    solution: [
      [3, 1, 2, 4],
      [4, 2, 1, 3],
      [1, 4, 3, 2],
      [2, 3, 4, 1],
    ],
  },
];

const DIFFICULTY_LEVELS = {
  decaf: {
    id: 'decaf',
    label: 'Decaf',
    gridSize: 4,
    subgridSize: 2,
    symbols: ['Circle', 'Triangle', 'Square', 'Star'],
    puzzlePool: DECAF_PUZZLES,
  },
  latte: {
    id: 'latte',
    label: 'Latte',
    gridSize: 9,
    subgridSize: 3,
    clues: 38,
  },
  cappuccino: {
    id: 'cappuccino',
    label: 'Cappuccino',
    gridSize: 9,
    subgridSize: 3,
    clues: 32,
  },
  espresso: {
    id: 'espresso',
    label: 'Espresso',
    gridSize: 9,
    subgridSize: 3,
    clues: 28,
  },
  ristretto: {
    id: 'ristretto',
    label: 'Ristretto',
    gridSize: 9,
    subgridSize: 3,
    clues: 24,
  },
};

const DEFAULT_DIFFICULTY = 'latte';

export const getDifficultyConfig = (difficulty) =>
  DIFFICULTY_LEVELS[difficulty] || DIFFICULTY_LEVELS[DEFAULT_DIFFICULTY];

export const generateSudoku = (difficulty = DEFAULT_DIFFICULTY) => {
  const config = getDifficultyConfig(difficulty);

  if (config.id === 'decaf') {
    const selection =
      config.puzzlePool[Math.floor(Math.random() * config.puzzlePool.length)];
    return {
      puzzle: cloneBoard(selection.puzzle),
      solution: cloneBoard(selection.solution),
      difficulty: config.id,
      label: config.label,
      gridSize: config.gridSize,
      subgridSize: config.subgridSize,
      symbols: config.symbols.slice(),
    };
  }

  const solution = generateCompleteBoard(config.gridSize, config.subgridSize);
  const puzzle = generatePuzzleFromSolution(
    solution,
    config.gridSize,
    config.subgridSize,
    config.clues
  );

  return {
    puzzle,
    solution,
    difficulty: config.id,
    label: config.label,
    gridSize: config.gridSize,
    subgridSize: config.subgridSize,
    symbols: null,
  };
};

export const getDifficultyLevels = () =>
  Object.values(DIFFICULTY_LEVELS).map(({ id, label }) => ({ id, label }));

export const isBoardComplete = (board) =>
  board.every((row) => row.every((value) => value !== 0));

export { DIFFICULTY_LEVELS };

