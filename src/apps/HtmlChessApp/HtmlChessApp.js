import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useStockfishEngine, { NETWORKS, STOCKFISH_BASE_PATH } from './hooks/useStockfishEngine';
import './HtmlChessApp.css';

const QUICK_COMMANDS = [
  { label: 'uci', command: 'uci' },
  { label: 'isready', command: 'isready' },
  { label: 'ucinewgame', command: 'ucinewgame' },
  { label: 'position startpos', command: 'position startpos' },
  { label: 'go depth 12', command: 'go depth 12' },
  { label: 'bench', command: 'bench' },
];

const createLogEntry = (type, text) => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  type,
  text,
  timeLabel: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
});

const HtmlChessApp = () => {
  const logViewportRef = useRef(null);
  const lastStatusRef = useRef('');
  const lastErrorMessageRef = useRef('');
  const autoscrollToggleId = 'html-chess-autoscroll-toggle';
  const [logs, setLogs] = useState(() => [
    createLogEntry(
      'status',
      'Welcome! Load the Stockfish engine to begin analysing positions entirely in your browser.',
    ),
  ]);
  const [command, setCommand] = useState('position startpos');
  const [autoScroll, setAutoScroll] = useState(true);

  const appendEntry = useCallback((type, text) => {
    setLogs((prev) => [...prev, createLogEntry(type, text)]);
  }, []);

  const appendStatus = useCallback((text) => {
    appendEntry('status', text);
  }, [appendEntry]);

  const appendStdout = useCallback((text) => {
    appendEntry('stdout', text);
  }, [appendEntry]);

  const appendStderr = useCallback((text) => {
    appendEntry('stderr', text);
  }, [appendEntry]);

  const appendCommand = useCallback((text) => {
    appendEntry('command', text);
  }, [appendEntry]);

  const {
    loadEngine,
    sendCommand,
    status,
    error,
    loadedNetworks,
    isReady,
    isLoading,
    engine,
  } = useStockfishEngine({
    onMessage: appendStdout,
    onError: appendStderr,
  });

  const recommendedNetwork = useMemo(() => {
    if (!engine || typeof engine.getRecommendedNnue !== 'function') {
      return null;
    }

    try {
      return engine.getRecommendedNnue();
    } catch {
      return null;
    }
  }, [engine]);

  useEffect(() => {
    if (!autoScroll || !logViewportRef.current) {
      return;
    }

    logViewportRef.current.scrollTop = logViewportRef.current.scrollHeight;
  }, [logs, autoScroll]);

  useEffect(() => {
    if (status && status !== lastStatusRef.current) {
      switch (status) {
        case 'loading-engine':
          appendStatus('Fetching Stockfish 17 module…');
          break;
        case 'loading-networks':
          appendStatus('Loading bundled NNUE networks…');
          break;
        case 'ready':
          appendStatus('Stockfish is ready! Try `position startpos` followed by `go depth 12`.');
          break;
        case 'error':
          appendStatus('Engine initialisation failed. Check the asset checklist and try again.');
          break;
        default:
          break;
      }

      lastStatusRef.current = status;
    }
  }, [status, appendStatus]);

  useEffect(() => {
    if (error) {
      const message = error.message || 'Unknown engine error';

      if (message !== lastErrorMessageRef.current) {
        appendStderr(message);
        lastErrorMessageRef.current = message;
      }
    } else {
      lastErrorMessageRef.current = '';
    }
  }, [error, appendStderr]);

  const handleLoadEngine = useCallback(async () => {
    try {
      await loadEngine();
    } catch {
      // Errors are already captured via hook state.
    }
  }, [loadEngine]);

  const handleSendCommand = useCallback(() => {
    const trimmed = command.trim();

    if (!trimmed) {
      return;
    }

    appendCommand(`› ${trimmed}`);

    try {
      sendCommand(trimmed);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send command.';
      appendStderr(message);
    }
  }, [appendCommand, appendStderr, command, sendCommand]);

  const handleKeyDown = useCallback(
    (event) => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleSendCommand();
      }
    },
    [handleSendCommand],
  );

  return (
    <div className="html-chess-app">
      <div className="html-chess-shell">
        <header className="html-chess-header">
          <div>
            <h1>HTML Chess Lab</h1>
            <p>
              Load the Stockfish 17 engine compiled to WebAssembly, stream analysis output in real time, and experiment with UCI
              commands without leaving the browser.
            </p>
          </div>
          <div className="html-chess-header-actions">
            <button
              type="button"
              className="html-chess-primary-button"
              onClick={handleLoadEngine}
              disabled={isLoading || isReady}
            >
              {isReady ? 'Engine Ready' : isLoading ? 'Loading…' : 'Load Stockfish'}
            </button>
            <label className="html-chess-autoscroll-toggle" htmlFor={autoscrollToggleId}>
              <input
                id={autoscrollToggleId}
                type="checkbox"
                checked={autoScroll}
                onChange={(event) => setAutoScroll(event.target.checked)}
              />
              Auto-scroll log
            </label>
          </div>
        </header>

        <div className="html-chess-grid">
          <section className="html-chess-card html-chess-status-card">
            <h2>Engine Status</h2>
            <div className={`html-chess-status-pill html-chess-status-pill--${status || 'idle'}`}>
              {status === 'ready'
                ? 'Ready'
                : status === 'loading-engine'
                  ? 'Loading engine'
                  : status === 'loading-networks'
                    ? 'Loading networks'
                    : status === 'error'
                      ? 'Error'
                      : 'Idle'}
            </div>
            <p className="html-chess-help-text">
              Assets must live under <code>{STOCKFISH_BASE_PATH}/</code>. Upload the two NNUE files and <code>sf171-79.wasm</code>
              to this directory.
            </p>
            <ul className="html-chess-asset-list">
              <li>
                <span className={loadedNetworks.includes('mainline') ? 'loaded' : ''}>nn-1c0000000000.nnue</span>
              </li>
              <li>
                <span className={loadedNetworks.includes('balanced-small') ? 'loaded' : ''}>nn-37f18f62d772.nnue</span>
              </li>
              <li>
                <span className={status === 'ready' ? 'loaded' : ''}>sf171-79.wasm</span>
              </li>
            </ul>
            {recommendedNetwork && (
              <p className="html-chess-help-text">
                Recommended NNUE: <code>{recommendedNetwork}</code>
              </p>
            )}
            {loadedNetworks.length > 0 && (
              <div className="html-chess-network-summary">
                {NETWORKS.map((network) => (
                  <article key={network.id} className="html-chess-network-pill">
                    <span className={`dot ${loadedNetworks.includes(network.id) ? 'dot-loaded' : ''}`} />
                    <div>
                      <h3>{network.label}</h3>
                      <p>{network.description}</p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <section className="html-chess-card html-chess-log-card">
            <div className="html-chess-log-header">
              <h2>Engine Stream</h2>
            </div>
            <div className="html-chess-log-viewport" ref={logViewportRef}>
              {logs.map((entry) => (
                <div key={entry.id} className={`html-chess-log-entry html-chess-log-entry--${entry.type}`}>
                  <span className="html-chess-log-time">{entry.timeLabel}</span>
                  <span className="html-chess-log-text">{entry.text}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="html-chess-card html-chess-command-card">
          <div className="html-chess-command-header">
            <h2>Send UCI Command</h2>
            <div className="html-chess-command-actions">
              {QUICK_COMMANDS.map((quick) => (
                <button
                  type="button"
                  key={quick.command}
                  className="html-chess-secondary-button"
                  onClick={() => {
                    setCommand(quick.command);
                    if (isReady) {
                      appendCommand(`› ${quick.command}`);
                      try {
                        sendCommand(quick.command);
                      } catch (err) {
                        const message = err instanceof Error ? err.message : 'Failed to send command.';
                        appendStderr(message);
                      }
                    }
                  }}
                  disabled={!isReady}
                >
                  {quick.label}
                </button>
              ))}
            </div>
          </div>
          <textarea
            value={command}
            onChange={(event) => setCommand(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isReady ? 'Enter a UCI command…' : 'Load the engine to start sending commands.'}
            rows={3}
          />
          <div className="html-chess-command-footer">
            <button
              type="button"
              className="html-chess-primary-button"
              onClick={handleSendCommand}
              disabled={!command.trim() || !isReady}
            >
              Send command
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default HtmlChessApp;
