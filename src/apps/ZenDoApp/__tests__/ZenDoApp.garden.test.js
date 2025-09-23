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

describe('ZenDoApp garden navigation', () => {
  beforeEach(() => {
    jest.useFakeTimers();
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
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('exposes the Garden tab and toggles the view when clicked', () => {
    render(<ZenDoApp />);

    const gardenButton = screen.getByRole('button', { name: 'Garden' });
    expect(gardenButton).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'All Tasks' })).toBeInTheDocument();

    fireEvent.click(gardenButton);

    expect(
      screen.getByText('Assign tasks to the Priority or Bonus focus lists to watch seedlings sprout here.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Priority Grove' })).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Bonus Blooms' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Landing' }));
    expect(screen.getByRole('heading', { name: 'All Tasks' })).toBeInTheDocument();
  });
});
