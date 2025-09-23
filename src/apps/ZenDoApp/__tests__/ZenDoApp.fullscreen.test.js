import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ZenDoApp from '../ZenDoApp';
import { loadState, loadSettings } from '../storage';

jest.mock('../storage', () => {
  const loadState = jest.fn();
  const saveState = jest.fn();
  const loadSettings = jest.fn();
  const saveSettings = jest.fn();
  const fetchGistSnapshot = jest.fn();
  const pushGistSnapshot = jest.fn();
  const createSnapshot = jest.fn(() => ({ tasks: [], lastUpdatedAt: new Date().toISOString() }));

  return {
    __esModule: true,
    loadState,
    saveState,
    loadSettings,
    saveSettings,
    fetchGistSnapshot,
    pushGistSnapshot,
    createSnapshot,
    DEFAULT_GIST_FILENAME: 'zen-do-data.json',
  };
});

jest.mock('../../../state/globalGistSettings', () => {
  const readGlobalGistSettings = jest.fn(() => ({}));
  const writeGlobalGistSettings = jest.fn();
  const clearGlobalGistSettings = jest.fn();
  const subscribeToGlobalGistSettings = jest.fn(() => () => {});

  return {
    __esModule: true,
    readGlobalGistSettings,
    writeGlobalGistSettings,
    clearGlobalGistSettings,
    subscribeToGlobalGistSettings,
    GLOBAL_GIST_SETTINGS_CLIENT_ID: 'test-client',
    default: {
      readGlobalGistSettings,
      writeGlobalGistSettings,
      clearGlobalGistSettings,
      subscribeToGlobalGistSettings,
    },
  };
});

describe('ZenDoApp fullscreen shortcut', () => {
  let requestFullscreenMock;
  let exitFullscreenMock;

  beforeEach(() => {
    jest.useFakeTimers();
    requestFullscreenMock = jest.fn(() => Promise.resolve());
    exitFullscreenMock = jest.fn(() => Promise.resolve());
    loadState.mockReturnValue({
      tasks: [],
      lastUpdatedAt: '2024-01-01T00:00:00.000Z',
    });
    loadSettings.mockReturnValue({
      gistId: '',
      gistToken: '',
      filename: 'zen-do-data.json',
      lastSyncedAt: null,
    });
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      writable: true,
      value: null,
    });
    document.exitFullscreen = exitFullscreenMock;
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
    delete document.exitFullscreen;
    delete document.fullscreenElement;
  });

  it('toggles fullscreen mode with the z shortcut while ignoring inputs', () => {
    render(<ZenDoApp />);

    const shell = document.querySelector('.zen-app-shell');
    expect(shell).not.toBeNull();
    if (!shell) {
      throw new Error('Zen Do shell not found');
    }

    shell.requestFullscreen = requestFullscreenMock;

    const gistInput = screen.getByPlaceholderText('Public gist ID');
    gistInput.focus();
    fireEvent.keyDown(gistInput, { key: 'z' });

    expect(requestFullscreenMock).not.toHaveBeenCalled();
    expect(exitFullscreenMock).not.toHaveBeenCalled();

    gistInput.blur();
    fireEvent.keyDown(window, { key: 'z' });
    expect(requestFullscreenMock).toHaveBeenCalledTimes(1);

    document.fullscreenElement = shell;
    fireEvent(document, new Event('fullscreenchange'));
    expect(shell.classList.contains('is-fullscreen')).toBe(true);

    fireEvent.keyDown(window, { key: 'z' });
    expect(exitFullscreenMock).toHaveBeenCalledTimes(1);

    document.fullscreenElement = null;
    fireEvent(document, new Event('fullscreenchange'));
    expect(shell.classList.contains('is-fullscreen')).toBe(false);
  });
});
