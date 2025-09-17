import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SudokuApp from '../SudokuApp';
import { generateSudoku } from '../sudokuLogic';

const basePuzzle = [
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

const baseSolution = [
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

const cloneBoard = (board) => board.map((row) => row.slice());

jest.mock('../sudokuLogic', () => {
  const actual = jest.requireActual('../sudokuLogic');
  return {
    ...actual,
    generateSudoku: jest.fn((level = 'easy') => ({
      puzzle: cloneBoard(basePuzzle),
      solution: cloneBoard(baseSolution),
      difficulty: level,
    })),
  };
});

const originalGetContext = HTMLCanvasElement.prototype.getContext;
const originalGetBoundingClientRect = HTMLCanvasElement.prototype.getBoundingClientRect;

beforeEach(() => {
  jest.clearAllMocks();

  HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
    clearRect: jest.fn(),
    fillRect: jest.fn(),
    beginPath: jest.fn(),
    moveTo: jest.fn(),
    lineTo: jest.fn(),
    stroke: jest.fn(),
    strokeStyle: '',
    lineWidth: 1,
    fillStyle: '',
    arc: jest.fn(),
    fill: jest.fn(),
    font: '',
    textAlign: 'center',
    textBaseline: 'middle',
    fillText: jest.fn(),
  }));

  HTMLCanvasElement.prototype.getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    width: 540,
    height: 540,
  });
});

afterEach(() => {
  HTMLCanvasElement.prototype.getContext = originalGetContext;
  HTMLCanvasElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
});

describe('SudokuApp component', () => {
  it('allows entering numbers in final mode', async () => {
    render(<SudokuApp onBack={jest.fn()} />);
    const canvas = screen.getByLabelText(/Sudoku board/i);

    fireEvent.click(canvas, { clientX: 10, clientY: 10 });
    fireEvent.keyDown(window, { key: '5' });

    await waitFor(() => {
      const boardData = canvas.getAttribute('data-board');
      expect(boardData.split('|')[0][0]).toBe('5');
    });
  });

  it('supports notes via right-click and double-click toggling', async () => {
    render(<SudokuApp onBack={jest.fn()} />);
    const canvas = screen.getByLabelText(/Sudoku board/i);

    fireEvent.contextMenu(canvas, { clientX: 10, clientY: 10 });
    fireEvent.keyDown(window, { key: '3' });

    await waitFor(() => {
      const notesData = canvas.getAttribute('data-notes');
      expect(notesData.split('|')[0].split(',')[0]).toContain('3');
    });

    fireEvent.dblClick(canvas, { clientX: 10, clientY: 10 });
    fireEvent.keyDown(window, { key: '4' });

    await waitFor(() => {
      const boardData = canvas.getAttribute('data-board');
      const notesData = canvas.getAttribute('data-notes');
      expect(boardData.split('|')[0][0]).toBe('4');
      expect(notesData.split('|')[0].split(',')[0]).toBe('');
    });
  });

  it('requests new puzzles when difficulty changes', () => {
    render(<SudokuApp onBack={jest.fn()} />);
    const mediumButton = screen.getByTestId('difficulty-medium');
    fireEvent.click(mediumButton);
    expect(generateSudoku).toHaveBeenLastCalledWith('medium');
  });
});
