import { useCallback, useRef, useState } from 'react';

export const STOCKFISH_BASE_PATH = '/apps/htmlChess';
export const STOCKFISH_ENTRYPOINT = `${STOCKFISH_BASE_PATH}/sf171-79.js`;

export const NETWORKS = [
  {
    id: 'mainline',
    filename: 'nn-1c0000000000.nnue',
    label: 'Mainline 1c0000000000',
    description: 'Balanced evaluation network tuned for standard play.',
  },
  {
    id: 'balanced-small',
    filename: 'nn-37f18f62d772.nnue',
    label: 'Slim 37f18f62d772',
    description: 'Lightweight network optimised for smaller memory budgets.',
  },
];

const normalizeModule = (module) => {
  if (module && typeof module === 'object' && 'default' in module) {
    return module.default;
  }

  return module;
};

const useStockfishEngine = ({ onMessage, onError } = {}) => {
  const engineRef = useRef(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState(null);
  const [loadedNetworks, setLoadedNetworks] = useState([]);

  const loadEngine = useCallback(async () => {
    if (engineRef.current) {
      return engineRef.current;
    }

    setStatus('loading-engine');
    setError(null);
    setLoadedNetworks([]);

    try {
      const module = await import(
        /* webpackIgnore: true */ `${STOCKFISH_ENTRYPOINT}?cache=${Date.now()}`
      );
      const factory = normalizeModule(module);

      if (typeof factory !== 'function') {
        throw new Error('Unexpected Stockfish module export.');
      }

      const engine = await factory();

      engine.listen = (payload) => {
        if (onMessage) {
          onMessage(payload);
        }
      };

      engine.onError = (payload) => {
        if (onError) {
          onError(payload);
        }
      };

      engineRef.current = engine;
      setStatus('loading-networks');

      for (let index = 0; index < NETWORKS.length; index += 1) {
        const network = NETWORKS[index];
        const response = await fetch(`${STOCKFISH_BASE_PATH}/${network.filename}`);

        if (!response.ok) {
          throw new Error(
            `Failed to fetch ${network.filename}. Upload the NNUE networks to ${STOCKFISH_BASE_PATH}/ before launching the app.`,
          );
        }

        const buffer = await response.arrayBuffer();
        engine.setNnueBuffer(new Uint8Array(buffer), index);
        setLoadedNetworks((prev) => [...prev, network.id]);
      }

      setStatus('ready');
      return engine;
    } catch (err) {
      const normalizedError = err instanceof Error ? err : new Error('Failed to initialise Stockfish.');
      setError(normalizedError);
      setStatus('error');
      engineRef.current = null;
      throw normalizedError;
    }
  }, [onError, onMessage]);

  const sendCommand = useCallback((command) => {
    if (!engineRef.current) {
      throw new Error('Engine is not ready.');
    }

    engineRef.current.uci(command);
  }, []);

  const reset = useCallback(() => {
    engineRef.current = null;
    setStatus('idle');
    setError(null);
    setLoadedNetworks([]);
  }, []);

  return {
    loadEngine,
    sendCommand,
    reset,
    status,
    error,
    loadedNetworks,
    isReady: status === 'ready',
    isLoading: status === 'loading-engine' || status === 'loading-networks',
    engine: engineRef.current,
  };
};

export default useStockfishEngine;
