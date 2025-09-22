import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './CatConnectFourApp.css';
import GameBoard from './GameBoard';
import useCatAudio from './useCatAudio';
import {
  BOARD_CONFIG,
  DIFFICULTIES,
  DIFFICULTY_OPTIONS,
  MODE_OPTIONS,
  MODES,
  PAW_CHOICES,
  SESSION_STORAGE_KEYS,
  STORAGE_KEYS,
  TURN_ICONS,
} from './constants';
import {
  checkWinner,
  chooseAIMove,
  createEmptyBoard,
  dropPiece,
  getAvailableColumns,
  isBoardFull,
} from './logic';

const getLocalStorageValue = (key) => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key);
  } catch (error) {
    return null;
  }
};

const setLocalStorageValue = (key, value) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
    // ignore storage failure
  }
};

const getSessionScoreboards = () => {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEYS.SCOREBOARDS);
    return raw ? JSON.parse(raw) : {};
  } catch (error) {
    return {};
  }
};

const setSessionScoreboards = (value) => {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(SESSION_STORAGE_KEYS.SCOREBOARDS, JSON.stringify(value));
  } catch (error) {
    // ignore storage failure
  }
};

const getDifficultySettings = (difficultyId) => (
  DIFFICULTY_OPTIONS.find((option) => option.id === difficultyId) || DIFFICULTY_OPTIONS[0]
);

const getPawClass = (selection) => `paw-${selection || PAW_CHOICES[0].id}`;

const createScoreboardKey = (mode, difficulty, config) => {
  if (!mode || !config) return null;
  const suffix = mode === MODES.AI ? difficulty || DIFFICULTIES.RYTHM : 'local';
  return `${mode}|${config.columns}x${config.rows}|${config.connect}|${suffix}`;
};

const CatConnectFourApp = () => {
  const storedMode = getLocalStorageValue(STORAGE_KEYS.MODE);
  const storedDifficulty = getLocalStorageValue(STORAGE_KEYS.DIFFICULTY);
  const storedPaw = getLocalStorageValue(STORAGE_KEYS.PAW);
  const storedMute = getLocalStorageValue(STORAGE_KEYS.MUTE);

  const [phase, setPhase] = useState('mode');
  const [selectedMode, setSelectedMode] = useState(() => (
    storedMode && [MODES.TWO_PLAYER, MODES.AI, MODES.KITTEN].includes(storedMode)
      ? storedMode
      : null
  ));
  const [selectedDifficulty, setSelectedDifficulty] = useState(() => (
    storedDifficulty && [DIFFICULTIES.RYTHM, DIFFICULTIES.KIMCHI, DIFFICULTIES.SIELLA].includes(storedDifficulty)
      ? storedDifficulty
      : DIFFICULTIES.RYTHM
  ));
  const [selectedPaw, setSelectedPaw] = useState(() => (
    storedPaw && PAW_CHOICES.some((choice) => choice.id === storedPaw)
      ? storedPaw
      : PAW_CHOICES[0].id
  ));
  const [muted, setMuted] = useState(() => storedMute === 'true');

  const config = selectedMode ? BOARD_CONFIG[selectedMode] : null;

  const [board, setBoard] = useState(() => (config ? createEmptyBoard(config.rows, config.columns) : createEmptyBoard(6, 7)));
  const [currentPlayer, setCurrentPlayer] = useState('player1');
  const [lastMove, setLastMove] = useState(null);
  const [winner, setWinner] = useState(null);
  const [winningCells, setWinningCells] = useState(null);
  const [announcement, setAnnouncement] = useState('Pick a mode to begin.');

  const { playMeow, playPurr } = useCatAudio(muted);

  const scoreboardKey = useMemo(() => (
    config ? createScoreboardKey(selectedMode, selectedDifficulty, config) : null
  ), [selectedMode, selectedDifficulty, config]);

  const scoreboardTemplate = useMemo(() => {
    if (!selectedMode) return null;
    if (selectedMode === MODES.AI) {
      return { player: 0, ai: 0, draws: 0 };
    }
    return { player1: 0, player2: 0, draws: 0 };
  }, [selectedMode]);

  const [scoreboard, setScoreboard] = useState(() => {
    if (!scoreboardKey || !scoreboardTemplate) {
      return scoreboardTemplate;
    }
    const collection = getSessionScoreboards();
    return collection[scoreboardKey] || scoreboardTemplate;
  });

  useEffect(() => {
    if (!scoreboardKey || !scoreboardTemplate) {
      setScoreboard(scoreboardTemplate);
      return;
    }
    const collection = getSessionScoreboards();
    const stored = collection[scoreboardKey];
    setScoreboard(stored || scoreboardTemplate);
  }, [scoreboardKey, scoreboardTemplate]);

  useEffect(() => {
    if (!scoreboardKey || !scoreboard) return;
    const collection = getSessionScoreboards();
    collection[scoreboardKey] = scoreboard;
    setSessionScoreboards(collection);
  }, [scoreboardKey, scoreboard]);

  useEffect(() => {
    if (selectedMode) {
      setLocalStorageValue(STORAGE_KEYS.MODE, selectedMode);
    }
  }, [selectedMode]);

  useEffect(() => {
    if (selectedMode === MODES.AI && selectedDifficulty) {
      setLocalStorageValue(STORAGE_KEYS.DIFFICULTY, selectedDifficulty);
    }
  }, [selectedMode, selectedDifficulty]);

  useEffect(() => {
    if (selectedPaw) {
      setLocalStorageValue(STORAGE_KEYS.PAW, selectedPaw);
    }
  }, [selectedPaw]);

  useEffect(() => {
    setLocalStorageValue(STORAGE_KEYS.MUTE, muted ? 'true' : 'false');
  }, [muted]);

  const difficultySettings = useMemo(() => getDifficultySettings(selectedDifficulty), [selectedDifficulty]);

  const pawStyles = useMemo(() => {
    if (selectedMode === MODES.AI) {
      return {
        player: getPawClass(selectedPaw),
        ai: `paw-ai-${difficultySettings.paw}`,
      };
    }
    return {
      player1: getPawClass(selectedPaw),
      player2: 'paw-ginger-stripe',
    };
  }, [selectedMode, selectedPaw, difficultySettings]);

  const resetBoard = useCallback((modeToUse = selectedMode) => {
    const newConfig = modeToUse ? BOARD_CONFIG[modeToUse] : BOARD_CONFIG[MODES.TWO_PLAYER];
    setBoard(createEmptyBoard(newConfig.rows, newConfig.columns));
    setLastMove(null);
    setWinner(null);
    setWinningCells(null);
    const firstPlayer = modeToUse === MODES.AI ? 'player' : 'player1';
    setCurrentPlayer(firstPlayer);
    setAnnouncement(modeToUse === MODES.AI ? 'Your turn – drop a paw print!' : 'Player 1 begins the round.');
  }, [selectedMode]);

  useEffect(() => {
    if (phase === 'playing' && selectedMode) {
      resetBoard(selectedMode);
    }
  }, [phase, selectedMode, resetBoard]);

  const isAITurn = selectedMode === MODES.AI && currentPlayer === 'ai' && !winner;

  const updateScoreboard = useCallback((result) => {
    setScoreboard((previous) => {
      if (!previous) return previous;
      const updated = { ...previous };
      if (result === 'draw') {
        updated.draws = (updated.draws || 0) + 1;
      } else if (updated[result] !== undefined) {
        updated[result] += 1;
      }
      return updated;
    });
  }, []);

  const handleMove = useCallback((column, actingPlayer) => {
    if (!config || winner) {
      return;
    }
    const availableColumns = getAvailableColumns(board);
    if (!availableColumns.includes(column)) {
      return;
    }
    const { board: nextBoard, row } = dropPiece(board, column, actingPlayer);
    setBoard(nextBoard);
    setLastMove({ row, column, player: actingPlayer, time: Date.now() });
    playMeow();

    const verdict = checkWinner(nextBoard, config.connect);
    if (verdict) {
      setWinner(verdict.winner);
      setWinningCells(verdict.cells);
      updateScoreboard(verdict.winner);
      let victoryMessage = 'A brilliant connection!';
      if (verdict.winner === 'ai') {
        victoryMessage = `${difficultySettings.title} wins with graceful precision!`;
      } else if (verdict.winner === 'player') {
        victoryMessage = 'You connected a cozy chain!';
      } else if (verdict.winner === 'player1') {
        victoryMessage = 'Player 1 claims the round!';
      } else if (verdict.winner === 'player2') {
        victoryMessage = 'Player 2 claims the round!';
      }
      setAnnouncement(victoryMessage);
      playPurr();
      return;
    }

    if (isBoardFull(nextBoard)) {
      setWinner('draw');
      updateScoreboard('draw');
      setAnnouncement('It\'s a cozy draw. Share a saucer of milk!');
      return;
    }

    if (selectedMode === MODES.AI) {
      if (actingPlayer === 'player') {
        setCurrentPlayer('ai');
        setAnnouncement(`${difficultySettings.title} is thinking...`);
      } else {
        setCurrentPlayer('player');
        setAnnouncement('Your turn – pounce on a column!');
      }
    } else {
      if (actingPlayer === 'player1') {
        setCurrentPlayer('player2');
        setAnnouncement('Player 2, show your paws!');
      } else {
        setCurrentPlayer('player1');
        setAnnouncement('Player 1, back to you!');
      }
    }
  }, [board, config, winner, selectedMode, playMeow, playPurr, updateScoreboard, difficultySettings]);

  useEffect(() => {
    if (!isAITurn) {
      return undefined;
    }
    const timer = setTimeout(() => {
      const column = chooseAIMove({
        board,
        aiId: 'ai',
        opponentId: 'player',
        connect: config.connect,
        blunderRate: difficultySettings.blunderRate,
      });
      if (column !== null) {
        handleMove(column, 'ai');
      }
    }, 700);
    return () => clearTimeout(timer);
  }, [isAITurn, board, config, difficultySettings, handleMove]);

  const startModeSelection = useCallback(() => {
    setPhase('mode');
    setAnnouncement('Pick a mode to begin.');
    setWinner(null);
  }, []);

  const handleModeSelection = (modeId) => {
    setSelectedMode(modeId);
    if (modeId === MODES.AI) {
      setPhase('difficulty');
    } else {
      setPhase('paw');
    }
  };

  const handleDifficultySelection = (difficultyId) => {
    setSelectedDifficulty(difficultyId);
    setPhase('paw');
  };

  const handlePawSelection = (pawId) => {
    setSelectedPaw(pawId);
    setPhase('playing');
  };

  const handleReset = () => {
    resetBoard(selectedMode);
  };

  const handleClearScoreboard = () => {
    setScoreboard(scoreboardTemplate);
  };

  const toggleMute = () => {
    setMuted((value) => !value);
  };

  const renderModeScreen = () => (
    <div className="screen-panel">
      <h2 className="screen-title">Welcome to the Cat Café</h2>
      <p className="screen-subtitle">Choose how you want to play.</p>
      <div className="mode-grid">
        {MODE_OPTIONS.map((option) => (
          <button
            type="button"
            key={option.id}
            className={`paw-card${selectedMode === option.id ? ' is-selected' : ''}`}
            onClick={() => handleModeSelection(option.id)}
          >
            <div className="paw-card-icon">{option.icon}</div>
            <div className="paw-card-body">
              <h3>{option.title}</h3>
              <p>{option.description}</p>
            </div>
            <div className="paw-card-trail">🐾🐾🐾</div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderDifficultyScreen = () => (
    <div className="screen-panel">
      <h2 className="screen-title">Choose your café opponent</h2>
      <p className="screen-subtitle">Each cat has a distinct paw colour and personality.</p>
      <div className="mode-grid">
        {DIFFICULTY_OPTIONS.map((option) => (
          <button
            type="button"
            key={option.id}
            className={`paw-card${selectedDifficulty === option.id ? ' is-selected' : ''}`}
            onClick={() => handleDifficultySelection(option.id)}
          >
            <div className={`paw-difficulty-preview paw-ai-${option.paw}`} aria-hidden="true" />
            <div className="paw-card-body">
              <h3>{option.title}</h3>
              <p>{option.description}</p>
              <p className="paw-card-note">Blunder chance: {Math.round(option.blunderRate * 100)}%</p>
            </div>
          </button>
        ))}
      </div>
      <button type="button" className="back-link" onClick={startModeSelection}>← Back to mode select</button>
    </div>
  );

  const renderPawSelectionScreen = () => (
    <div className="screen-panel">
      <h2 className="screen-title">Choose your lucky paw</h2>
      <p className="screen-subtitle">Your paw print marks every drop.</p>
      <div className="paw-choice-grid">
        {PAW_CHOICES.map((choice) => (
          <button
            type="button"
            key={choice.id}
            className={`paw-choice${selectedPaw === choice.id ? ' is-selected' : ''}`}
            onClick={() => handlePawSelection(choice.id)}
          >
            <div className={`paw-choice-preview ${getPawClass(choice.id)}`} aria-hidden="true" />
            <span>{choice.preview} {choice.label}</span>
          </button>
        ))}
      </div>
      <div className="paw-choice-actions">
        <button type="button" className="back-link" onClick={() => setPhase(selectedMode === MODES.AI ? 'difficulty' : 'mode')}>← Back</button>
      </div>
    </div>
  );

  const renderScoreboard = () => {
    if (!scoreboard) return null;
    if (selectedMode === MODES.AI) {
      return (
        <div className="scoreboard">
          <h3>Scoreboard</h3>
          <ul>
            <li><span className="score-icon">😺</span> You <strong>{scoreboard.player || 0}</strong></li>
            <li><span className="score-icon">🐈</span> {difficultySettings.title} <strong>{scoreboard.ai || 0}</strong></li>
            <li><span className="score-icon">🫖</span> Draws <strong>{scoreboard.draws || 0}</strong></li>
          </ul>
        </div>
      );
    }
    return (
      <div className="scoreboard">
        <h3>Scoreboard</h3>
        <ul>
          <li><span className="score-icon">😺</span> Player 1 <strong>{scoreboard.player1 || 0}</strong></li>
          <li><span className="score-icon">😼</span> Player 2 <strong>{scoreboard.player2 || 0}</strong></li>
          <li><span className="score-icon">🫖</span> Draws <strong>{scoreboard.draws || 0}</strong></li>
        </ul>
      </div>
    );
  };

  const renderTurnIndicator = () => {
    if (!selectedMode) return null;
    if (winner === 'draw') {
      return <div className="turn-indicator">🐾 Cozy draw!</div>;
    }
    if (winner) {
      const label = winner === 'player' ? 'You win!' : winner === 'ai' ? `${difficultySettings.title} wins!` : `${winner === 'player1' ? 'Player 1' : 'Player 2'} wins!`;
      return <div className="turn-indicator is-winning">✨ {label} ✨</div>;
    }
    const icon = TURN_ICONS[currentPlayer] || '🐾';
    const label = currentPlayer === 'ai'
      ? `${difficultySettings.title} is thinking...`
      : currentPlayer === 'player'
        ? 'Your turn'
        : currentPlayer === 'player1'
          ? 'Player 1 turn'
          : 'Player 2 turn';
    return (
      <div className="turn-indicator">
        <span className="turn-icon" aria-hidden="true">{icon}</span>
        {label}
      </div>
    );
  };

  const renderGameScreen = () => (
    <div className="game-layout">
      <div className="game-sidebar">
        {renderTurnIndicator()}
        {renderScoreboard()}
        <div className="game-actions">
          <button type="button" className="action-button" onClick={handleReset}>Reset Board</button>
          <button type="button" className="action-button" onClick={handleClearScoreboard}>Clear Scoreboard</button>
          <button type="button" className="action-button" onClick={() => setPhase('paw')}>Change Paw</button>
          <button type="button" className="action-button" onClick={startModeSelection}>Change Mode</button>
          <button type="button" className={`action-button${muted ? ' is-muted' : ''}`} onClick={toggleMute}>
            {muted ? 'Unmute Café' : 'Mute Café'}
          </button>
        </div>
      </div>
      <div className="game-board-wrapper">
        {config && (
          <GameBoard
            board={board}
            onColumnSelect={(column) => handleMove(column, selectedMode === MODES.AI ? 'player' : currentPlayer)}
            isInteractive={!winner && (!isAITurn || currentPlayer !== 'ai')}
            highlightCells={winningCells}
            pawStyles={pawStyles}
            lastMove={lastMove}
            connect={config.connect}
            announcement={announcement}
          />
        )}
      </div>
    </div>
  );

  const publicUrl = (process.env.PUBLIC_URL || '').replace(/\/$/, '');
  const catConnectFourAssetBasePath = `${publicUrl}/cat-connect-four`;
  const backgroundImagePath = `${catConnectFourAssetBasePath}/cat-cafe-illustration.svg`;

  return (
    <div
      className="cat-connect-four-app"
      style={{ backgroundImage: `url(${backgroundImagePath})` }}
    >
      <div className="cafe-overlay" />
      <div className="app-shell">
        <header className="app-header">
          <h1>Cat Connect Four</h1>
          <p>Relax at the cat café, drop paw prints, and connect a cozy run.</p>
        </header>
        <main>
          {phase === 'mode' && renderModeScreen()}
          {phase === 'difficulty' && renderDifficultyScreen()}
          {phase === 'paw' && renderPawSelectionScreen()}
          {phase === 'playing' && renderGameScreen()}
        </main>
      </div>
    </div>
  );
};

export default CatConnectFourApp;
