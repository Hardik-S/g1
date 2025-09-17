import {
  DIFFICULTY_LEVELS,
  generateSudoku,
  isValidPlacement,
  solveSudoku,
} from '../sudokuLogic';

describe('sudoku logic utilities', () => {
  it('solveSudoku solves a known puzzle correctly', () => {
    const puzzle = [
      [0, 0, 0, 2, 6, 0, 7, 0, 1],
      [6, 8, 0, 0, 7, 0, 0, 9, 0],
      [1, 9, 0, 0, 0, 4, 5, 0, 0],
      [8, 2, 0, 1, 0, 0, 0, 4, 0],
      [0, 0, 4, 6, 0, 2, 9, 0, 0],
      [0, 5, 0, 0, 0, 3, 0, 2, 8],
      [0, 0, 9, 3, 0, 0, 0, 7, 4],
      [0, 4, 0, 0, 5, 0, 0, 3, 6],
      [7, 0, 3, 0, 1, 8, 0, 0, 0],
    ];

    const solved = solveSudoku(puzzle);
    expect(solved).not.toBeNull();

    const expected = [
      [4, 3, 5, 2, 6, 9, 7, 8, 1],
      [6, 8, 2, 5, 7, 1, 4, 9, 3],
      [1, 9, 7, 8, 3, 4, 5, 6, 2],
      [8, 2, 6, 1, 9, 5, 3, 4, 7],
      [3, 7, 4, 6, 8, 2, 9, 1, 5],
      [9, 5, 1, 7, 4, 3, 6, 2, 8],
      [5, 1, 9, 3, 2, 6, 8, 7, 4],
      [2, 4, 8, 9, 5, 7, 1, 3, 6],
      [7, 6, 3, 4, 1, 8, 2, 5, 9],
    ];

    expect(solved).toEqual(expected);
  });

  it('generateSudoku returns valid puzzle and solution across difficulties', () => {
    Object.keys(DIFFICULTY_LEVELS).forEach((level) => {
      const { puzzle, solution, difficulty } = generateSudoku(level);
      expect(difficulty).toBe(level);
      expect(solution).toHaveLength(9);
      expect(puzzle).toHaveLength(9);

      puzzle.forEach((row, rowIndex) => {
        expect(row).toHaveLength(9);
        row.forEach((value, colIndex) => {
          expect(value).toBeGreaterThanOrEqual(0);
          expect(value).toBeLessThanOrEqual(9);
          if (value !== 0) {
            expect(isValidPlacement(puzzle, rowIndex, colIndex, value)).toBe(true);
          }
        });
      });

      const solved = solveSudoku(puzzle);
      expect(solved).not.toBeNull();
      expect(solved).toEqual(solution);
    });
  });

  it('difficulty levels control the number of given clues', () => {
    Object.entries(DIFFICULTY_LEVELS).forEach(([level, clues]) => {
      const { puzzle } = generateSudoku(level);
      const filled = puzzle.reduce(
        (total, row) => total + row.filter((value) => value !== 0).length,
        0
      );
      expect(filled).toBeGreaterThanOrEqual(clues - 2); // allow slight variance due to uniqueness enforcement
      expect(filled).toBeLessThanOrEqual(81);
    });
  });
});
