import React, { useEffect, useRef, useState, useCallback } from 'react';
import './HexaSnakeApp.css';
import { KEY_DIRECTION_MAP } from './logic/hexSnakeLogic';

const PYODIDE_VERSION = '0.24.1';
const PYODIDE_URL = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/pyodide.js`;
const STUB_PATH = `${process.env.PUBLIC_URL || ''}/hexa-snake/pygame_stub.py`;
const GAME_PATH = `${process.env.PUBLIC_URL || ''}/hexa-snake/hexa_snake_game.py`;

const ensurePyodideScript = () =>
  new Promise((resolve, reject) => {
    if (window.loadPyodide) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = PYODIDE_URL;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Pyodide script'));
    document.body.appendChild(script);
  });

const createKeyListener = (handler) => (event) => {
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  if (!KEY_DIRECTION_MAP[key]) {
    return;
  }

  event.preventDefault();
  handler({ type: event.type, key });
};

const HexaSnakeApp = ({ onBack }) => {
  const canvasRef = useRef(null);
  const pyodideRef = useRef(null);
  const gameRef = useRef(null);
  const animationRef = useRef(null);
  const lastFrameRef = useRef(null);
  const gameOverRef = useRef(false);
  const eventQueueRef = useRef([]);

  const [statusMessage, setStatusMessage] = useState('Loading Python runtime...');
  const [isReady, setIsReady] = useState(false);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [speedLevel, setSpeedLevel] = useState(1);

  const enqueueEvent = useCallback((event) => {
    eventQueueRef.current.push(event);
  }, []);

  useEffect(() => {
    const keyDownListener = createKeyListener((event) => enqueueEvent(event));
    window.addEventListener('keydown', keyDownListener, { passive: false });

    return () => {
      window.removeEventListener('keydown', keyDownListener);
    };
  }, [enqueueEvent]);

  const handleRestart = useCallback(() => {
    if (!gameRef.current) return;
    gameRef.current.reset();
    setScore(0);
    setGameOver(false);
    gameOverRef.current = false;
    setSpeedLevel(1);
    setStatusMessage('Back to work, little bee! Collect that honey.');
  }, []);

  useEffect(() => {
    let cancelled = false;

    const startLoop = () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }

      const stepFrame = (timestamp) => {
        if (!gameRef.current || !pyodideRef.current) {
          return;
        }

        if (!lastFrameRef.current) {
          lastFrameRef.current = timestamp;
        }
        const delta = (timestamp - lastFrameRef.current) / 1000;
        lastFrameRef.current = timestamp;

        const queued = eventQueueRef.current;
        if (queued.length > 0) {
          const pyEvents = pyodideRef.current.toPy(queued.splice(0, queued.length));
          try {
            gameRef.current.handle_events(pyEvents);
          } finally {
            pyEvents.destroy();
          }
        }

        let stateProxy;
        try {
          stateProxy = gameRef.current.step(delta);
        } catch (error) {
          console.error('Hexa-Snake step error', error);
          setStatusMessage('Oops! The bee got stuck. Try reloading.');
          return;
        }

        const state = stateProxy?.toJs({ create_proxies: false });
        stateProxy?.destroy();

        if (!state) {
          animationRef.current = requestAnimationFrame(stepFrame);
          return;
        }

        setScore(state.score);
        setSpeedLevel(state.speed_level);
        setBestScore((prev) => (state.score > prev ? state.score : prev));

        if (state.game_over) {
          if (!gameOverRef.current) {
            gameOverRef.current = true;
            setGameOver(true);
            setStatusMessage('Game over! Press restart to try again.');
          }
        } else if (gameOverRef.current) {
          gameOverRef.current = false;
          setGameOver(false);
          setStatusMessage('Use WASD or Arrow Keys to guide the bee.');
        }

        animationRef.current = requestAnimationFrame(stepFrame);
      };

      animationRef.current = requestAnimationFrame(stepFrame);
    };

    const loadGame = async () => {
      try {
        setStatusMessage('Loading Python runtime...');
        await ensurePyodideScript();
        if (cancelled) return;

        const pyodide = await window.loadPyodide({
          indexURL: `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`,
        });
        if (cancelled) return;
        pyodideRef.current = pyodide;

        pyodide.registerJsModule('bee_bridge', {
          get_events: () => eventQueueRef.current.splice(0, eventQueueRef.current.length),
        });

        setStatusMessage('Fetching bee hive assets...');
        const [stubCode, gameCode] = await Promise.all([
          fetch(STUB_PATH).then((res) => res.text()),
          fetch(GAME_PATH).then((res) => res.text()),
        ]);
        if (cancelled) return;

        if (!pyodide.FS.analyzePath('/hexa_snake').exists) {
          pyodide.FS.mkdir('/hexa_snake');
        }
        pyodide.FS.writeFile('/hexa_snake/pygame_stub.py', stubCode);
        pyodide.FS.writeFile('/hexa_snake/hexa_snake_game.py', gameCode);

        await pyodide.runPythonAsync(`
import sys
sys.path.append('/hexa_snake')
import pygame_stub
pygame_stub.install_stub()
`);
        if (cancelled) return;

        const canvas = canvasRef.current;
        const width = canvas?.width || 720;
        const height = canvas?.height || 640;

        await pyodide.runPythonAsync(`
from hexa_snake_game import HexaSnakeGame
game = HexaSnakeGame(canvas_id='${canvas?.id}', pixel_width=${width}, pixel_height=${height})
`);
        if (cancelled) return;

        gameRef.current = pyodide.globals.get('game');
        setIsReady(true);
        setStatusMessage('Use WASD or Arrow Keys to guide the bee.');
        startLoop();
      } catch (error) {
        console.error('Failed to bootstrap Hexa-Snake', error);
        setStatusMessage('Failed to load Hexa-Snake. Please check your connection.');
      }
    };

    loadGame();

    return () => {
      cancelled = true;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (gameRef.current) {
        try {
          gameRef.current.destroy();
        } catch (error) {
          console.warn('Failed to destroy game proxy', error);
        }
        gameRef.current = null;
      }
      if (pyodideRef.current) {
        try {
          pyodideRef.current.unregisterJsModule?.('bee_bridge');
        } catch (error) {
          console.warn('Failed to unregister bee_bridge', error);
        }
      }
    };
  }, []);

  return (
    <div className="hexa-snake-app">
      <div className="hexa-snake-card">
        <header className="hexa-snake-header">
          <div className="title-block">
            <h1>Hexa-Snake <span className="bee-edition">Bee Edition</span></h1>
            <p className="tagline">Navigate the honeycomb, collect nectar, and avoid your tail!</p>
          </div>
          <div className="header-actions">
            <button className="back-btn" onClick={onBack}>
              ← Back to Apps
            </button>
            <button
              className="restart-btn"
              onClick={handleRestart}
              disabled={!isReady}
            >
              🔄 Restart
            </button>
          </div>
        </header>

        <div className="hexa-snake-body">
          <div className="canvas-wrapper">
            <canvas
              ref={canvasRef}
              id="hex-snake-canvas"
              width="720"
              height="640"
              role="presentation"
            />
            {!isReady && (
              <div className="overlay loading">
                <div className="spinner" />
                <p>{statusMessage}</p>
              </div>
            )}
            {gameOver && isReady && (
              <div className="overlay game-over">
                <h2>Game Over</h2>
                <p>Your bee crashed into the comb.</p>
                <button className="primary" onClick={handleRestart}>
                  Try Again
                </button>
              </div>
            )}
          </div>

          <aside className="info-panel">
            <div className="scoreboard">
              <div className="score-item">
                <span className="label">Score</span>
                <span className="value">{score}</span>
              </div>
              <div className="score-item">
                <span className="label">Best (Session)</span>
                <span className="value">{bestScore}</span>
              </div>
              <div className="score-item">
                <span className="label">Speed Level</span>
                <span className="value">{speedLevel}</span>
              </div>
            </div>

            <div className="status-message">{statusMessage}</div>

            <div className="instructions">
              <h2>Controls</h2>
              <ul>
                <li><span>W / ↑</span> → North</li>
                <li><span>D</span> → North-East</li>
                <li><span>→</span> → South-East</li>
                <li><span>S / ↓</span> → South</li>
                <li><span>A</span> → South-West</li>
                <li><span>←</span> → North-West</li>
              </ul>
              <p>Collect golden honeycombs to grow. Each bite speeds up your flight!</p>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default HexaSnakeApp;
