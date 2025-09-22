import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react';
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
    generateSudoku: jest.fn((level = 'latte') => ({
      puzzle: cloneBoard(basePuzzle),
      solution: cloneBoard(baseSolution),
      difficulty: level,
      label: level.charAt(0).toUpperCase() + level.slice(1),
      gridSize: 9,
      subgridSize: 3,
      symbols: null,
    })),
  };
});

const originalGetContext = HTMLCanvasElement.prototype.getContext;
const originalGetBoundingClientRect = HTMLCanvasElement.prototype.getBoundingClientRect;
const originalRequestFullscreen = HTMLElement.prototype.requestFullscreen;
const originalExitFullscreen = document.exitFullscreen;
const fullscreenElementDescriptor = Object.getOwnPropertyDescriptor(
  document,
  'fullscreenElement'
);

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
    strokeRect: jest.fn(),
    save: jest.fn(),
    restore: jest.fn(),
    closePath: jest.fn(),
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
  if (originalRequestFullscreen) {
    HTMLElement.prototype.requestFullscreen = originalRequestFullscreen;
  } else {
    delete HTMLElement.prototype.requestFullscreen;
  }
  if (originalExitFullscreen) {
    document.exitFullscreen = originalExitFullscreen;
  } else {
    delete document.exitFullscreen;
  }
  if (fullscreenElementDescriptor) {
    Object.defineProperty(document, 'fullscreenElement', fullscreenElementDescriptor);
  } else {
    delete document.fullscreenElement;
  }
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
    const cappuccinoButton = screen.getByTestId('difficulty-cappuccino');
    fireEvent.click(cappuccinoButton);
    expect(generateSudoku).toHaveBeenLastCalledWith('cappuccino');
  });

  it('reveals the full solution when the Solution button is clicked', async () => {
    render(<SudokuApp onBack={jest.fn()} />);
    const canvas = screen.getByLabelText(/Sudoku board/i);

    const solutionButton = screen.getByRole('button', { name: /solution/i });
    fireEvent.click(solutionButton);

    await waitFor(() => {
      const boardData = canvas.getAttribute('data-board');
      expect(boardData.split('|')[0]).toBe('435269781');
    });
  });

  it('fills the next empty cells with the correct solution values', async () => {
    render(<SudokuApp onBack={jest.fn()} />);
    const canvas = screen.getByLabelText(/Sudoku board/i);

    const fillNextButton = screen.getByRole('button', { name: /fill next$/i });
    fireEvent.click(fillNextButton);

    await waitFor(() => {
      const firstRow = canvas.getAttribute('data-board').split('|')[0];
      expect(firstRow[0]).toBe('4');
    });

    const fillNextThreeButton = screen.getByRole('button', { name: /fill next 3/i });
    fireEvent.click(fillNextThreeButton);

    await waitFor(() => {
      const firstRow = canvas.getAttribute('data-board').split('|')[0];
      expect(firstRow).toBe('435269701');
    });
  });

  it('enters and exits zen mode with the toggle and Escape key', () => {
    render(<SudokuApp onBack={jest.fn()} />);
    const zenButton = screen.getByRole('button', { name: /^zen$/i });
    const controls = screen.getByTestId('control-column');

    fireEvent.click(zenButton);
    expect(zenButton).toHaveAttribute('aria-pressed', 'true');
    expect(controls).toHaveClass('zen-hidden');

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(zenButton).toHaveAttribute('aria-pressed', 'false');
    expect(controls).not.toHaveClass('zen-hidden');
  });

  it('responds to full screen activation events', async () => {
    const requestFullscreen = jest.fn(() => Promise.resolve());
    HTMLElement.prototype.requestFullscreen = requestFullscreen;
    document.exitFullscreen = jest.fn(() => Promise.resolve());

    render(<SudokuApp onBack={jest.fn()} />);
    const fullScreenButton = screen.getByRole('button', { name: /full screen/i });

    fireEvent.click(fullScreenButton);
    expect(requestFullscreen).toHaveBeenCalled();

    act(() => {
      Object.defineProperty(document, 'fullscreenElement', {
        configurable: true,
        value: document.body,
      });
      document.dispatchEvent(new Event('fullscreenchange'));
    });

    await waitFor(() => {
      expect(fullScreenButton).toHaveAttribute('aria-pressed', 'true');
      expect(fullScreenButton).toHaveTextContent(/exit full screen/i);
    });

    fireEvent.click(fullScreenButton);
    expect(document.exitFullscreen).toHaveBeenCalled();

    act(() => {
      Object.defineProperty(document, 'fullscreenElement', {
        configurable: true,
        value: null,
      });
      document.dispatchEvent(new Event('fullscreenchange'));
    });

    await waitFor(() => {
      expect(fullScreenButton).toHaveAttribute('aria-pressed', 'false');
    });
  });

  it('shows confetti when the puzzle is completed', async () => {
    render(<SudokuApp onBack={jest.fn()} />);

    const solutionButton = screen.getByRole('button', { name: /solution/i });
    fireEvent.click(solutionButton);

    await waitFor(() => {
      expect(document.querySelector('.confetti-container')).toBeInTheDocument();
    });
  });
});
