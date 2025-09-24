import React, { useEffect, useMemo, useRef, useState } from 'react';
import './SnakeCreativeApp.css';
import {
  DIRECTIONS,
  MODE_DEFINITIONS,
  MODE_LIST,
  DEFAULT_CANVAS_SIZE,
  MIN_CANVAS_SIZE
} from './constants';
import { THEME_LIST, getTheme } from './themePresets';
import { useSnakeCreativeGame } from './useSnakeCreativeGame';

const KEY_DIRECTION_MAP = {
  arrowup: DIRECTIONS.Up,
  arrowdown: DIRECTIONS.Down,
  arrowleft: DIRECTIONS.Left,
  arrowright: DIRECTIONS.Right,
  w: DIRECTIONS.Up,
  s: DIRECTIONS.Down,
  a: DIRECTIONS.Left,
  d: DIRECTIONS.Right
};

const formatNumber = (value) =>
  value.toLocaleString(undefined, {
    maximumFractionDigits: 0
  });

const cx = (...inputs) =>
  inputs
    .flatMap((input) => {
      if (!input) {
        return [];
      }
      if (typeof input === 'string') {
        return [input];
      }
      if (Array.isArray(input)) {
        return input.filter(Boolean);
      }
      if (typeof input === 'object') {
        return Object.entries(input)
          .filter(([, value]) => Boolean(value))
          .map(([key]) => key);
      }
      return [];
    })
    .join(' ');

const ModeCard = ({ mode, isActive, onSelect }) => (
  <button
    type="button"
    className={cx('snake20-mode-card', { active: isActive })}
    onClick={() => onSelect(mode.id)}
  >
    <div className="mode-title">{mode.name}</div>
    <div className="mode-tagline">{mode.tagline}</div>
    <div className="mode-meta">
      <span>{mode.players === 2 ? '2P local' : 'Solo'}</span>
      <span>{mode.wrap ? 'Wrap' : 'Walls'}</span>
      {mode.hazards ? <span>Hazards</span> : null}
    </div>
  </button>
);

const PlayerBadge = ({ player }) => (
  <div className={cx('player-badge', { faint: !player.alive })}>
    <div className="player-name">{player.name}</div>
    <div className="player-metrics">
      <span>{formatNumber(player.score)} pts</span>
      <span>len {player.length}</span>
      <span>x{player.combo}</span>
    </div>
  </div>
);

const ThemeButton = ({ option, isActive, onSelect }) => (
  <button
    type="button"
    className={cx('theme-chip', { active: isActive })}
    onClick={() => onSelect(option.id)}
  >
    <span className="chip-swatch" style={{ background: option.palette.snakeBody[0] }} />
    <span>{option.name}</span>
  </button>
);

const ControlsLegend = ({ mode }) => (
  <div className="controls-legend">
    <div className="legend-title">Controls</div>
    <div className="legend-grid">
      <div className="legend-group">
        <div className="legend-heading">Player One</div>
        <div className="legend-keys">↑ ↓ ← → or WASD</div>
      </div>
      {mode.players === 2 ? (
        <div className="legend-group">
          <div className="legend-heading">Player Two</div>
          <div className="legend-keys">WASD</div>
        </div>
      ) : null}
      <div className="legend-group">
        <div className="legend-heading">Space</div>
        <div className="legend-keys">Pause / Resume</div>
      </div>
    </div>
  </div>
);

const StatusBanner = ({ state }) => {
  if (state.status === 'running') {
    return null;
  }
  let label = state.message;
  if (state.status === 'paused') {
    label = 'Paused';
  }
  if (state.status === 'game-over') {
    label = 'Game Over';
  }
  return <div className="status-banner">{label}</div>;
};

const useResponsiveCanvasSize = () => {
  const containerRef = useRef(null);
  const [size, setSize] = useState(DEFAULT_CANVAS_SIZE);

  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) {
        return;
      }
      const width = containerRef.current.clientWidth;
      const next = clampCanvasSize(width);
      setSize(next);
    };
    updateSize();
    if (typeof window === 'undefined' || typeof window.ResizeObserver === 'undefined') {
      return undefined;
    }
    const observer = new window.ResizeObserver(updateSize);
    const element = containerRef.current;
    if (element) {
      observer.observe(element);
    }
    return () => {
      if (element) {
        observer.unobserve(element);
      }
      observer.disconnect();
    };
  }, []);

  return [containerRef, size];
};

const clampCanvasSize = (value) => {
  if (!value || Number.isNaN(value)) {
    return DEFAULT_CANVAS_SIZE;
  }
  return Math.max(MIN_CANVAS_SIZE, Math.min(DEFAULT_CANVAS_SIZE, Math.floor(value)));
};

const SnakeCreativeApp = ({ onBack }) => {
  const [themeId, setThemeId] = useState('neon');
  const [modeId, setModeId] = useState('classic');
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [containerRef, canvasSize] = useResponsiveCanvasSize();
  const floatingScoreRef = useRef(null);

  const theme = useMemo(() => getTheme(themeId), [themeId]);
  const mode = useMemo(() => MODE_DEFINITIONS[modeId] ?? MODE_DEFINITIONS.classic, [modeId]);

  const { canvasRef, state, actions } = useSnakeCreativeGame({
    themeId,
    modeId,
    canvasSize,
    floatingScoreRef,
    audioEnabled
  });

  useEffect(() => {
    const handleKeyDown = (event) => {
      const key = event.key.toLowerCase();
      if (key === ' ') {
        event.preventDefault();
        actions.togglePause();
        return;
      }
      if (key === 'enter') {
        actions.start();
        return;
      }
      const direction = KEY_DIRECTION_MAP[key];
      if (!direction) {
        return;
      }
      if (mode.players === 2) {
        if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
          actions.setDirection('alpha', direction);
        } else if (['w', 'a', 's', 'd'].includes(key)) {
          actions.setDirection('beta', direction);
        }
      } else {
        actions.setDirection('solo', direction);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [actions, mode.players]);

  const cycleTheme = () => {
    const index = THEME_LIST.findIndex((item) => item.id === themeId);
    const next = THEME_LIST[(index + 1) % THEME_LIST.length];
    setThemeId(next.id);
  };

  const cycleMode = () => {
    const index = MODE_LIST.findIndex((item) => item.id === modeId);
    const next = MODE_LIST[(index + 1) % MODE_LIST.length];
    setModeId(next.id);
  };

  return (
    <div className="snake20-app" data-theme={themeId}>
      <div className="snake20-backdrop" />
      <div className="snake20-content">
        <header className="snake20-header">
          <div className="header-left">
            {onBack ? (
              <button type="button" className="soft-button" onClick={onBack}>
                ← Back
              </button>
            ) : null}
            <div className="title-stack">
              <h1>Snake 2.0</h1>
              <span className="subtitle">Creative neon-to-garden-to-minimal reinterpretation</span>
            </div>
          </div>
          <div className="header-right">
            <button type="button" className="soft-button" onClick={cycleMode}>
              Mode · {mode.name}
            </button>
            <button type="button" className="soft-button" onClick={cycleTheme}>
              Theme · {theme.name}
            </button>
            <button
              type="button"
              className={cx('soft-button', { muted: !audioEnabled })}
              onClick={() => setAudioEnabled((value) => !value)}
            >
              {audioEnabled ? '🔊 Audio' : '🔇 Audio'}
            </button>
          </div>
        </header>

        <main className="snake20-main">
          <aside className="snake20-sidebar">
            <section className="sidebar-card">
              <h2>Themes</h2>
              <p>{theme.description}</p>
              <div className="theme-list">
                {THEME_LIST.map((option) => (
                  <ThemeButton key={option.id} option={option} isActive={option.id === themeId} onSelect={setThemeId} />
                ))}
              </div>
            </section>
            <section className="sidebar-card">
              <h2>Modes</h2>
              <div className="mode-grid">
                {MODE_LIST.map((modeOption) => (
                  <ModeCard
                    key={modeOption.id}
                    mode={modeOption}
                    isActive={modeOption.id === modeId}
                    onSelect={setModeId}
                  />
                ))}
              </div>
            </section>
            <section className="sidebar-card">
              <h2>Session</h2>
              <div className="session-metrics">
                <div>
                  <span className="label">Score</span>
                  <span className="value">{formatNumber(state.score)}</span>
                </div>
                <div>
                  <span className="label">High</span>
                  <span className="value">{formatNumber(state.highScore)}</span>
                </div>
                <div>
                  <span className="label">Combo</span>
                  <span className="value">×{state.combo}</span>
                </div>
                <div>
                  <span className="label">Best Combo</span>
                  <span className="value">×{state.bestCombo}</span>
                </div>
                <div>
                  <span className="label">Length</span>
                  <span className="value">{state.length}</span>
                </div>
              </div>
              {state.players?.length ? (
                <div className="players-list">
                  {state.players.map((player) => (
                    <PlayerBadge key={player.id} player={player} />
                  ))}
                </div>
              ) : null}
            </section>
            <section className="sidebar-card">
              <ControlsLegend mode={mode} />
            </section>
          </aside>

          <section className="snake20-stage">
            <div className="stage-frame" ref={containerRef}>
              <canvas ref={canvasRef} className="snake20-canvas" />
              <div className="snake20-hud snake20-hud--top">
                <div className="hud-pill">
                  <span>Score</span>
                  <strong>{formatNumber(state.score)}</strong>
                </div>
                <div className="hud-pill">
                  <span>High</span>
                  <strong>{formatNumber(state.highScore)}</strong>
                </div>
                <div className="hud-pill">
                  <span>Combo</span>
                  <strong>×{state.combo}</strong>
                </div>
              </div>
              <div className="snake20-hud snake20-hud--bottom">
                <div className="hud-pill">
                  <span>Length</span>
                  <strong>{state.length}</strong>
                </div>
                <div className="hud-pill">
                  <span>Best Combo</span>
                  <strong>×{state.bestCombo}</strong>
                </div>
                <div className="hud-pill">
                  <span>Status</span>
                  <strong>{state.status}</strong>
                </div>
              </div>
              <div className="floating-score" ref={floatingScoreRef}>
                <span>×{state.combo}</span>
              </div>
              <StatusBanner state={state} />
              <div className="stage-actions">
                <button type="button" onClick={actions.start} className="primary-action">
                  ▶ Start
                </button>
                <button type="button" onClick={actions.togglePause} className="secondary-action">
                  {state.status === 'running' ? '⏸ Pause' : '▶ Resume'}
                </button>
                <button type="button" onClick={() => actions.reset({ preserveAudio: true })} className="secondary-action">
                  🔄 Reset
                </button>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
};

export default SnakeCreativeApp;
