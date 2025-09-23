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

const pickRandom = (pool) => pool[Math.floor(Math.random() * pool.length)];

const getNodeEnv = () =>
  typeof process !== 'undefined' && process.env ? process.env.NODE_ENV : undefined;

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
      [1, 0, 3, 4],
      [0, 0, 0, 2],
      [2, 1, 0, 0],
      [0, 3, 2, 0],
    ],
    solution: [
      [1, 2, 3, 4],
      [3, 4, 1, 2],
      [2, 1, 4, 3],
      [4, 3, 2, 1],
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

// Prebuilt 9×9 puzzles allow tests to avoid invoking the expensive
// backtracking generators while still exercising the same code paths.
// The catalog mirrors the structure of the 4×4 decaf pool so we can swap
// in representative puzzles whenever NODE_ENV === 'test' or an explicit
// provider requests it.
const TEST_PUZZLE_CATALOG = {
  latte: [
    {
      puzzle: [
        [
          4,
          8,
          3,
          5,
          0,
          0,
          0,
          0,
          0
        ],
        [
          0,
          5,
          9,
          0,
          7,
          8,
          1,
          0,
          0
        ],
        [
          0,
          0,
          0,
          3,
          0,
          0,
          9,
          5,
          8
        ],
        [
          0,
          6,
          0,
          0,
          5,
          0,
          7,
          0,
          1
        ],
        [
          0,
          7,
          0,
          0,
          4,
          0,
          0,
          9,
          2
        ],
        [
          8,
          0,
          0,
          1,
          0,
          0,
          6,
          0,
          5
        ],
        [
          0,
          0,
          5,
          0,
          0,
          1,
          4,
          6,
          0
        ],
        [
          0,
          0,
          8,
          6,
          0,
          0,
          0,
          0,
          0
        ],
        [
          1,
          0,
          6,
          4,
          9,
          5,
          8,
          2,
          0
        ]
      ],
      solution: [
        [
          4,
          8,
          3,
          5,
          1,
          9,
          2,
          7,
          6
        ],
        [
          6,
          5,
          9,
          2,
          7,
          8,
          1,
          3,
          4
        ],
        [
          2,
          1,
          7,
          3,
          6,
          4,
          9,
          5,
          8
        ],
        [
          3,
          6,
          4,
          9,
          5,
          2,
          7,
          8,
          1
        ],
        [
          5,
          7,
          1,
          8,
          4,
          6,
          3,
          9,
          2
        ],
        [
          8,
          9,
          2,
          1,
          3,
          7,
          6,
          4,
          5
        ],
        [
          9,
          2,
          5,
          7,
          8,
          1,
          4,
          6,
          3
        ],
        [
          7,
          4,
          8,
          6,
          2,
          3,
          5,
          1,
          9
        ],
        [
          1,
          3,
          6,
          4,
          9,
          5,
          8,
          2,
          7
        ]
      ]
    },
    {
      puzzle: [
        [
          6,
          0,
          0,
          9,
          4,
          0,
          5,
          0,
          0
        ],
        [
          0,
          0,
          0,
          6,
          0,
          8,
          0,
          9,
          2
        ],
        [
          0,
          9,
          1,
          7,
          0,
          5,
          0,
          8,
          6
        ],
        [
          4,
          6,
          0,
          1,
          0,
          3,
          0,
          0,
          0
        ],
        [
          9,
          0,
          0,
          0,
          2,
          6,
          8,
          0,
          0
        ],
        [
          3,
          0,
          5,
          0,
          7,
          9,
          0,
          1,
          0
        ],
        [
          8,
          0,
          0,
          0,
          0,
          1,
          0,
          0,
          7
        ],
        [
          5,
          7,
          9,
          2,
          0,
          0,
          1,
          6,
          0
        ],
        [
          0,
          0,
          0,
          5,
          9,
          0,
          0,
          0,
          0
        ]
      ],
      solution: [
        [
          6,
          8,
          3,
          9,
          4,
          2,
          5,
          7,
          1
        ],
        [
          7,
          5,
          4,
          6,
          1,
          8,
          3,
          9,
          2
        ],
        [
          2,
          9,
          1,
          7,
          3,
          5,
          4,
          8,
          6
        ],
        [
          4,
          6,
          8,
          1,
          5,
          3,
          7,
          2,
          9
        ],
        [
          9,
          1,
          7,
          4,
          2,
          6,
          8,
          3,
          5
        ],
        [
          3,
          2,
          5,
          8,
          7,
          9,
          6,
          1,
          4
        ],
        [
          8,
          4,
          2,
          3,
          6,
          1,
          9,
          5,
          7
        ],
        [
          5,
          7,
          9,
          2,
          8,
          4,
          1,
          6,
          3
        ],
        [
          1,
          3,
          6,
          5,
          9,
          7,
          2,
          4,
          8
        ]
      ]
    }
  ],
  cappuccino: [
    {
      puzzle: [
        [
          0,
          5,
          0,
          0,
          0,
          0,
          4,
          0,
          0
        ],
        [
          3,
          0,
          9,
          4,
          0,
          7,
          0,
          0,
          6
        ],
        [
          7,
          0,
          0,
          0,
          0,
          0,
          3,
          0,
          0
        ],
        [
          0,
          6,
          0,
          0,
          0,
          0,
          0,
          0,
          0
        ],
        [
          0,
          0,
          2,
          0,
          8,
          3,
          0,
          1,
          0
        ],
        [
          8,
          0,
          0,
          0,
          0,
          0,
          0,
          0,
          4
        ],
        [
          0,
          4,
          6,
          7,
          2,
          0,
          0,
          3,
          0
        ],
        [
          0,
          0,
          7,
          3,
          0,
          1,
          0,
          6,
          2
        ],
        [
          0,
          3,
          0,
          0,
          5,
          9,
          1,
          4,
          7
        ]
      ],
      solution: [
        [
          6,
          5,
          1,
          9,
          3,
          2,
          4,
          7,
          8
        ],
        [
          3,
          8,
          9,
          4,
          1,
          7,
          5,
          2,
          6
        ],
        [
          7,
          2,
          4,
          8,
          6,
          5,
          3,
          9,
          1
        ],
        [
          9,
          6,
          5,
          1,
          7,
          4,
          2,
          8,
          3
        ],
        [
          4,
          7,
          2,
          5,
          8,
          3,
          6,
          1,
          9
        ],
        [
          8,
          1,
          3,
          2,
          9,
          6,
          7,
          5,
          4
        ],
        [
          1,
          4,
          6,
          7,
          2,
          8,
          9,
          3,
          5
        ],
        [
          5,
          9,
          7,
          3,
          4,
          1,
          8,
          6,
          2
        ],
        [
          2,
          3,
          8,
          6,
          5,
          9,
          1,
          4,
          7
        ]
      ]
    },
    {
      puzzle: [
        [
          9,
          0,
          0,
          8,
          0,
          0,
          0,
          0,
          0
        ],
        [
          0,
          1,
          3,
          0,
          5,
          0,
          2,
          0,
          6
        ],
        [
          8,
          5,
          2,
          0,
          1,
          0,
          9,
          3,
          0
        ],
        [
          2,
          4,
          0,
          1,
          0,
          9,
          8,
          0,
          3
        ],
        [
          3,
          6,
          0,
          0,
          0,
          0,
          0,
          0,
          0
        ],
        [
          0,
          8,
          0,
          0,
          0,
          0,
          0,
          2,
          9
        ],
        [
          0,
          0,
          4,
          3,
          7,
          6,
          0,
          0,
          0
        ],
        [
          6,
          0,
          5,
          0,
          0,
          0,
          7,
          0,
          0
        ],
        [
          0,
          0,
          8,
          0,
          0,
          0,
          0,
          0,
          0
        ]
      ],
      solution: [
        [
          9,
          7,
          6,
          8,
          3,
          2,
          1,
          4,
          5
        ],
        [
          4,
          1,
          3,
          9,
          5,
          7,
          2,
          8,
          6
        ],
        [
          8,
          5,
          2,
          6,
          1,
          4,
          9,
          3,
          7
        ],
        [
          2,
          4,
          7,
          1,
          6,
          9,
          8,
          5,
          3
        ],
        [
          3,
          6,
          9,
          2,
          8,
          5,
          4,
          7,
          1
        ],
        [
          5,
          8,
          1,
          7,
          4,
          3,
          6,
          2,
          9
        ],
        [
          1,
          2,
          4,
          3,
          7,
          6,
          5,
          9,
          8
        ],
        [
          6,
          3,
          5,
          4,
          9,
          8,
          7,
          1,
          2
        ],
        [
          7,
          9,
          8,
          5,
          2,
          1,
          3,
          6,
          4
        ]
      ]
    }
  ],
  espresso: [
    {
      puzzle: [
        [
          3,
          0,
          0,
          0,
          0,
          9,
          0,
          2,
          1
        ],
        [
          0,
          0,
          0,
          0,
          7,
          3,
          0,
          0,
          0
        ],
        [
          6,
          0,
          1,
          0,
          0,
          0,
          0,
          0,
          0
        ],
        [
          0,
          0,
          0,
          0,
          0,
          1,
          0,
          0,
          2
        ],
        [
          4,
          1,
          2,
          0,
          0,
          0,
          0,
          8,
          0
        ],
        [
          0,
          0,
          6,
          3,
          9,
          2,
          0,
          0,
          0
        ],
        [
          2,
          0,
          0,
          9,
          5,
          0,
          8,
          0,
          0
        ],
        [
          0,
          0,
          5,
          0,
          3,
          0,
          2,
          6,
          0
        ],
        [
          0,
          4,
          3,
          0,
          0,
          0,
          0,
          0,
          0
        ]
      ],
      solution: [
        [
          3,
          5,
          4,
          6,
          8,
          9,
          7,
          2,
          1
        ],
        [
          9,
          2,
          8,
          1,
          7,
          3,
          4,
          5,
          6
        ],
        [
          6,
          7,
          1,
          4,
          2,
          5,
          9,
          3,
          8
        ],
        [
          5,
          3,
          9,
          8,
          4,
          1,
          6,
          7,
          2
        ],
        [
          4,
          1,
          2,
          5,
          6,
          7,
          3,
          8,
          9
        ],
        [
          7,
          8,
          6,
          3,
          9,
          2,
          1,
          4,
          5
        ],
        [
          2,
          6,
          7,
          9,
          5,
          4,
          8,
          1,
          3
        ],
        [
          1,
          9,
          5,
          7,
          3,
          8,
          2,
          6,
          4
        ],
        [
          8,
          4,
          3,
          2,
          1,
          6,
          5,
          9,
          7
        ]
      ]
    },
    {
      puzzle: [
        [
          0,
          0,
          0,
          4,
          0,
          0,
          6,
          3,
          7
        ],
        [
          0,
          0,
          2,
          0,
          0,
          3,
          0,
          1,
          8
        ],
        [
          0,
          1,
          0,
          0,
          0,
          0,
          0,
          4,
          5
        ],
        [
          6,
          0,
          0,
          0,
          0,
          7,
          8,
          9,
          0
        ],
        [
          0,
          0,
          7,
          0,
          0,
          0,
          0,
          0,
          6
        ],
        [
          9,
          0,
          0,
          3,
          6,
          0,
          0,
          0,
          0
        ],
        [
          0,
          0,
          0,
          0,
          9,
          0,
          1,
          0,
          0
        ],
        [
          3,
          0,
          9,
          6,
          0,
          0,
          0,
          0,
          0
        ],
        [
          2,
          0,
          0,
          5,
          0,
          0,
          0,
          6,
          0
        ]
      ],
      solution: [
        [
          5,
          9,
          8,
          4,
          1,
          2,
          6,
          3,
          7
        ],
        [
          4,
          6,
          2,
          7,
          5,
          3,
          9,
          1,
          8
        ],
        [
          7,
          1,
          3,
          9,
          8,
          6,
          2,
          4,
          5
        ],
        [
          6,
          3,
          5,
          1,
          2,
          7,
          8,
          9,
          4
        ],
        [
          1,
          2,
          7,
          8,
          4,
          9,
          3,
          5,
          6
        ],
        [
          9,
          8,
          4,
          3,
          6,
          5,
          7,
          2,
          1
        ],
        [
          8,
          5,
          6,
          2,
          9,
          4,
          1,
          7,
          3
        ],
        [
          3,
          4,
          9,
          6,
          7,
          1,
          5,
          8,
          2
        ],
        [
          2,
          7,
          1,
          5,
          3,
          8,
          4,
          6,
          9
        ]
      ]
    }
  ],
  ristretto: [
    {
      puzzle: [
        [
          0,
          0,
          0,
          0,
          5,
          3,
          0,
          6,
          0
        ],
        [
          0,
          2,
          1,
          0,
          0,
          0,
          0,
          3,
          0
        ],
        [
          0,
          9,
          0,
          8,
          0,
          0,
          0,
          0,
          0
        ],
        [
          9,
          0,
          0,
          0,
          0,
          0,
          4,
          0,
          0
        ],
        [
          0,
          0,
          0,
          0,
          8,
          9,
          0,
          0,
          5
        ],
        [
          3,
          0,
          0,
          6,
          0,
          4,
          0,
          0,
          0
        ],
        [
          0,
          5,
          0,
          1,
          0,
          0,
          3,
          0,
          9
        ],
        [
          0,
          0,
          9,
          0,
          0,
          0,
          0,
          0,
          0
        ],
        [
          4,
          8,
          0,
          0,
          0,
          0,
          2,
          0,
          0
        ]
      ],
      solution: [
        [
          8,
          4,
          7,
          2,
          5,
          3,
          9,
          6,
          1
        ],
        [
          5,
          2,
          1,
          7,
          9,
          6,
          8,
          3,
          4
        ],
        [
          6,
          9,
          3,
          8,
          4,
          1,
          7,
          5,
          2
        ],
        [
          9,
          6,
          8,
          5,
          1,
          7,
          4,
          2,
          3
        ],
        [
          2,
          1,
          4,
          3,
          8,
          9,
          6,
          7,
          5
        ],
        [
          3,
          7,
          5,
          6,
          2,
          4,
          1,
          9,
          8
        ],
        [
          7,
          5,
          2,
          1,
          6,
          8,
          3,
          4,
          9
        ],
        [
          1,
          3,
          9,
          4,
          7,
          2,
          5,
          8,
          6
        ],
        [
          4,
          8,
          6,
          9,
          3,
          5,
          2,
          1,
          7
        ]
      ]
    },
    {
      puzzle: [
        [
          0,
          0,
          0,
          1,
          5,
          0,
          0,
          0,
          0
        ],
        [
          4,
          0,
          8,
          0,
          3,
          0,
          0,
          5,
          0
        ],
        [
          0,
          0,
          0,
          0,
          0,
          9,
          0,
          0,
          0
        ],
        [
          0,
          6,
          0,
          0,
          0,
          2,
          0,
          0,
          4
        ],
        [
          8,
          0,
          0,
          0,
          0,
          7,
          0,
          2,
          0
        ],
        [
          0,
          2,
          0,
          0,
          9,
          0,
          0,
          0,
          7
        ],
        [
          1,
          3,
          0,
          9,
          6,
          0,
          0,
          0,
          0
        ],
        [
          0,
          0,
          6,
          0,
          7,
          0,
          0,
          0,
          0
        ],
        [
          2,
          0,
          0,
          0,
          0,
          0,
          5,
          1,
          0
        ]
      ],
      solution: [
        [
          9,
          7,
          2,
          1,
          5,
          8,
          6,
          4,
          3
        ],
        [
          4,
          1,
          8,
          7,
          3,
          6,
          9,
          5,
          2
        ],
        [
          6,
          5,
          3,
          4,
          2,
          9,
          7,
          8,
          1
        ],
        [
          7,
          6,
          5,
          3,
          8,
          2,
          1,
          9,
          4
        ],
        [
          8,
          4,
          9,
          6,
          1,
          7,
          3,
          2,
          5
        ],
        [
          3,
          2,
          1,
          5,
          9,
          4,
          8,
          6,
          7
        ],
        [
          1,
          3,
          4,
          9,
          6,
          5,
          2,
          7,
          8
        ],
        [
          5,
          8,
          6,
          2,
          7,
          1,
          4,
          3,
          9
        ],
        [
          2,
          9,
          7,
          8,
          4,
          3,
          5,
          1,
          6
        ]
      ]
    }
  ]
};

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

export const generateSudoku = (difficulty = DEFAULT_DIFFICULTY, options = {}) => {
  const config = getDifficultyConfig(difficulty);
  const { puzzleProvider, useTestCatalog } = options;

  if (config.id === 'decaf') {
    const selection = pickRandom(config.puzzlePool);
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

  const buildResponse = (selection) => ({
    puzzle: cloneBoard(selection.puzzle),
    solution: cloneBoard(selection.solution),
    difficulty: config.id,
    label: config.label,
    gridSize: config.gridSize,
    subgridSize: config.subgridSize,
    symbols: null,
  });

  let cachedSelection = null;

  if (typeof puzzleProvider === 'function') {
    const provided = puzzleProvider(config);
    if (provided?.puzzle && provided?.solution) {
      cachedSelection = provided;
    }
  }

  if (!cachedSelection) {
    const pool = TEST_PUZZLE_CATALOG[config.id];
    const shouldUseCatalog =
      pool && (useTestCatalog ?? getNodeEnv() === 'test');
    if (shouldUseCatalog) {
      cachedSelection = pickRandom(pool);
    }
  }

  if (cachedSelection) {
    return buildResponse(cachedSelection);
  }

  // Production paths fall back to generating puzzles on demand. Tests can opt
  // into the cached catalog above to avoid repeatedly running the expensive
  // generator and solver.
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

