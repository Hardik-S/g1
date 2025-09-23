import { act, renderHook, waitFor } from '@testing-library/react';
import useCatPadNotes from '../hooks/useCatPadNotes';
import useCatPadSync from '../hooks/useCatPadSync';
import {
  getAllNotes,
  saveNote,
  getSettings,
  getStoredToken,
  saveSettings,
  setStoredToken,
  DEFAULT_SETTINGS,
} from '../storage';
import { pullFromGist, pushToGist } from '../sync';
jest.mock('../storage', () => {
  const actual = jest.requireActual('../storage');
  return {
    ...actual,
    getAllNotes: jest.fn(),
    saveNote: jest.fn(),
    deleteNote: jest.fn(),
    replaceAllNotes: jest.fn(),
    getSettings: jest.fn(),
    saveSettings: jest.fn(),
    getStoredToken: jest.fn(),
    setStoredToken: jest.fn(),
  };
});

jest.mock('../sync', () => {
  const actual = jest.requireActual('../sync');
  return {
    ...actual,
    pullFromGist: jest.fn(),
    pushToGist: jest.fn(),
  };
});

jest.mock('../../../state/globalGistSettings', () => ({
  readGlobalGistSettings: jest.fn(() => ({})),
  writeGlobalGistSettings: jest.fn(),
  clearGlobalGistSettings: jest.fn(),
  subscribeToGlobalGistSettings: jest.fn(() => () => {}),
}));

describe('useCatPadSync', () => {
  const baseNote = {
    id: 'note-1',
    title: 'First cat',
    content: 'hello world',
    createdAt: '2023-01-01T00:00:00.000Z',
    updatedAt: '2023-01-01T00:00:00.000Z',
  };

  beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    console.error.mockRestore();
  });

  beforeEach(() => {
    jest.useFakeTimers();
    getAllNotes.mockResolvedValue([baseNote]);
    saveNote.mockResolvedValue(undefined);
    getSettings.mockResolvedValue({
      ...DEFAULT_SETTINGS,
      syncEnabled: true,
      autoSync: true,
      gistId: 'gist-123',
      gistFilename: 'catpad-notes.json',
      rememberToken: true,
    });
    getStoredToken.mockResolvedValue('token-abc');
    saveSettings.mockImplementation(async (value) => value);
    setStoredToken.mockResolvedValue('token-abc');
    pullFromGist.mockResolvedValue({
      notes: [baseNote],
      exportedAt: baseNote.updatedAt,
    });
    pushToGist.mockResolvedValue({
      exportedAt: '2024-01-01T00:00:00.000Z',
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('triggers an auto push after a saved mutation when sync is enabled', async () => {
    const { result } = renderHook(() => {
      const notes = useCatPadNotes();
      const sync = useCatPadSync(notes);
      return { notes, sync };
    });

    await waitFor(() => expect(result.current.notes.isLoading).toBe(false));
    await waitFor(() => expect(result.current.sync.isLoading).toBe(false));

    act(() => {
      result.current.notes.setDraftContent('updated content');
    });

    await act(async () => {
      jest.advanceTimersByTime(600);
      await Promise.resolve();
    });

    await waitFor(() => expect(saveNote).toHaveBeenCalledTimes(1));
    expect(pushToGist).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(1200);
      await Promise.resolve();
    });

    await waitFor(() => expect(pushToGist).toHaveBeenCalledTimes(1));
    const payload = pushToGist.mock.calls[0][0];
    expect(payload.notes[0].content).toBe('updated content');

    await waitFor(() => expect(result.current.sync.syncStatus.type).toBe('success'));
    expect(result.current.sync.syncStatus.message).toContain('Synced at');
  });
});
