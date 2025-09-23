import React from 'react';
import { render, screen, within, act, waitFor } from '@testing-library/react';
import HexaSnakeApp from '../HexaSnakeApp';

describe('HexaSnakeApp scoreboard integration', () => {
  let originalRequestAnimationFrame;
  let originalCancelAnimationFrame;
  let originalFetch;
  let rafCallbacks;

  beforeEach(() => {
    rafCallbacks = [];
    originalRequestAnimationFrame = global.requestAnimationFrame;
    originalCancelAnimationFrame = global.cancelAnimationFrame;
    global.requestAnimationFrame = jest.fn((callback) => {
      rafCallbacks.push(callback);
      return rafCallbacks.length;
    });
    global.cancelAnimationFrame = jest.fn();

    originalFetch = global.fetch;
    global.fetch = jest.fn(() =>
      Promise.resolve({
        text: () => Promise.resolve('# dummy python file'),
      })
    );
  });

  afterEach(() => {
    if (originalRequestAnimationFrame) {
      global.requestAnimationFrame = originalRequestAnimationFrame;
    } else {
      delete global.requestAnimationFrame;
    }
    if (originalCancelAnimationFrame) {
      global.cancelAnimationFrame = originalCancelAnimationFrame;
    } else {
      delete global.cancelAnimationFrame;
    }

    if (originalFetch) {
      global.fetch = originalFetch;
    } else {
      delete global.fetch;
    }

    delete window.loadPyodide;
    jest.clearAllMocks();
  });

  it('records score snapshots from the Pyodide game state', async () => {
    const stateSnapshot = { score: 7, speed_level: 3, game_over: false };
    const stateProxy = {
      toJs: jest.fn(() => stateSnapshot),
      destroy: jest.fn(),
    };
    const fakeGame = {
      handle_events: jest.fn(),
      step: jest.fn(() => stateProxy),
      reset: jest.fn(),
      destroy: jest.fn(),
    };

    const runPythonAsync = jest.fn().mockResolvedValue(undefined);
    const fakePyodide = {
      toPy: jest.fn((value) => ({
        destroy: jest.fn(),
      })),
      registerJsModule: jest.fn(),
      unregisterJsModule: jest.fn(),
      FS: {
        analyzePath: jest.fn(() => ({ exists: true })),
        mkdir: jest.fn(),
        writeFile: jest.fn(),
      },
      runPythonAsync,
      globals: {
        get: jest.fn(() => fakeGame),
      },
    };

    window.loadPyodide = jest.fn().mockResolvedValue(fakePyodide);

    await act(async () => {
      render(<HexaSnakeApp onBack={jest.fn()} />);
    });

    expect(window.loadPyodide).toHaveBeenCalled();
    expect(rafCallbacks).not.toHaveLength(0);

    await act(async () => {
      rafCallbacks[0](1000);
    });

    expect(stateProxy.toJs).toHaveBeenCalledWith(
      expect.objectContaining({ dict_converter: Object.fromEntries })
    );

    const scoreItem = screen.getByText('Score').closest('.score-item');
    const bestItem = screen.getByText('Best (Session)').closest('.score-item');

    expect(scoreItem).not.toBeNull();
    expect(bestItem).not.toBeNull();

    await waitFor(() => {
      expect(within(scoreItem).getByText('7')).toBeInTheDocument();
      expect(within(bestItem).getByText('7')).toBeInTheDocument();
    });
  });
});
