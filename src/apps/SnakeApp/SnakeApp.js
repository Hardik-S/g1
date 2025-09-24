import React, { useCallback, useEffect, useMemo, useState } from 'react';
import './SnakeApp.css';
import { useSnakeGame, DIRECTIONS, GameStatus } from './game/useSnakeGame';

const KEY_TO_DIRECTION = {
  arrowup: DIRECTIONS.Up,
  w: DIRECTIONS.Up,
  arrowdown: DIRECTIONS.Down,
  s: DIRECTIONS.Down,
  arrowleft: DIRECTIONS.Left,
  a: DIRECTIONS.Left,
  arrowright: DIRECTIONS.Right,
  d: DIRECTIONS.Right
};

const positionKey = (x, y) => `${x}-${y}`;

const useHighScore = () => {
  const [highScore, setHighScore] = useState(0);

  useEffect(() => {
    const savedHighScore = parseInt(localStorage.getItem('snakeHighScore') ?? '0', 10);
    if (!Number.isNaN(savedHighScore)) {
      setHighScore(savedHighScore);
    }
  }, []);

  const updateHighScore = useCallback((score) => {
    setHighScore((prev) => {
      if (score > prev) {
        localStorage.setItem('snakeHighScore', String(score));
        return score;
      }
      return prev;
    });
  }, []);

  return [highScore, updateHighScore];
};

const SnakeApp = ({ onBack }) => {
  const { state, actions } = useSnakeGame({ gridSize: 20, stepMs: 110 });
  const { snake, food, score, status, gameOverReason, gridSize, seed } = state;
  const { setDirection, pause, resume, reset } = actions;
  const [highScore, updateHighScore] = useHighScore();

  useEffect(() => {
    updateHighScore(score);
  }, [score, updateHighScore]);

  const handleReset = useCallback(() => {
    const nextSeed = `${Date.now()}`;
    reset({ seed: nextSeed });
  }, [reset]);

  const handleDirection = useCallback(
    (direction) => {
      if (!direction) {
        return;
      }
      if (status === GameStatus.GameOver || status === GameStatus.Completed) {
        return;
      }
      setDirection(direction);
    },
    [setDirection, status]
  );

  const handleKeyDown = useCallback(
    (event) => {
      const key = event.key.toLowerCase();
      if (key === ' ') {
        event.preventDefault();
        if (status === GameStatus.Running) {
          pause();
        } else if (status === GameStatus.Paused) {
          resume();
        }
        return;
      }
      const direction = KEY_TO_DIRECTION[key];
      if (direction) {
        event.preventDefault();
        handleDirection(direction);
      }
    },
    [handleDirection, pause, resume, status]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const snakeLookup = useMemo(() => {
    const lookup = new Map();
    snake.forEach((segment, index) => {
      lookup.set(positionKey(segment.x, segment.y), index);
    });
    return lookup;
  }, [snake]);

  const gridCells = useMemo(() => {
    const cells = [];
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const key = positionKey(x, y);
        const segmentIndex = snakeLookup.has(key) ? snakeLookup.get(key) : undefined;
        const isSnake = segmentIndex !== undefined;
        const isHead = segmentIndex === 0;
        const isFood = food && food.x === x && food.y === y;
        cells.push(
          <div
            key={key}
            className={`grid-cell ${isSnake ? 'snake' : ''} ${isFood ? 'food' : ''} ${isHead ? 'head' : ''}`}
            style={{ gridColumn: x + 1, gridRow: y + 1 }}
          />
        );
      }
    }
    return cells;
  }, [gridSize, snakeLookup, food]);

  const boardStyle = useMemo(
    () => ({
      gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
      gridTemplateRows: `repeat(${gridSize}, 1fr)`
    }),
    [gridSize]
  );

  const gameStarted = status !== GameStatus.Idle;
  const isGameOver = status === GameStatus.GameOver;
  const isVictory = status === GameStatus.Completed;
  const isPaused = status === GameStatus.Paused;
  const isRunning = status === GameStatus.Running;

  return (
    <div className="snake-app">
      <div className="game-background">
        <div className="grid-pattern"></div>
      </div>

      <div className="app-content">
        <header className="app-header">
          <div className="score-display">
            <div className="score">Score: {score}</div>
            <div className="high-score">High: {highScore}</div>
          </div>
          <div className="meta">
            <span className="meta-item">Seed: {seed}</span>
            <span className={`meta-item status ${status}`}>{status.replace('_', ' ')}</span>
          </div>
        </header>

        <div className="game-container">
          <div className="game-board">
            <div className="grid-container" style={boardStyle}>{gridCells}</div>
          </div>

          <div className="game-controls">
            {!gameStarted && !isGameOver && !isVictory && (
              <div className="start-message">
                <h3>Press any arrow key or WASD to start!</h3>
                <p>Space toggles pause.</p>
              </div>
            )}

            {(isGameOver || isVictory) && (
              <button className="control-btn resume-btn" onClick={handleReset}>
                🔄 Play Again
              </button>
            )}

            {isRunning && (
              <button className="control-btn pause-btn" onClick={pause}>
                ⏸ Pause
              </button>
            )}

            {isPaused && (
              <button className="control-btn resume-btn" onClick={resume}>
                ▶️ Resume
              </button>
            )}

            <button className="control-btn reset-btn" onClick={handleReset}>
              🔄 Reset
            </button>
          </div>

          <div className="game-info">
            <div className="instructions">
              <h3>Controls</h3>
              <div className="control-grid">
                <div className="control-item">↑ W</div>
                <div className="control-item">← A</div>
                <div className="control-item">↓ S</div>
                <div className="control-item">→ D</div>
              </div>
              <p>Use WASD or Arrow Keys to control the snake. Space toggles pause.</p>
            </div>

            {isPaused && (
              <div className="game-over">
                <h2>Game Paused</h2>
                <p>Take a breather, then resume when ready.</p>
              </div>
            )}

            {isGameOver && (
              <div className="game-over">
                <h2>Game Over!</h2>
                <p>Final Score: {score}</p>
                {gameOverReason === 'self' && <p>You ran into yourself — tight turns are risky!</p>}
                {gameOverReason === 'wall' && <p>The arena walls are unforgiving. Plan ahead.</p>}
                {score === highScore && score > 0 && (
                  <p className="new-high-score">🎉 New High Score!</p>
                )}
              </div>
            )}

            {isVictory && (
              <div className="game-over">
                <h2>Perfect Run!</h2>
                <p>You filled the entire board. Legendary!</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SnakeApp;
