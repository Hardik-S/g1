import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './PongApp.css';
import {
  createInitialState,
  stepGame,
  createInputState,
  DEFAULT_OPTIONS,
} from './gameLogic';

const CANVAS_WIDTH = DEFAULT_OPTIONS.width;
const CANVAS_HEIGHT = DEFAULT_OPTIONS.height;

function drawGame(ctx, state, opponentName = 'Player 2') {
  const { bounds, options, balls, paddles, isPaused, winner } = state;
  ctx.clearRect(0, 0, bounds.width, bounds.height);

  const background = ctx.createLinearGradient(0, 0, bounds.width, bounds.height);
  background.addColorStop(0, '#050422');
  background.addColorStop(1, '#120029');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, bounds.width, bounds.height);

  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  ctx.lineWidth = 2;
  ctx.setLineDash([12, 16]);
  ctx.beginPath();
  ctx.moveTo(bounds.width / 2, 0);
  ctx.lineTo(bounds.width / 2, bounds.height);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.shadowBlur = 28;
  ctx.shadowColor = '#39f3ff';
  ctx.fillStyle = '#39f3ff';
  ctx.fillRect(paddles.left.x, paddles.left.y, options.paddleWidth, options.paddleHeight);
  ctx.restore();

  ctx.save();
  ctx.shadowBlur = 28;
  ctx.shadowColor = '#ff74ff';
  ctx.fillStyle = '#ff74ff';
  ctx.fillRect(paddles.right.x, paddles.right.y, options.paddleWidth, options.paddleHeight);
  ctx.restore();

  balls.forEach(ball => {
    ctx.save();
    const ballGlow = ctx.createRadialGradient(ball.x, ball.y, 2, ball.x, ball.y, ball.radius * 3.2);
    ballGlow.addColorStop(0, '#fefefe');
    ballGlow.addColorStop(0.6, 'rgba(255, 255, 255, 0.8)');
    ballGlow.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = ballGlow;
    ctx.shadowBlur = 25;
    ctx.shadowColor = '#fefae0';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  if (winner) {
    ctx.save();
    ctx.fillStyle = 'rgba(7, 5, 24, 0.35)';
    ctx.fillRect(0, 0, bounds.width, bounds.height);
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 26px "Inter", "Helvetica Neue", sans-serif';
    ctx.textAlign = 'center';
    const winnerLabel = winner === 'left' ? 'Player 1' : opponentName;
    ctx.fillText(`${winnerLabel} Wins!`, bounds.width / 2, bounds.height / 2 - 10);
    ctx.font = '400 16px "Inter", "Helvetica Neue", sans-serif';
    ctx.fillText('Press R to restart', bounds.width / 2, bounds.height / 2 + 18);
    ctx.restore();
  } else if (isPaused) {
    ctx.save();
    ctx.fillStyle = 'rgba(7, 5, 24, 0.35)';
    ctx.fillRect(0, 0, bounds.width, bounds.height);
    ctx.fillStyle = '#ffffff';
    ctx.font = '600 26px "Inter", "Helvetica Neue", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Paused', bounds.width / 2, bounds.height / 2 - 10);
    ctx.font = '400 16px "Inter", "Helvetica Neue", sans-serif';
    ctx.fillText('Press space to resume', bounds.width / 2, bounds.height / 2 + 18);
    ctx.restore();
  }
}

const PongApp = () => {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const animationRef = useRef(null);
  const stateRef = useRef(null);
  const inputRef = useRef(createInputState());
  const baseOptionsRef = useRef(null);

  const [score, setScore] = useState({ left: 0, right: 0 });
  const [isPaused, setIsPaused] = useState(false);
  const [mode, setMode] = useState('cpu');
  const [krazyMode, setKrazyMode] = useState(false);
  const [targetScore, setTargetScore] = useState(DEFAULT_OPTIONS.winScore);
  const [winner, setWinner] = useState(null);

  const opponentLabel = useMemo(() => {
    if (mode === 'pvp') {
      return 'Player 2';
    }
    if (mode === 'cpu-slow') {
      return 'Slow CPU';
    }
    return 'CPU';
  }, [mode]);

  const opponentNameRef = useRef(opponentLabel);
  const hasAppliedSettingsRef = useRef(false);

  const buildOptions = useCallback(() => {
    const winScore = krazyMode ? DEFAULT_OPTIONS.krazyWinScore : DEFAULT_OPTIONS.winScore;
    const aiDelay = mode === 'cpu-slow' ? 0.3 : 0;
    return {
      krazyMode,
      winScore,
      aiDelay,
    };
  }, [krazyMode, mode]);

  const initialiseState = useCallback(() => {
    const context = ctxRef.current;
    if (!context) {
      return;
    }
    const options = buildOptions();
    const next = createInitialState(options);
    baseOptionsRef.current = next.options;
    stateRef.current = next;
    setScore({ ...next.scores });
    setIsPaused(next.isPaused);
    setTargetScore(next.options.winScore);
    setWinner(next.winner);
    drawGame(context, next, opponentNameRef.current);
  }, [buildOptions]);

  const resetGame = useCallback(() => {
    inputRef.current.left = 0;
    inputRef.current.right = 0;
    inputRef.current.pausePressed = false;
    inputRef.current.aiDelay = mode === 'cpu-slow' ? 0.3 : 0;
    initialiseState();
  }, [initialiseState, mode]);

  const togglePause = useCallback(() => {
    inputRef.current.pausePressed = true;
  }, []);

  const cycleMode = useCallback(() => {
    setMode(prev => {
      if (prev === 'cpu') {
        return 'cpu-slow';
      }
      if (prev === 'cpu-slow') {
        return 'pvp';
      }
      return 'cpu';
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }
    const context = canvas.getContext('2d');
    ctxRef.current = context;

    const options = buildOptions();
    const initial = createInitialState(options);
    baseOptionsRef.current = initial.options;
    stateRef.current = initial;
    setScore({ ...initial.scores });
    setIsPaused(initial.isPaused);
    setTargetScore(initial.options.winScore);
    setWinner(initial.winner);
    drawGame(context, initial, opponentNameRef.current);

    let lastTime = null;
    const loop = (time) => {
      if (lastTime === null) {
        lastTime = time;
      }
      const delta = (time - lastTime) / 1000;
      lastTime = time;

      if (!stateRef.current) {
        return;
      }

      const { state, events } = stepGame(stateRef.current, inputRef.current, delta);
      stateRef.current = state;
      drawGame(context, state, opponentNameRef.current);

      events.forEach(event => {
        if (event.type === 'score') {
          setScore(event.scores);
        } else if (event.type === 'pause') {
          setIsPaused(event.isPaused);
        } else if (event.type === 'win') {
          setWinner(event.winner);
          setIsPaused(true);
        }
      });

      animationRef.current = requestAnimationFrame(loop);
    };

    animationRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [buildOptions]);

  useEffect(() => {
    opponentNameRef.current = opponentLabel;
  }, [opponentLabel]);

  useEffect(() => {
    inputRef.current.usesAi = mode !== 'pvp';
    inputRef.current.aiDelay = mode === 'cpu-slow' ? 0.3 : 0;
    if (mode !== 'pvp') {
      inputRef.current.right = 0;
    }
  }, [mode]);

  useEffect(() => {
    if (!hasAppliedSettingsRef.current) {
      hasAppliedSettingsRef.current = true;
      return;
    }
    resetGame();
  }, [mode, krazyMode, resetGame]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      const key = event.key.toLowerCase();
      if (key === 'w') {
        inputRef.current.left = -1;
      } else if (key === 's') {
        inputRef.current.left = 1;
      } else if (key === 'arrowup' && mode === 'pvp') {
        inputRef.current.right = -1;
      } else if (key === 'arrowdown' && mode === 'pvp') {
        inputRef.current.right = 1;
      } else if (key === ' ') {
        event.preventDefault();
        inputRef.current.pausePressed = true;
      } else if (key === 'r') {
        event.preventDefault();
        resetGame();
      } else if (key === 'k') {
        event.preventDefault();
        setKrazyMode(prev => !prev);
      } else if (key === 'c') {
        event.preventDefault();
        setMode('cpu');
      } else if (key === 'p') {
        event.preventDefault();
        setMode('pvp');
      } else if (key === 'x') {
        event.preventDefault();
        setMode('cpu-slow');
      }
    };

    const handleKeyUp = (event) => {
      const key = event.key.toLowerCase();
      if (key === 'w' && inputRef.current.left < 0) {
        inputRef.current.left = 0;
      } else if (key === 's' && inputRef.current.left > 0) {
        inputRef.current.left = 0;
      } else if (key === 'arrowup' && mode === 'pvp' && inputRef.current.right < 0) {
        inputRef.current.right = 0;
      } else if (key === 'arrowdown' && mode === 'pvp' && inputRef.current.right > 0) {
        inputRef.current.right = 0;
      }
    };

    const handleBlur = () => {
      inputRef.current.left = 0;
      inputRef.current.right = 0;
      if (stateRef.current && !stateRef.current.isPaused) {
        inputRef.current.pausePressed = true;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [mode, resetGame]);

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <div className="pong-app">
      <div className="pong-app__scoreboard">
        <div className="pong-app__score">
          <span>Player 1</span>
          <strong>{score.left}</strong>
        </div>
        <div className="pong-app__controls">
          <span className="pong-app__status">
            {winner ? `${winner === 'left' ? 'Player 1' : opponentLabel} wins` : isPaused ? 'Paused' : 'In play'}
          </span>
          <span className="pong-app__status">First to {targetScore}</span>
          <span className="pong-app__status">{krazyMode ? 'Krazy Mode' : 'Classic Mode'}</span>
          <div className="pong-app__button-row">
            <button className="pong-app__button" type="button" onClick={togglePause}>
              {isPaused ? 'Resume' : 'Pause'}
            </button>
            <button className="pong-app__button" type="button" onClick={resetGame}>
              Restart
            </button>
            <button className="pong-app__button" type="button" onClick={cycleMode}>
              {mode === 'cpu'
                ? 'Switch to Slow CPU'
                : mode === 'cpu-slow'
                ? 'Switch to 2 players'
                : 'Switch to CPU'}
            </button>
            <button
              className="pong-app__button"
              type="button"
              onClick={() => setKrazyMode(prev => !prev)}
            >
              {krazyMode ? 'Disable Krazy Mode' : 'Enable Krazy Mode'}
            </button>
          </div>
        </div>
        <div className="pong-app__score">
          <span>{opponentLabel}</span>
          <strong>{score.right}</strong>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        className="pong-app__canvas"
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        role="presentation"
        aria-hidden="true"
      />
      <p className="pong-app__note">
        Controls: W/S for Player 1 • Arrow keys for Player 2 • Space toggles pause • R restarts the match •
        C for CPU • X for slow CPU • P for 2 players • K toggles Krazy Mode
      </p>
    </div>
  );
};

export default PongApp;
