const GRID_SIZE = 9;
const SUBGRID_SIZE = 3;

const range = (length) => Array.from({ length }, (_, i) => i);

export const createEmptyBoard = () =>
  Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(0));

const cloneBoard = (board) => board.map((row) => row.slice());

const shuffle = (array) => {
  const result = array.slice();
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

export const isValidPlacement = (board, row, col, value) => {
  if (value === 0) return true;

  for (let i = 0; i < GRID_SIZE; i += 1) {
    if (board[row][i] === value && i !== col) return false;
    if (board[i][col] === value && i !== row) return false;
  }

  const startRow = Math.floor(row / SUBGRID_SIZE) * SUBGRID_SIZE;
  const startCol = Math.floor(col / SUBGRID_SIZE) * SUBGRID_SIZE;

  for (let r = 0; r < SUBGRID_SIZE; r += 1) {
    for (let c = 0; c < SUBGRID_SIZE; c += 1) {
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

const findEmptyCell = (board) => {
  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      if (board[row][col] === 0) {
        return { row, col };
      }
    }
  }
  return null;
};

const solveBoardInPlace = (board) => {
  const emptyCell = findEmptyCell(board);
  if (!emptyCell) return true;

  const { row, col } = emptyCell;
  const candidates = shuffle(range(GRID_SIZE).map((i) => i + 1));

  for (let i = 0; i < candidates.length; i += 1) {
    const value = candidates[i];
    if (isValidPlacement(board, row, col, value)) {
      board[row][col] = value;
      if (solveBoardInPlace(board)) return true;
      board[row][col] = 0;
    }
  }

  return false;
};

export const solveSudoku = (board) => {
  const workingBoard = cloneBoard(board);
  const solved = solveBoardInPlace(workingBoard);
  return solved ? workingBoard : null;
};

export const countSolutions = (board, limit = 2) => {
  const workingBoard = cloneBoard(board);
  let solutions = 0;

  const backtrack = () => {
    if (solutions >= limit) return;
    const emptyCell = findEmptyCell(workingBoard);
    if (!emptyCell) {
      solutions += 1;
      return;
    }

    const { row, col } = emptyCell;
    for (let value = 1; value <= GRID_SIZE; value += 1) {
      if (isValidPlacement(workingBoard, row, col, value)) {
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

const generateCompleteBoard = () => {
  const board = createEmptyBoard();
  solveBoardInPlace(board);
  return board;
};

const DIFFICULTY_LEVELS = {
  easy: 38,
  medium: 32,
  hard: 28,
  expert: 24,
};

const generatePuzzleFromSolution = (solution, cluesTarget) => {
  const puzzle = cloneBoard(solution);
  const cells = shuffle(range(GRID_SIZE * GRID_SIZE));
  let remainingClues = GRID_SIZE * GRID_SIZE;

  for (let i = 0; i < cells.length; i += 1) {
    const cellIndex = cells[i];
    const row = Math.floor(cellIndex / GRID_SIZE);
    const col = cellIndex % GRID_SIZE;
    const backup = puzzle[row][col];

    if (backup === 0) continue;

    puzzle[row][col] = 0;
    const solutions = countSolutions(puzzle, 2);
    if (solutions !== 1 || remainingClues - 1 < cluesTarget) {
      puzzle[row][col] = backup;
    } else {
      remainingClues -= 1;
    }
  }

  return puzzle;
};

export const generateSudoku = (difficulty = 'easy') => {
  const normalizedDifficulty = DIFFICULTY_LEVELS[difficulty]
    ? difficulty
    : 'easy';

  const solution = generateCompleteBoard();
  const cluesTarget = DIFFICULTY_LEVELS[normalizedDifficulty];
  const puzzle = generatePuzzleFromSolution(solution, cluesTarget);

  return {
    puzzle,
    solution,
    difficulty: normalizedDifficulty,
  };
};

export const getDifficultyLevels = () => Object.keys(DIFFICULTY_LEVELS);

export const isBoardComplete = (board) => {
  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let col = 0; col < GRID_SIZE; col += 1) {
      if (board[row][col] === 0) return false;
    }
  }
  return true;
};

export { GRID_SIZE, SUBGRID_SIZE, DIFFICULTY_LEVELS };
