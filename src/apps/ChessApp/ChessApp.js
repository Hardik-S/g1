import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ChessBoard from './ChessBoard';
import StockfishService from './StockfishService';
import ChessGameManager from './ChessGameManager';
import './ChessApp.css';

const STORAGE_KEY = 'app-container-chess-state';

const describeGameState = (manager, mode, options = {}) => {
  const { engineThinking } = options;
  if (manager.isCheckmate()) {
    return manager.getTurn() === 'w' ? 'Black wins by checkmate' : 'White wins by checkmate';
  }
  if (manager.isStalemate()) {
    return 'Draw by stalemate';
  }
  if (manager.isDraw()) {
    return 'Draw';
  }

  const turnColor = manager.getTurn() === 'w' ? 'White' : 'Black';
  if (mode === 'single') {
    if (manager.getTurn() === 'w') {
      return manager.inCheck() ? 'Your move (check)' : 'Your move';
    }
    if (engineThinking) {
      return 'Stockfish is thinking...';
    }
    return manager.inCheck() ? 'Stockfish to move (check)' : 'Stockfish to move';
  }

  return manager.inCheck() ? `${turnColor} to move (check)` : `${turnColor} to move`;
};

const ChessApp = () => {
  const managerRef = useRef(new ChessGameManager());
  const [boardState, setBoardState] = useState(managerRef.current.getBoard());
  const [mode, setMode] = useState(managerRef.current.getMode());
  const [difficulty, setDifficulty] = useState(managerRef.current.getDifficulty());
  const [status, setStatus] = useState(() => (
    describeGameState(managerRef.current, managerRef.current.getMode())
  ));
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [legalMoves, setLegalMoves] = useState([]);
  const [lastMove, setLastMove] = useState(null);
  const [engineThinking, setEngineThinking] = useState(false);
  const [engineAvailable, setEngineAvailable] = useState(true);
  const engineRef = useRef(null);

  const refreshGameState = useCallback(() => {
    setBoardState(managerRef.current.getBoard());
    setLastMove(managerRef.current.getLastMove());
    setStatus(describeGameState(managerRef.current, mode, { engineThinking }));
  }, [engineThinking, mode]);

  const persistState = useCallback(() => {
    if (typeof window === 'undefined') return;
    const payload = {
      fen: managerRef.current.getFen(),
      mode,
      difficulty,
      lastMove,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  }, [difficulty, lastMove, mode]);

  const loadState = useCallback(() => {
    if (typeof window === 'undefined') return;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);
      managerRef.current.loadState(parsed);
      setMode(managerRef.current.getMode());
      setDifficulty(managerRef.current.getDifficulty());
      setLastMove(managerRef.current.getLastMove());
      setBoardState(managerRef.current.getBoard());
      setStatus(describeGameState(managerRef.current, managerRef.current.getMode()));
    } catch (error) {
      console.warn('Failed to load saved chess state', error); // eslint-disable-line no-console
    }
  }, []);

  useEffect(() => {
    loadState();
  }, [loadState]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.Worker === 'undefined') {
      setEngineAvailable(false);
      return () => {};
    }

    const service = new StockfishService();
    engineRef.current = service;
    setEngineAvailable(true);
    return () => {
      service.dispose();
    };
  }, []);

  useEffect(() => {
    persistState();
  }, [boardState, mode, difficulty, lastMove, persistState]);

  useEffect(() => {
    setStatus(describeGameState(managerRef.current, mode, { engineThinking }));
  }, [engineThinking, mode, boardState]);

  const restrictToWhite = useMemo(() => mode === 'single', [mode]);

  const isInteractionDisabled = useMemo(() => {
    if (managerRef.current.isGameOver()) return true;
    if (mode === 'single' && (engineThinking || managerRef.current.getTurn() === 'b')) {
      return true;
    }
    return false;
  }, [engineThinking, mode, boardState]);

  const isDraggable = useCallback((square, piece) => {
    if (!piece) return false;
    if (mode === 'single') {
      return piece.color === 'w' && managerRef.current.getTurn() === 'w' && !engineThinking;
    }
    return piece.color === managerRef.current.getTurn();
  }, [engineThinking, mode, boardState]);

  const attemptMove = useCallback((from, to) => {
    if (!from || !to || from === to) return false;
    const move = managerRef.current.attemptMove(from, to);
    if (!move) {
      return false;
    }
    setSelectedSquare(null);
    setLegalMoves([]);
    setBoardState(managerRef.current.getBoard());
    setLastMove(managerRef.current.getLastMove());
    setStatus(describeGameState(managerRef.current, mode, { engineThinking }));
    return true;
  }, [engineThinking, mode]);

  const triggerEngineMove = useCallback(async () => {
    if (mode !== 'single') return;
    if (!engineRef.current || !engineAvailable) return;
    if (managerRef.current.isGameOver()) return;
    if (managerRef.current.getTurn() !== 'b') return;

    setEngineThinking(true);
    setStatus('Stockfish is thinking...');

    try {
      const bestMove = await engineRef.current.requestMove(managerRef.current.getFen(), { skillLevel: difficulty });
      if (managerRef.current.getMode() !== 'single') {
        return;
      }
      if (!bestMove || bestMove === '(none)') {
        return;
      }
      const from = bestMove.slice(0, 2);
      const to = bestMove.slice(2, 4);
      const promotion = bestMove.length > 4 ? bestMove.slice(4) : 'q';
      managerRef.current.attemptMove(from, to, promotion);
      refreshGameState();
    } catch (error) {
      console.error('Failed to get move from Stockfish', error); // eslint-disable-line no-console
      setEngineAvailable(false);
    } finally {
      setEngineThinking(false);
    }
  }, [difficulty, engineAvailable, mode, refreshGameState]);

  useEffect(() => {
    if (mode === 'single' && managerRef.current.getTurn() === 'b' && !managerRef.current.isGameOver()) {
      triggerEngineMove();
    }
  }, [mode, boardState, triggerEngineMove]);

  const handleSquareSelect = useCallback((square) => {
    if (!square) {
      setSelectedSquare(null);
      setLegalMoves([]);
      return;
    }
    if (selectedSquare && selectedSquare !== square) {
      const moved = attemptMove(selectedSquare, square);
      if (moved && mode === 'single') {
        triggerEngineMove();
      }
      if (moved) {
        return;
      }
    }

    const nextMoves = managerRef.current.getLegalTargets(square, restrictToWhite);
    setSelectedSquare(nextMoves.length > 0 ? square : null);
    setLegalMoves(nextMoves);
  }, [attemptMove, mode, restrictToWhite, selectedSquare, triggerEngineMove]);

  const handleMoveAttempt = useCallback((from, to) => {
    const moved = attemptMove(from, to);
    if (moved && mode === 'single') {
      triggerEngineMove();
    }
    return moved;
  }, [attemptMove, mode, triggerEngineMove]);

  const handleNewGame = () => {
    managerRef.current.reset();
    setSelectedSquare(null);
    setLegalMoves([]);
    setLastMove(null);
    setBoardState(managerRef.current.getBoard());
    setStatus(describeGameState(managerRef.current, managerRef.current.getMode()));
    if (engineRef.current) {
      engineRef.current.startNewGame().catch(() => {
        setEngineAvailable(false);
      });
    }
  };

  const handleModeChange = (event) => {
    const nextMode = event.target.value;
    setMode(nextMode);
    managerRef.current.setMode(nextMode);
    setSelectedSquare(null);
    setLegalMoves([]);
    if (nextMode !== 'single') {
      setEngineThinking(false);
    }
  };

  const handleDifficultyChange = (event) => {
    const value = Number(event.target.value);
    setDifficulty(value);
    managerRef.current.setDifficulty(value);
  };

  const gameOverMessage = useMemo(() => (managerRef.current.isGameOver() ? status : null), [status, boardState]);

  return (
    <div className="chess-app-container">
      <div className="chess-sidebar">
        <div className="control-group" role="radiogroup" aria-label="Game mode">
          <h2>Game Mode</h2>
          <label className="control-option">
            <input
              type="radio"
              name="game-mode"
              value="single"
              checked={mode === 'single'}
              onChange={handleModeChange}
            />
            1 Player (vs Stockfish)
          </label>
          <label className="control-option">
            <input
              type="radio"
              name="game-mode"
              value="two"
              checked={mode === 'two'}
              onChange={handleModeChange}
            />
            2 Players
          </label>
        </div>

        <div className="control-group">
          <h2>Difficulty</h2>
          <input
            type="range"
            min="0"
            max="20"
            value={difficulty}
            onChange={handleDifficultyChange}
          />
          <div className="difficulty-label">Skill Level: {difficulty}</div>
        </div>

        <div className="control-group">
          <button type="button" className="new-game-btn" onClick={handleNewGame}>
            New Game
          </button>
          {!engineAvailable && (
            <p className="engine-warning">
              Stockfish engine unavailable. 2-player mode is still playable.
            </p>
          )}
        </div>

        <div className="status-panel" aria-live="polite">
          <h2>Status</h2>
          <p>{status}</p>
          {gameOverMessage && <p className="game-over">Game Over</p>}
        </div>
      </div>

      <div className="chess-board-wrapper">
        <ChessBoard
          board={boardState}
          lastMove={lastMove}
          onMoveAttempt={handleMoveAttempt}
          selectedSquare={selectedSquare}
          legalMoves={legalMoves}
          onSquareSelect={handleSquareSelect}
          interactionDisabled={isInteractionDisabled}
          isDraggable={isDraggable}
        />
      </div>
    </div>
  );
};

export default ChessApp;
