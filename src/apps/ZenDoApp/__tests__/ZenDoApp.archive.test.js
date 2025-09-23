import React from 'react';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
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

describe('ZenDoApp archive interactions', () => {
  const baseTasks = [
    {
      id: 'active-1',
      title: 'Active Sample',
      completed: false,
      createdAt: '2024-01-01T08:00:00.000Z',
      updatedAt: '2024-01-01T08:00:00.000Z',
      schedule: { day: 'mon', order: 0, focusBucket: null, focusOrder: 0 },
      subtasks: [],
    },
    {
      id: 'archived-1',
      title: 'Archived Sample',
      completed: true,
      completedAt: '2024-01-02T09:00:00.000Z',
      createdAt: '2024-01-02T08:00:00.000Z',
      updatedAt: '2024-01-02T09:00:00.000Z',
      schedule: { day: null, order: 0, focusBucket: null, focusOrder: 0 },
      subtasks: [],
    },
  ];

  beforeEach(() => {
    jest.useFakeTimers();
    loadState.mockImplementation(() => ({
      tasks: JSON.parse(JSON.stringify(baseTasks)),
      lastUpdatedAt: '2024-01-02T09:00:00.000Z',
    }));
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

  it('moves a task from the archive back into active collections when unarchived', async () => {
    render(<ZenDoApp />);

    fireEvent.click(screen.getByRole('button', { name: 'Archive' }));

    const archivedItem = await screen.findByText('Archived Sample');
    const archiveListItem = archivedItem.closest('li');
    expect(archiveListItem).not.toBeNull();

    const unarchiveButton = within(archiveListItem).getByRole('button', { name: 'Unarchive' });
    fireEvent.click(unarchiveButton);

    await screen.findByText('Completed tasks will rest here once finished.');

    fireEvent.click(screen.getByRole('button', { name: 'Landing' }));

    await waitFor(() => {
      const reopenedNode = document.querySelector('[data-task-id="archived-1"]');
      expect(reopenedNode).toBeInTheDocument();
      const checkbox = within(reopenedNode).getByRole('checkbox');
      expect(checkbox).not.toBeChecked();
    });
  });
});
