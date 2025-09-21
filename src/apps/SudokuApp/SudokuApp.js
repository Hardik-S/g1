import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './SudokuApp.css';
import {
  DIFFICULTY_LEVELS,
  GRID_SIZE,
  generateSudoku,
  getDifficultyLevels,
  isBoardComplete,
  solveSudoku,
} from './sudokuLogic';

const CANVAS_SIZE = 540;
const CELL_SIZE = CANVAS_SIZE / GRID_SIZE;

const cloneBoard = (board) => board.map((row) => row.slice());

const createEmptyNotes = () =>
  Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => new Set())
  );

const toBoardSignature = (board) => board.map((row) => row.join('')).join('|');

const toNotesSignature = (notes) =>
  notes
    .map((row) =>
      row
        .map((set) =>
          set.size ? Array.from(set).sort((a, b) => a - b).join('') : ''
        )
        .join(',')
    )
    .join('|');

const SudokuApp = ({ onBack }) => {
  const initialGameRef = useRef(null);
  if (!initialGameRef.current) {
    initialGameRef.current = generateSudoku('easy');
  }

  const [difficulty, setDifficulty] = useState(
    initialGameRef.current.difficulty || 'easy'
  );
  const [gameData, setGameData] = useState(initialGameRef.current);
  const [board, setBoard] = useState(() =>
    cloneBoard(initialGameRef.current.puzzle)
  );
  const [notes, setNotes] = useState(() => createEmptyNotes());
  const [selectedCell, setSelectedCell] = useState({ row: 0, col: 0 });
  const [noteMode, setNoteMode] = useState(false);
  const [isBoardAnimating, setIsBoardAnimating] = useState(false);
  const [lastAction, setLastAction] = useState('Breathe in the aroma and begin.');
  const canvasRef = useRef(null);
  const animationTimeoutRef = useRef(null);

  const lockedCells = useMemo(
    () => gameData.puzzle.map((row) => row.map((value) => value !== 0)),
    [gameData]
  );

  useEffect(() => {
    setBoard(cloneBoard(gameData.puzzle));
    setNotes(createEmptyNotes());
    setSelectedCell({ row: 0, col: 0 });
    setNoteMode(false);
    setLastAction('Freshly brewed puzzle, enjoy the calm.');
  }, [gameData]);

  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);

  const boardSignature = useMemo(() => toBoardSignature(board), [board]);
  const notesSignature = useMemo(() => toNotesSignature(notes), [notes]);

  const boardMatchesSolution = useMemo(() => {
    const { solution } = gameData;
    if (!solution) return false;
    for (let row = 0; row < GRID_SIZE; row += 1) {
      for (let col = 0; col < GRID_SIZE; col += 1) {
        if (board[row][col] !== solution[row][col]) {
          return false;
        }
      }
    }
    return true;
  }, [board, gameData]);

  const filledCount = useMemo(
    () => board.reduce((acc, row) => acc + row.filter((value) => value !== 0).length, 0),
    [board]
  );

  const ambianceMessage = useMemo(() => {
    if (boardMatchesSolution && isBoardComplete(board)) {
      return 'Complete! Treat yourself to a refill.';
    }
    if (noteMode) {
      return 'Note mode: gentle pencil marks for possibilities.';
    }
    return 'Final mode: place numbers with a steady hand.';
  }, [board, boardMatchesSolution, noteMode]);

  const triggerBoardAnimation = useCallback(() => {
    setIsBoardAnimating(true);
    if (animationTimeoutRef.current) {
      clearTimeout(animationTimeoutRef.current);
    }
    animationTimeoutRef.current = setTimeout(() => {
      setIsBoardAnimating(false);
    }, 600);
  }, []);

  const startNewPuzzle = useCallback(
    (level) => {
      const targetLevel = DIFFICULTY_LEVELS[level] ? level : difficulty;
      const nextGame = generateSudoku(targetLevel);
      setDifficulty(targetLevel);
      setGameData(nextGame);
      triggerBoardAnimation();
    },
    [difficulty, triggerBoardAnimation]
  );

  const handleDifficultyChange = (level) => {
    startNewPuzzle(level);
  };

  const handleRestart = () => {
    startNewPuzzle(difficulty);
    setLastAction('Restarted the brew — new possibilities await.');
  };

  const handleRevealSolution = useCallback(() => {
    if (boardMatchesSolution) {
      setLastAction('Already perfected — savor the calm.');
      setNoteMode(false);
      return;
    }

    let solvedBoard = null;

    if (gameData.solution) {
      solvedBoard = cloneBoard(gameData.solution);
    } else if (gameData.puzzle) {
      const computedFromPuzzle = solveSudoku(gameData.puzzle);
      if (computedFromPuzzle) {
        solvedBoard = computedFromPuzzle;
      }
    }

    if (!solvedBoard) {
      const computedFromBoard = solveSudoku(board);
      if (computedFromBoard) {
        solvedBoard = computedFromBoard;
      }
    }

    if (!solvedBoard) {
      setLastAction('This blend resisted a solution — try a fresh brew.');
      return;
    }

    setBoard(cloneBoard(solvedBoard));
    setNotes(createEmptyNotes());
    setNoteMode(false);
    setLastAction('Solution revealed — savor the mastery.');
    triggerBoardAnimation();
  }, [board, boardMatchesSolution, gameData, triggerBoardAnimation]);

  const handleCanvasSelection = (event) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = CANVAS_SIZE / rect.width;
    const scaleY = CANVAS_SIZE / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;
    const row = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor(y / CELL_SIZE)));
    const col = Math.max(0, Math.min(GRID_SIZE - 1, Math.floor(x / CELL_SIZE)));
    setSelectedCell({ row, col });
  };

  const handleCanvasClick = (event) => {
    handleCanvasSelection(event);
    setLastAction('Cell selected — sip slowly and decide.');
  };

  const handleCanvasDoubleClick = (event) => {
    handleCanvasSelection(event);
    setNoteMode((prev) => !prev);
    setLastAction('Mode toggled — pencil or pen, your choice.');
  };

  const handleCanvasContextMenu = (event) => {
    event.preventDefault();
    handleCanvasSelection(event);
    setNoteMode(true);
    setLastAction('Note mode engaged — jot gentle hints.');
  };

  const updateBoardValue = (row, col, value) => {
    setBoard((prev) => {
      const next = prev.map((r) => r.slice());
      next[row][col] = value;
      return next;
    });
  };

  const clearNotesAt = (row, col) => {
    setNotes((prev) => {
      const next = prev.map((r) => r.map((set) => new Set(set)));
      next[row][col] = new Set();
      return next;
    });
  };

  const toggleNoteValue = (row, col, value) => {
    setNotes((prev) => {
      const next = prev.map((r) => r.map((set) => new Set(set)));
      const cellNotes = next[row][col];
      if (cellNotes.has(value)) {
        cellNotes.delete(value);
      } else {
        cellNotes.add(value);
      }
      return next;
    });
  };

  const moveSelection = (direction) => {
    setSelectedCell((prev) => {
      let { row, col } = prev;
      if (direction === 'up') row = (row + GRID_SIZE - 1) % GRID_SIZE;
      if (direction === 'down') row = (row + 1) % GRID_SIZE;
      if (direction === 'left') col = (col + GRID_SIZE - 1) % GRID_SIZE;
      if (direction === 'right') col = (col + 1) % GRID_SIZE;
      return { row, col };
    });
  };

  const handleKeyDown = useCallback(
    (event) => {
      if (!selectedCell) return;
      const { row, col } = selectedCell;
      const locked = lockedCells[row][col];

      if (event.key === 'ArrowUp' || event.key === 'w') {
        event.preventDefault();
        moveSelection('up');
        return;
      }
      if (event.key === 'ArrowDown' || event.key === 's') {
        event.preventDefault();
        moveSelection('down');
        return;
      }
      if (event.key === 'ArrowLeft' || event.key === 'a') {
        event.preventDefault();
        moveSelection('left');
        return;
      }
      if (event.key === 'ArrowRight' || event.key === 'd') {
        event.preventDefault();
        moveSelection('right');
        return;
      }

      if (locked) return;

      if (/^[1-9]$/.test(event.key)) {
        const value = parseInt(event.key, 10);
        if (noteMode) {
          toggleNoteValue(row, col, value);
          setLastAction(`Noted ${value} — soft pencil whispers.`);
        } else {
          updateBoardValue(row, col, value);
          clearNotesAt(row, col);
          setLastAction(`Placed ${value} with confidence.`);
        }
      } else if (event.key === 'Backspace' || event.key === 'Delete') {
        if (noteMode) {
          clearNotesAt(row, col);
          setLastAction('Notes cleared — fresh parchment.');
        } else {
          updateBoardValue(row, col, 0);
          clearNotesAt(row, col);
          setLastAction('Cell cleared — savor the pause.');
        }
      }
    },
    [
      clearNotesAt,
      lockedCells,
      moveSelection,
      noteMode,
      selectedCell,
      toggleNoteValue,
      updateBoardValue,
    ]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Background
    ctx.fillStyle = 'rgba(251, 244, 235, 0.96)';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    // Subtle paper fiber texture
    ctx.fillStyle = 'rgba(205, 180, 155, 0.08)';
    for (let i = 0; i < 180; i += 1) {
      const x = Math.random() * CANVAS_SIZE;
      const y = Math.random() * CANVAS_SIZE;
      const radius = Math.random() * 1.2;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    if (selectedCell) {
      const { row, col } = selectedCell;
      // Highlight subgrid
      const subgridRow = Math.floor(row / 3) * 3;
      const subgridCol = Math.floor(col / 3) * 3;
      ctx.fillStyle = 'rgba(210, 180, 140, 0.18)';
      ctx.fillRect(
        subgridCol * CELL_SIZE,
        subgridRow * CELL_SIZE,
        CELL_SIZE * 3,
        CELL_SIZE * 3
      );

      // Highlight row and column
      ctx.fillStyle = 'rgba(201, 168, 132, 0.18)';
      ctx.fillRect(0, row * CELL_SIZE, CANVAS_SIZE, CELL_SIZE);
      ctx.fillRect(col * CELL_SIZE, 0, CELL_SIZE, CANVAS_SIZE);

      // Selected cell highlight
      ctx.fillStyle = noteMode
        ? 'rgba(226, 202, 171, 0.6)'
        : 'rgba(202, 174, 139, 0.6)';
      ctx.fillRect(col * CELL_SIZE, row * CELL_SIZE, CELL_SIZE, CELL_SIZE);
    }

    // Grid lines
    for (let i = 0; i <= GRID_SIZE; i += 1) {
      ctx.beginPath();
      ctx.moveTo(0, i * CELL_SIZE);
      ctx.lineTo(CANVAS_SIZE, i * CELL_SIZE);
      ctx.strokeStyle = i % 3 === 0 ? 'rgba(111, 78, 55, 0.55)' : 'rgba(111, 78, 55, 0.25)';
      ctx.lineWidth = i % 3 === 0 ? 2 : 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(i * CELL_SIZE, 0);
      ctx.lineTo(i * CELL_SIZE, CANVAS_SIZE);
      ctx.strokeStyle = i % 3 === 0 ? 'rgba(111, 78, 55, 0.55)' : 'rgba(111, 78, 55, 0.25)';
      ctx.lineWidth = i % 3 === 0 ? 2 : 1;
      ctx.stroke();
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let row = 0; row < GRID_SIZE; row += 1) {
      for (let col = 0; col < GRID_SIZE; col += 1) {
        const centerX = col * CELL_SIZE + CELL_SIZE / 2;
        const centerY = row * CELL_SIZE + CELL_SIZE / 2;
        const puzzleValue = gameData.puzzle[row][col];
        const value = board[row][col];

        if (puzzleValue !== 0) {
          ctx.fillStyle = 'rgba(101, 77, 57, 0.95)';
          ctx.font = `600 ${CELL_SIZE * 0.55}px 'Work Sans', 'Segoe UI', sans-serif`;
          ctx.fillText(puzzleValue, centerX, centerY + 2);
        } else if (value !== 0) {
          const isCorrect = gameData.solution[row][col] === value;
          ctx.fillStyle = isCorrect
            ? 'rgba(93, 66, 46, 0.92)'
            : 'rgba(164, 82, 62, 0.85)';
          ctx.font = `500 ${CELL_SIZE * 0.55}px 'Work Sans', 'Segoe UI', sans-serif`;
          ctx.fillText(value, centerX, centerY + 2);
        } else {
          const cellNotes = notes[row][col];
          if (cellNotes && cellNotes.size) {
            ctx.fillStyle = 'rgba(111, 78, 55, 0.55)';
            ctx.font = `400 ${CELL_SIZE / 3.2}px 'Work Sans', 'Segoe UI', sans-serif`;
            const sortedNotes = Array.from(cellNotes).sort((a, b) => a - b);
            sortedNotes.forEach((note) => {
              const index = note - 1;
              const noteRow = Math.floor(index / 3);
              const noteCol = index % 3;
              const noteX = col * CELL_SIZE + (noteCol + 0.5) * (CELL_SIZE / 3);
              const noteY = row * CELL_SIZE + (noteRow + 0.5) * (CELL_SIZE / 3);
              ctx.fillText(note, noteX, noteY);
            });
          }
        }
      }
    }
  }, [board, gameData, noteMode, notes, selectedCell]);

  return (
    <div className="sudoku-coffee-shell font-sudoku text-coffee-ink">
      <div className="sudoku-coffee-content flex flex-col min-h-full items-center justify-center py-10 px-4">
        <div className="sudoku-panel bg-white/40 w-full max-w-5xl p-6 md:p-10 flex flex-col lg:flex-row gap-8 transition-all duration-700">
          <div className="flex-1 flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-[0.35em] text-coffee-hazelnut/90">
                Cozy Canvas Series
              </span>
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight">Sudoku Roast</h2>
              <p className="text-sm text-coffee-hazelnut/80 max-w-md">
                Gentle numbers steeped in warm hues. Type to place digits, right-click for
                notes, and double-click to toggle between mindful note-taking and final
                answers.
              </p>
            </div>

            <div className="flex flex-wrap gap-2" role="group" aria-label="Select difficulty">
              {getDifficultyLevels().map((level) => (
                <button
                  key={level}
                  type="button"
                  className={`coffee-chip px-4 py-2 rounded-full text-xs uppercase tracking-[0.25em] transition-all duration-300 hover:translate-y-[-1px] hover:shadow-lg ${
                    difficulty === level ? 'coffee-chip-active' : 'text-coffee-ink/70'
                  }`}
                  onClick={() => handleDifficultyChange(level)}
                  data-testid={`difficulty-${level}`}
                >
                  {level}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm">
              <span className="status-badge px-4 py-1 rounded-full uppercase tracking-[0.2em]">
                {noteMode ? 'Note mode' : 'Final entry'}
              </span>
              <span className="status-badge px-4 py-1 rounded-full uppercase tracking-[0.2em]">
                {difficulty} blend
              </span>
              <span className="status-badge px-4 py-1 rounded-full uppercase tracking-[0.2em]">
                {filledCount} / 81 filled
              </span>
            </div>

            <p className="text-sm text-coffee-ink/80 italic">{ambianceMessage}</p>
            <p className="text-xs text-coffee-ink/60">{lastAction}</p>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleRestart}
                className="px-5 py-2 rounded-full bg-coffee-foam/80 text-coffee-ink font-medium uppercase tracking-[0.3em] text-xs shadow-md transition hover:bg-coffee-foam hover:shadow-lg"
              >
                Brew fresh puzzle
              </button>
              <button
                type="button"
                onClick={handleRevealSolution}
                className="px-5 py-2 rounded-full bg-coffee-ink/80 text-coffee-cream font-medium uppercase tracking-[0.3em] text-xs shadow-md transition hover:bg-coffee-ink hover:shadow-lg"
                data-testid="reveal-solution"
              >
                Solution
              </button>
              <button
                type="button"
                onClick={onBack}
                className="px-5 py-2 rounded-full bg-white/60 text-coffee-ink/70 font-medium uppercase tracking-[0.3em] text-xs shadow-sm transition hover:bg-white/80"
              >
                Back to counter
              </button>
            </div>
          </div>

          <div className="flex-1 flex justify-center items-center">
            <div className="sudoku-board-surface w-full max-w-xl">
              <canvas
                ref={canvasRef}
                className={`sudoku-canvas w-full ${isBoardAnimating ? 'fade-in' : ''}`}
                width={CANVAS_SIZE}
                height={CANVAS_SIZE}
                style={{ aspectRatio: '1 / 1' }}
                aria-label="Sudoku board"
                role="application"
                tabIndex={0}
                data-board={boardSignature}
                data-notes={notesSignature}
                data-difficulty={difficulty}
                onClick={handleCanvasClick}
                onDoubleClick={handleCanvasDoubleClick}
                onContextMenu={handleCanvasContextMenu}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SudokuApp;
