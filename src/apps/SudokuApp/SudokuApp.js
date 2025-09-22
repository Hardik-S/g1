import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './SudokuApp.css';
import {
  generateSudoku,
  getDifficultyConfig,
  getDifficultyLevels,
  isBoardComplete,
  solveSudoku,
} from './sudokuLogic';

const CANVAS_SIZE = 540;

const cloneBoard = (board) => board.map((row) => row.slice());

const createEmptyNotes = (size) =>
  Array.from({ length: size }, () =>
    Array.from({ length: size }, () => new Set())
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
    initialGameRef.current = generateSudoku();
  }

  const [difficulty, setDifficulty] = useState(
    initialGameRef.current.difficulty
  );
  const [gameData, setGameData] = useState(initialGameRef.current);
  const [board, setBoard] = useState(() =>
    cloneBoard(initialGameRef.current.puzzle)
  );
  const [notes, setNotes] = useState(() =>
    createEmptyNotes(initialGameRef.current.gridSize)
  );
  const [selectedCell, setSelectedCell] = useState({ row: 0, col: 0 });
  const [noteMode, setNoteMode] = useState(false);
  const [isBoardAnimating, setIsBoardAnimating] = useState(false);
  const [lastAction, setLastAction] = useState('Breathe in the aroma and begin.');
  const canvasRef = useRef(null);
  const animationTimeoutRef = useRef(null);

  const gridSize = gameData.gridSize;
  const subgridSize = gameData.subgridSize;
  const symbolNames = gameData.symbols || [];
  const isShapeMode = symbolNames.length > 0;
  const maxEntryValue = isShapeMode ? symbolNames.length : gridSize;
  const totalCells = gridSize * gridSize;
  const difficultyLabel = gameData.label || difficulty;
  const difficultyOptions = useMemo(() => getDifficultyLevels(), []);

  const lockedCells = useMemo(
    () => gameData.puzzle.map((row) => row.map((value) => value !== 0)),
    [gameData]
  );

  useEffect(() => {
    setBoard(cloneBoard(gameData.puzzle));
    setNotes(createEmptyNotes(gameData.gridSize));
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
    for (let row = 0; row < gridSize; row += 1) {
      for (let col = 0; col < gridSize; col += 1) {
        if (board[row][col] !== solution[row][col]) {
          return false;
        }
      }
    }
    return true;
  }, [board, gameData, gridSize]);

  const filledCount = useMemo(
    () => board.reduce((acc, row) => acc + row.filter((value) => value !== 0).length, 0),
    [board]
  );

  const ambianceMessage = useMemo(() => {
    if (boardMatchesSolution && isBoardComplete(board)) {
      return 'Complete! Treat yourself to a refill.';
    }
    if (noteMode && !isShapeMode) {
      return 'Note mode: gentle pencil marks for possibilities.';
    }
    if (isShapeMode) {
      return 'Decaf mode: tap squares to cycle through cozy shapes.';
    }
    return 'Final mode: place numbers with a steady hand.';
  }, [board, boardMatchesSolution, isShapeMode, noteMode]);

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
      const requestedConfig = level ? getDifficultyConfig(level) : null;
      const targetId =
        level && requestedConfig && requestedConfig.id !== level
          ? difficulty
          : (requestedConfig ? requestedConfig.id : difficulty);
      const nextGame = generateSudoku(targetId);
      setDifficulty(nextGame.difficulty);
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
      const computedFromPuzzle = solveSudoku(
        gameData.puzzle,
        gridSize,
        subgridSize
      );
      if (computedFromPuzzle) {
        solvedBoard = computedFromPuzzle;
      }
    }

    if (!solvedBoard) {
      const computedFromBoard = solveSudoku(board, gridSize, subgridSize);
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
    if (!canvasRef.current) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = CANVAS_SIZE / rect.width;
    const scaleY = CANVAS_SIZE / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;
    const cellSize = CANVAS_SIZE / gridSize;
    const row = Math.max(0, Math.min(gridSize - 1, Math.floor(y / cellSize)));
    const col = Math.max(0, Math.min(gridSize - 1, Math.floor(x / cellSize)));
    const coords = { row, col };
    setSelectedCell(coords);
    return coords;
  };

  const handleCanvasClick = (event) => {
    const coords = handleCanvasSelection(event);
    if (!coords) return;

    const { row, col } = coords;

    if (isShapeMode && !lockedCells[row][col]) {
      setNoteMode(false);
      clearNotesAt(row, col);
      const nextValue = (() => {
        let updated = 0;
        setBoard((prev) => {
          const next = prev.map((r) => r.slice());
          const current = next[row][col];
          const candidate = current >= maxEntryValue ? 0 : current + 1;
          next[row][col] = candidate;
          updated = candidate;
          return next;
        });
        return updated;
      })();
      if (nextValue === 0) {
        setLastAction('Cleared the cup — back to a blank slate.');
      } else {
        const shapeName = symbolNames[nextValue - 1];
        setLastAction(`Placed ${shapeName} — playful and light.`);
      }
    } else {
      setLastAction('Cell selected — sip slowly and decide.');
    }
  };

  const handleCanvasDoubleClick = (event) => {
    const coords = handleCanvasSelection(event);
    if (!coords) return;

    if (isShapeMode) {
      setLastAction('Decaf mode keeps things simple — notes stay tucked away.');
      return;
    }

    setNoteMode((prev) => !prev);
    setLastAction('Mode toggled — pencil or pen, your choice.');
  };

  const handleCanvasContextMenu = (event) => {
    event.preventDefault();
    const coords = handleCanvasSelection(event);
    if (!coords) return;

    if (isShapeMode) {
      setLastAction('Decaf mode is all intuition — notes are unavailable.');
      return;
    }

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
      if (direction === 'up') row = (row + gridSize - 1) % gridSize;
      if (direction === 'down') row = (row + 1) % gridSize;
      if (direction === 'left') col = (col + gridSize - 1) % gridSize;
      if (direction === 'right') col = (col + 1) % gridSize;
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

      const numericValue = Number.parseInt(event.key, 10);
      if (
        !Number.isNaN(numericValue) &&
        numericValue >= 1 &&
        numericValue <= maxEntryValue
      ) {
        if (isShapeMode) {
          updateBoardValue(row, col, numericValue);
          clearNotesAt(row, col);
          setNoteMode(false);
          const shapeName = symbolNames[numericValue - 1];
          setLastAction(`Placed ${shapeName} — playful and light.`);
        } else if (noteMode) {
          toggleNoteValue(row, col, numericValue);
          setLastAction(`Noted ${numericValue} — soft pencil whispers.`);
        } else {
          updateBoardValue(row, col, numericValue);
          clearNotesAt(row, col);
          setLastAction(`Placed ${numericValue} with confidence.`);
        }
      } else if (event.key === 'Backspace' || event.key === 'Delete') {
        if (noteMode && !isShapeMode) {
          clearNotesAt(row, col);
          setLastAction('Notes cleared — fresh parchment.');
        } else {
          updateBoardValue(row, col, 0);
          clearNotesAt(row, col);
          setLastAction(
            isShapeMode
              ? 'Cleared the cup — back to a blank slate.'
              : 'Cell cleared — savor the pause.'
          );
        }
      }
    },
    [
      clearNotesAt,
      isShapeMode,
      lockedCells,
      maxEntryValue,
      moveSelection,
      noteMode,
      selectedCell,
      symbolNames,
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

    const cellSize = CANVAS_SIZE / gridSize;
    const noteGridSize = isShapeMode ? 2 : 3;
    const noteCellSize = cellSize / noteGridSize;

    const drawShape = (shapeName, centerX, centerY, size, options = {}) => {
      const {
        strokeStyle = 'rgba(93, 66, 46, 0.92)',
        fillStyle = 'transparent',
        lineWidth = 2,
      } = options;
      ctx.save();
      ctx.lineWidth = lineWidth;
      ctx.strokeStyle = strokeStyle;
      ctx.fillStyle = fillStyle;
      if (shapeName === 'Circle') {
        ctx.beginPath();
        ctx.arc(centerX, centerY, size, 0, Math.PI * 2);
        ctx.stroke();
      } else if (shapeName === 'Triangle') {
        ctx.beginPath();
        ctx.moveTo(centerX, centerY - size);
        ctx.lineTo(centerX - size, centerY + size);
        ctx.lineTo(centerX + size, centerY + size);
        ctx.closePath();
        ctx.stroke();
      } else if (shapeName === 'Square') {
        const half = size;
        ctx.strokeRect(centerX - half, centerY - half, half * 2, half * 2);
      } else if (shapeName === 'Star') {
        ctx.beginPath();
        const spikes = 5;
        for (let i = 0; i < spikes * 2; i += 1) {
          const radius = i % 2 === 0 ? size : size * 0.45;
          const angle = (Math.PI / spikes) * i - Math.PI / 2;
          const x = centerX + Math.cos(angle) * radius;
          const y = centerY + Math.sin(angle) * radius;
          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.closePath();
        ctx.stroke();
      }
      ctx.restore();
    };

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
      const subgridRow = Math.floor(row / subgridSize) * subgridSize;
      const subgridCol = Math.floor(col / subgridSize) * subgridSize;
      ctx.fillStyle = 'rgba(210, 180, 140, 0.18)';
      ctx.fillRect(
        subgridCol * cellSize,
        subgridRow * cellSize,
        cellSize * subgridSize,
        cellSize * subgridSize
      );

      ctx.fillStyle = 'rgba(201, 168, 132, 0.18)';
      ctx.fillRect(0, row * cellSize, CANVAS_SIZE, cellSize);
      ctx.fillRect(col * cellSize, 0, cellSize, CANVAS_SIZE);

      ctx.fillStyle = noteMode
        ? 'rgba(226, 202, 171, 0.6)'
        : 'rgba(202, 174, 139, 0.6)';
      ctx.fillRect(col * cellSize, row * cellSize, cellSize, cellSize);
    }

    for (let i = 0; i <= gridSize; i += 1) {
      ctx.beginPath();
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(CANVAS_SIZE, i * cellSize);
      ctx.strokeStyle =
        i % subgridSize === 0
          ? 'rgba(111, 78, 55, 0.55)'
          : 'rgba(111, 78, 55, 0.25)';
      ctx.lineWidth = i % subgridSize === 0 ? 2 : 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, CANVAS_SIZE);
      ctx.strokeStyle =
        i % subgridSize === 0
          ? 'rgba(111, 78, 55, 0.55)'
          : 'rgba(111, 78, 55, 0.25)';
      ctx.lineWidth = i % subgridSize === 0 ? 2 : 1;
      ctx.stroke();
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let row = 0; row < gridSize; row += 1) {
      for (let col = 0; col < gridSize; col += 1) {
        const centerX = col * cellSize + cellSize / 2;
        const centerY = row * cellSize + cellSize / 2;
        const puzzleValue = gameData.puzzle[row][col];
        const value = board[row][col];

        if (puzzleValue !== 0) {
          if (isShapeMode) {
            const shapeName = symbolNames[puzzleValue - 1];
            drawShape(shapeName, centerX, centerY, cellSize * 0.3, {
              strokeStyle: 'rgba(101, 77, 57, 0.95)',
              lineWidth: 2.4,
            });
          } else {
            ctx.fillStyle = 'rgba(101, 77, 57, 0.95)';
            ctx.font = `600 ${cellSize * 0.55}px 'Work Sans', 'Segoe UI', sans-serif`;
            ctx.fillText(puzzleValue, centerX, centerY + 2);
          }
        } else if (value !== 0) {
          const isCorrect = gameData.solution[row][col] === value;
          if (isShapeMode) {
            const shapeName = symbolNames[value - 1];
            drawShape(shapeName, centerX, centerY, cellSize * 0.3, {
              strokeStyle: isCorrect
                ? 'rgba(93, 66, 46, 0.92)'
                : 'rgba(164, 82, 62, 0.85)',
              lineWidth: 2,
            });
          } else {
            ctx.fillStyle = isCorrect
              ? 'rgba(93, 66, 46, 0.92)'
              : 'rgba(164, 82, 62, 0.85)';
            ctx.font = `500 ${cellSize * 0.55}px 'Work Sans', 'Segoe UI', sans-serif`;
            ctx.fillText(value, centerX, centerY + 2);
          }
        } else {
          const cellNotes = notes[row][col];
          if (cellNotes && cellNotes.size) {
            const sortedNotes = Array.from(cellNotes)
              .filter((note) => note <= maxEntryValue)
              .sort((a, b) => a - b);
            sortedNotes.forEach((note) => {
              const index = note - 1;
              const noteRow = Math.floor(index / noteGridSize);
              const noteCol = index % noteGridSize;
              const noteX =
                col * cellSize + (noteCol + 0.5) * noteCellSize;
              const noteY =
                row * cellSize + (noteRow + 0.5) * noteCellSize;

              if (isShapeMode) {
                const shapeName = symbolNames[note - 1];
                drawShape(shapeName, noteX, noteY, noteCellSize * 0.35, {
                  strokeStyle: 'rgba(111, 78, 55, 0.55)',
                  lineWidth: 1.2,
                });
              } else {
                ctx.fillStyle = 'rgba(111, 78, 55, 0.55)';
                ctx.font = `400 ${cellSize / 3.2}px 'Work Sans', 'Segoe UI', sans-serif`;
                ctx.fillText(note, noteX, noteY);
              }
            });
          }
        }
      }
    }
  }, [
    board,
    gameData,
    gridSize,
    isShapeMode,
    maxEntryValue,
    noteMode,
    notes,
    selectedCell,
    subgridSize,
    symbolNames,
  ]);

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
                Gentle puzzles steeped in warm hues. Tap Decaf for shape-based play, type
                digits in the stronger roasts, right-click for notes, and double-click to
                toggle between mindful note-taking and final answers.
              </p>
            </div>

            <div className="flex flex-wrap gap-2" role="group" aria-label="Select difficulty">
              {difficultyOptions.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  className={`coffee-chip px-4 py-2 rounded-full text-xs uppercase tracking-[0.25em] transition-all duration-300 hover:translate-y-[-1px] hover:shadow-lg ${
                    difficulty === id ? 'coffee-chip-active' : 'text-coffee-ink/70'
                  }`}
                  onClick={() => handleDifficultyChange(id)}
                  data-testid={`difficulty-${id}`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm">
              <span className="status-badge px-4 py-1 rounded-full uppercase tracking-[0.2em]">
                {noteMode && !isShapeMode
                  ? 'Note mode'
                  : isShapeMode
                  ? 'Shape cycling'
                  : 'Final entry'}
              </span>
              <span className="status-badge px-4 py-1 rounded-full uppercase tracking-[0.2em]">
                {difficultyLabel} blend
              </span>
              <span className="status-badge px-4 py-1 rounded-full uppercase tracking-[0.2em]">
                {filledCount} / {totalCells} filled
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
