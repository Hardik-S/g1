import React, { useCallback, useEffect, useRef, useState } from 'react';
import '../../../css/chess.css';
import BoardManagerModule from '../../../js/boardManager';
import StockfishEngineModule from '../../../js/stockfishEngine';

const BoardManager = BoardManagerModule.default || BoardManagerModule;
const StockfishEngine = StockfishEngineModule.default || StockfishEngineModule;

const CHESSBOARD_STYLE_URL =
  'https://cdn.jsdelivr.net/npm/@chrisoakman/chessboardjs@1.0.0/dist/chessboard-1.0.0.min.css';
const CHESSBOARD_SCRIPT_URL =
  'https://cdn.jsdelivr.net/npm/@chrisoakman/chessboardjs@1.0.0/dist/chessboard-1.0.0.min.js';
const CHESS_RULES_SCRIPT_URL =
  'https://cdn.jsdelivr.net/npm/chess.js@0.13.4/chess.min.js';
const STOCKFISH_SCRIPT_URL =
  'https://cdn.jsdelivr.net/npm/stockfish@16.1.1/dist/stockfish.js';

const resourcePromises = new Map();

function withTrackedPromise(id, factory) {
  if (resourcePromises.has(id)) {
    return resourcePromises.get(id);
  }
  const promise = factory();
  resourcePromises.set(id, promise);
  return promise;
}

function loadStylesheet(id, href) {
  if (typeof document === 'undefined') {
    return Promise.resolve();
  }

  return withTrackedPromise(id, () =>
    new Promise((resolve, reject) => {
      const existing = document.getElementById(id);
      if (existing) {
        if (existing.getAttribute('data-loaded') === 'true') {
          resolve();
          return;
        }
        existing.addEventListener(
          'load',
          () => {
            existing.setAttribute('data-loaded', 'true');
            resolve();
          },
          { once: true }
        );
        existing.addEventListener(
          'error',
          () => reject(new Error(`Failed to load stylesheet: ${href}`)),
          { once: true }
        );
        return;
      }

      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href = href;
      link.addEventListener(
        'load',
        () => {
          link.setAttribute('data-loaded', 'true');
          resolve();
        },
        { once: true }
      );
      link.addEventListener(
        'error',
        () => reject(new Error(`Failed to load stylesheet: ${href}`)),
        { once: true }
      );
      document.head.appendChild(link);
    })
  );
}

function loadScript(id, src) {
  if (typeof document === 'undefined') {
    return Promise.resolve();
  }

  return withTrackedPromise(id, () =>
    new Promise((resolve, reject) => {
      const existing = document.getElementById(id);
      if (existing) {
        if (
          existing.getAttribute('data-loaded') === 'true' ||
          existing.getAttribute('data-status') === 'ready'
        ) {
          resolve();
          return;
        }
        existing.addEventListener(
          'load',
          () => {
            existing.setAttribute('data-loaded', 'true');
            resolve();
          },
          { once: true }
        );
        existing.addEventListener(
          'error',
          () => reject(new Error(`Failed to load script: ${src}`)),
          { once: true }
        );
        return;
      }

      const script = document.createElement('script');
      script.id = id;
      script.src = src;
      script.async = true;
      script.addEventListener(
        'load',
        () => {
          script.setAttribute('data-loaded', 'true');
          resolve();
        },
        { once: true }
      );
      script.addEventListener(
        'error',
        () => reject(new Error(`Failed to load script: ${src}`)),
        { once: true }
      );
      document.head.appendChild(script);
    })
  );
}

function loadChessResources() {
  return Promise.all([
    loadStylesheet('chessboard-style', CHESSBOARD_STYLE_URL),
    loadScript('chessboard-script', CHESSBOARD_SCRIPT_URL),
    loadScript('chess-rules-script', CHESS_RULES_SCRIPT_URL),
    loadScript('stockfish-script', STOCKFISH_SCRIPT_URL),
  ]);
}

function describeStatus(game) {
  if (!game) {
    return 'Preparing board...';
  }

  if (game.isCheckmate()) {
    const winner = game.turn() === 'w' ? 'Black' : 'White';
    return `${winner} wins by checkmate.`;
  }

  if (game.isDraw()) {
    return 'Drawn position.';
  }

  if (game.isCheck()) {
    const defender = game.turn() === 'w' ? 'White' : 'Black';
    return `${defender} is in check.`;
  }

  const turn = game.turn() === 'w' ? 'White' : 'Black';
  return `${turn} to move.`;
}

function getModeNote(mode) {
  return mode === 'single'
    ? 'You control White. Stockfish will reply as Black after a short delay.'
    : 'Both sides are locally controlled. Take turns at the board!';
}

function createBoardElementId() {
  return `chessboard-${Math.random().toString(36).slice(2, 9)}`;
}

const ChessApp = () => {
  const [loading, setLoading] = useState(true);
  const [resourcesReady, setResourcesReady] = useState(false);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState('two');
  const [skill, setSkill] = useState(5);
  const [statusTurn, setStatusTurn] = useState('Turn: White');
  const [statusInfo, setStatusInfo] = useState('White to move.');
  const [modeNote, setModeNote] = useState(getModeNote('two'));

  const boardElementIdRef = useRef(createBoardElementId());
  const boardManagerRef = useRef(null);
  const engineRef = useRef(null);
  const engineMoveRef = useRef(false);
  const engineRequestIdRef = useRef(0);
  const triggerEngineMoveRef = useRef(() => {});

  useEffect(() => {
    let cancelled = false;
    loadChessResources()
      .then(() => {
        if (cancelled) return;
        setResourcesReady(true);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Failed to load chess resources', err);
        setError(err);
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const updateStatus = useCallback(() => {
    const manager = boardManagerRef.current;
    if (!manager) {
      return;
    }
    const turn = manager.getCurrentTurn() === 'w' ? 'White' : 'Black';
    setStatusTurn(`Turn: ${turn}`);
    setStatusInfo(describeStatus(manager.game));
  }, []);

  const ensureEngine = useCallback(() => {
    if (engineRef.current) {
      return engineRef.current;
    }
    const engineInstance = new StockfishEngine();
    engineRef.current = engineInstance;
    return engineInstance;
  }, []);

  const triggerEngineMove = useCallback(async () => {
    if (mode !== 'single') {
      return;
    }
    const manager = boardManagerRef.current;
    if (!manager || engineMoveRef.current || manager.isGameOver() || !manager.isEngineTurn()) {
      return;
    }

    engineMoveRef.current = true;
    const requestId = ++engineRequestIdRef.current;

    try {
      const engine = ensureEngine();
      const fen = manager.getFen();
      const move = await engine.requestMove(fen);

      if (engineRequestIdRef.current !== requestId) {
        return;
      }

      if (mode !== 'single') {
        return;
      }

      if (move) {
        const applied = manager.applyEngineMove(move);
        if (applied) {
          updateStatus();
        }
      }
    } catch (err) {
      console.error('Unable to complete Stockfish move', err);
    } finally {
      engineMoveRef.current = false;
    }
  }, [ensureEngine, mode, updateStatus]);

  useEffect(() => {
    triggerEngineMoveRef.current = triggerEngineMove;
  }, [triggerEngineMove]);

  useEffect(() => {
    if (!resourcesReady || error) {
      return;
    }

    const manager = new BoardManager({ elementId: boardElementIdRef.current });
    boardManagerRef.current = manager;

    manager.onAfterMove(() => {
      updateStatus();
      triggerEngineMoveRef.current();
    });

    manager.setPlayers({ white: 'human', black: 'human' });
    manager.reset();
    updateStatus();

    return () => {
      engineRequestIdRef.current += 1;
      engineMoveRef.current = false;
      const engine = engineRef.current;
      if (engine) {
        engine.dispose();
        engineRef.current = null;
      }
      if (manager && typeof manager.dispose === 'function') {
        manager.dispose();
      }
      boardManagerRef.current = null;
    };
  }, [resourcesReady, error, updateStatus]);

  useEffect(() => {
    setModeNote(getModeNote(mode));

    if (!resourcesReady) {
      return;
    }

    const manager = boardManagerRef.current;
    if (!manager) {
      return;
    }

    if (mode === 'single') {
      const engine = ensureEngine();
      engine.setSkillLevel(skill);
      manager.setPlayers({ white: 'human', black: 'engine' });
      triggerEngineMoveRef.current();
    } else {
      engineRequestIdRef.current += 1;
      engineMoveRef.current = false;
      const engine = engineRef.current;
      if (engine) {
        engine.stop();
      }
      manager.setPlayers({ white: 'human', black: 'human' });
    }

    updateStatus();
  }, [mode, skill, resourcesReady, ensureEngine, updateStatus]);

  useEffect(() => {
    if (mode !== 'single' || !resourcesReady) {
      return;
    }

    const engine = ensureEngine();
    engine.setSkillLevel(skill);
  }, [mode, resourcesReady, skill, ensureEngine]);

  const handleModeChange = useCallback((event) => {
    setMode(event.target.value);
  }, []);

  const handleSkillChange = useCallback((event) => {
    setSkill(Number(event.target.value));
  }, []);

  const handleNewGame = useCallback(() => {
    if (!resourcesReady) {
      return;
    }

    const manager = boardManagerRef.current;
    if (!manager) {
      return;
    }

    engineRequestIdRef.current += 1;
    engineMoveRef.current = false;
    const engine = engineRef.current;
    if (engine) {
      engine.stop();
    }

    manager.reset();
    if (mode === 'single') {
      const engineInstance = ensureEngine();
      engineInstance.setSkillLevel(skill);
      manager.setPlayers({ white: 'human', black: 'engine' });
      triggerEngineMoveRef.current();
    } else {
      manager.setPlayers({ white: 'human', black: 'human' });
    }

    updateStatus();
  }, [mode, resourcesReady, skill, ensureEngine, updateStatus]);

  if (error) {
    return (
      <div className="chess-app">
        <div className="chess-feedback" role="alert">
          <h2>Unable to load Chess</h2>
          <p>{error.message || 'Check your connection and try again.'}</p>
        </div>
      </div>
    );
  }

  if (loading || !resourcesReady) {
    return (
      <div className="chess-app">
        <div className="chess-feedback">
          <h2>Loading chessboard…</h2>
          <p>The board and engine are being prepared.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chess-app">
      <div className="chess-toolbar">
        <label htmlFor="chess-mode-select">
          Mode
          <select
            id="chess-mode-select"
            value={mode}
            onChange={handleModeChange}
          >
            <option value="two">2 Player Local</option>
            <option value="single">Play vs Stockfish</option>
          </select>
        </label>
        <label htmlFor="chess-skill-level">
          Skill Level
          <input
            id="chess-skill-level"
            type="range"
            min="0"
            max="20"
            value={skill}
            onChange={handleSkillChange}
            disabled={mode !== 'single'}
          />
          <span>{skill}</span>
        </label>
        <button type="button" onClick={handleNewGame} disabled={!resourcesReady}>
          New Game
        </button>
      </div>

      <div className="chess-board-container">
        <div id={boardElementIdRef.current} className="chess-board" />
        <div className="chess-status">
          <h2>Status</h2>
          <div className="status-line">{statusTurn}</div>
          <div className="status-line">{statusInfo}</div>
          <p className="mode-note">{modeNote}</p>
        </div>
      </div>
    </div>
  );
};

export default ChessApp;
