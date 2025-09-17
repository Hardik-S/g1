import React, { useCallback, useEffect, useRef, useState } from 'react';
import './PongRingApp.css';
import {
  DEFAULT_OPTIONS,
  createInitialState,
  createInputState,
  stepGame,
  computeAiInput,
} from './gameLogic';

const FULL_CIRCLE = Math.PI * 2;
const CANVAS_SIZE = DEFAULT_OPTIONS.boardSize;

function drawGrid(ctx, size) {
  ctx.save();
  ctx.strokeStyle = 'rgba(147, 197, 253, 0.08)';
  ctx.lineWidth = 1;
  const spacing = 36;
  for (let x = spacing; x < size; x += spacing) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, size);
    ctx.stroke();
  }
  for (let y = spacing; y < size; y += spacing) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y);
    ctx.stroke();
  }
  ctx.restore();
}

function drawBoard(ctx, state) {
  const { options, center } = state;
  ctx.save();
  const gradient = ctx.createRadialGradient(
    center.x,
    center.y,
    options.radius * 0.3,
    center.x,
    center.y,
    options.radius
  );
  gradient.addColorStop(0, 'rgba(253, 253, 253, 0.18)');
  gradient.addColorStop(1, 'rgba(209, 213, 219, 0.05)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(center.x, center.y, options.radius, 0, FULL_CIRCLE);
  ctx.fill();

  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(147, 197, 253, 0.35)';
  ctx.shadowBlur = 14;
  ctx.shadowColor = 'rgba(147, 197, 253, 0.35)';
  ctx.stroke();
  ctx.restore();
}

function drawPaddle(ctx, state, paddle, color) {
  const { options, center } = state;
  const arc = paddle.arc ?? options.paddleArc;
  const startAngle = paddle.angle - arc / 2;
  const endAngle = paddle.angle + arc / 2;

  ctx.save();
  ctx.lineWidth = 16;
  ctx.lineCap = 'round';
  ctx.strokeStyle = color;
  ctx.shadowBlur = 20;
  ctx.shadowColor = color;
  ctx.beginPath();
  ctx.arc(center.x, center.y, options.radius - 10, startAngle, endAngle, false);
  ctx.stroke();
  ctx.restore();
}

function drawBall(ctx, state) {
  const { ball, options } = state;
  if (!ball) {
    return;
  }

  ctx.save();
  const glow = ctx.createRadialGradient(
    ball.x - options.ballRadius / 2,
    ball.y - options.ballRadius / 2,
    options.ballRadius / 4,
    ball.x,
    ball.y,
    options.ballRadius
  );
  glow.addColorStop(0, 'rgba(253, 253, 253, 0.92)');
  glow.addColorStop(1, 'rgba(147, 197, 253, 0.25)');
  ctx.fillStyle = glow;
  ctx.shadowBlur = 18;
  ctx.shadowColor = 'rgba(147, 197, 253, 0.55)';
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, options.ballRadius, 0, FULL_CIRCLE);
  ctx.fill();
  ctx.restore();
}

function renderScene(ctx, state) {
  const size = state.options.boardSize;
  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.fillStyle = '#1f2937';
  ctx.fillRect(0, 0, size, size);
  drawGrid(ctx, size);
  drawBoard(ctx, state);
  drawPaddle(ctx, state, state.paddles.player1, 'rgba(147, 197, 253, 0.85)');
  drawPaddle(ctx, state, state.paddles.player2, 'rgba(56, 189, 248, 0.85)');
  drawBall(ctx, state);
  ctx.restore();
}

function useKeyboardControls(active, inputRef) {
  useEffect(() => {
    if (!active) {
      inputRef.current.player1 = 0;
      inputRef.current.player2 = 0;
      return undefined;
    }

    const handleKeyDown = (event) => {
      const key = event.key;
      if (key === 'ArrowUp' || key === 'ArrowDown') {
        event.preventDefault();
      }
      switch (key) {
        case 'w':
        case 'W':
          inputRef.current.player1 = -1;
          break;
        case 's':
        case 'S':
          inputRef.current.player1 = 1;
          break;
        case 'ArrowUp':
          inputRef.current.player2 = 1;
          break;
        case 'ArrowDown':
          inputRef.current.player2 = -1;
          break;
        default:
          break;
      }
    };

    const handleKeyUp = (event) => {
      switch (event.key) {
        case 'w':
        case 'W':
        case 's':
        case 'S':
          inputRef.current.player1 = 0;
          break;
        case 'ArrowUp':
        case 'ArrowDown':
          inputRef.current.player2 = 0;
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [active, inputRef]);
}

const PongRingApp = () => {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const animationFrameRef = useRef(null);
  const lastTimestampRef = useRef(null);
  const gameStateRef = useRef(null);
  const inputRef = useRef(createInputState());

  const [view, setView] = useState('menu');
  const [mode, setMode] = useState(null);
  const [scores, setScores] = useState({ player1: 0, player2: 0 });
  const [winner, setWinner] = useState(null);

  useKeyboardControls(view === 'game', inputRef);

  useEffect(() => {
    // Re-run the canvas prep whenever the view changes so the context exists before we render.
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const ratio = window.devicePixelRatio || 1;
    if (canvas.width !== CANVAS_SIZE * ratio || canvas.height !== CANVAS_SIZE * ratio) {
      canvas.width = CANVAS_SIZE * ratio;
      canvas.height = CANVAS_SIZE * ratio;
    }
    canvas.style.width = `${CANVAS_SIZE}px`;
    canvas.style.height = `${CANVAS_SIZE}px`;

    const ctx = canvas.getContext('2d');
    // Reset the transform each time so repeated mounts do not compound scaling factors.
    if (typeof ctx.setTransform === 'function') {
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    } else {
      ctx.scale(ratio, ratio);
    }
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    contextRef.current = ctx;

    // Draw a clean background immediately so the arena is visible before the loop starts.
    ctx.fillStyle = '#1f2937';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  }, [view]);

  const startGame = useCallback((selectedMode) => {
    const state = createInitialState({ mode: selectedMode });
    gameStateRef.current = state;
    inputRef.current = createInputState();
    lastTimestampRef.current = null;
    setScores({ player1: 0, player2: 0 });
    setWinner(null);
    setMode(selectedMode);
    setView('game');

    const ctx = contextRef.current;
    if (ctx) {
      renderScene(ctx, state);
    }
  }, []);

  const stopAnimation = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  const returnToMenu = useCallback(() => {
    stopAnimation();
    setView('menu');
    setMode(null);
    setWinner(null);
    gameStateRef.current = null;
    inputRef.current = createInputState();
  }, [stopAnimation]);

  useEffect(() => {
    if (view !== 'game') {
      stopAnimation();
      return undefined;
    }

    const ctx = contextRef.current;
    const state = gameStateRef.current;
    if (!ctx || !state) {
      return undefined;
    }

    const loop = (timestamp) => {
      const previous = lastTimestampRef.current ?? timestamp;
      const delta = (timestamp - previous) / 1000;
      lastTimestampRef.current = timestamp;

      const inputs = { ...inputRef.current };
      if (state.mode === 'single') {
        inputs.player2 = computeAiInput(state, delta);
      }

      const events = stepGame(state, inputs, delta);
      if (events.length) {
        events.forEach((event) => {
          if (event.type === 'score') {
            setScores(event.scores);
          }
          if (event.type === 'win') {
            setWinner(event.winner);
            setView('win');
          }
        });
      }

      renderScene(ctx, state);

      if (state.isRunning) {
        animationFrameRef.current = requestAnimationFrame(loop);
      }
    };

    animationFrameRef.current = requestAnimationFrame(loop);
    return () => {
      stopAnimation();
    };
  }, [view, stopAnimation]);

  const playAgain = useCallback(() => {
    if (mode) {
      startGame(mode);
    } else {
      returnToMenu();
    }
  }, [mode, returnToMenu, startGame]);

  const renderWinnerTitle = () => {
    if (!winner) {
      return null;
    }
    const label = mode === 'single' && winner === 'player2' ? 'AI' : winner === 'player1' ? 'Player 1' : 'Player 2';
    return `${label} Wins`;
  };

  return (
    <div className="pong-ring" data-view={view}>
      {view === 'menu' && (
        <div className="pong-ring__menu">
          <h1 className="pong-ring__title">Pong Ring</h1>
          <p className="pong-ring__subtitle">Futuristic quartz-bound pong inside a luminous ring.</p>
          <div className="pong-ring__menu-options">
            <button type="button" onClick={() => startGame('single')}>
              1 Player vs AI
            </button>
            <button type="button" onClick={() => startGame('versus')}>
              2 Player Local
            </button>
          </div>
          <div className="pong-ring__tips">
            <span>Player 1: W / S (clockwise / counterclockwise)</span>
            <span>Player 2: ↑ / ↓ (clockwise / counterclockwise)</span>
          </div>
        </div>
      )}

      {(view === 'game' || view === 'win') && (
        <div className="pong-ring__stage">
          <canvas ref={canvasRef} className="pong-ring__canvas" />
          <div className="pong-ring__hud">
            <div className="pong-ring__scoreboard">
              <div className="pong-ring__score pong-ring__score--p1">
                <span className="label">Player 1</span>
                <span className="value">{scores.player1}</span>
              </div>
              <div className="pong-ring__mode">{mode === 'single' ? 'vs AI' : 'Local Versus'}</div>
              <div className="pong-ring__score pong-ring__score--p2">
                <span className="label">{mode === 'single' ? 'AI' : 'Player 2'}</span>
                <span className="value">{scores.player2}</span>
              </div>
            </div>
            <div className="pong-ring__controls">
              <span>W/S</span>
              <span className="divider" />
              <span>↑/↓</span>
            </div>
          </div>

          {view === 'win' && (
            <div className="pong-ring__overlay">
              <h2>{renderWinnerTitle()}</h2>
              <p>First to three points claims the quartz crown.</p>
              <div className="pong-ring__overlay-actions">
                <button type="button" onClick={playAgain}>
                  Play Again
                </button>
                <button type="button" onClick={returnToMenu}>
                  Back to Menu
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PongRingApp;
