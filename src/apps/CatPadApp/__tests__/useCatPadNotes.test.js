import { act, renderHook, waitFor } from '@testing-library/react';
import useCatPadNotes from '../hooks/useCatPadNotes';
import { getAllNotes, saveNote } from '../storage';

jest.mock('../storage', () => {
  const actual = jest.requireActual('../storage');
  return {
    ...actual,
    getAllNotes: jest.fn(),
    saveNote: jest.fn(),
    deleteNote: jest.fn(),
    replaceAllNotes: jest.fn(),
  };
});

describe('useCatPadNotes', () => {
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
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  it('persists drafts after the debounce window and records the mutation', async () => {
    const { result } = renderHook(() => useCatPadNotes());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setDraftContent('updated content');
    });

    await act(async () => {
      jest.advanceTimersByTime(600);
      await Promise.resolve();
    });

    await waitFor(() => expect(saveNote).toHaveBeenCalledTimes(1));

    const savedNote = saveNote.mock.calls[0][0];
    expect(savedNote.content).toBe('updated content');
    expect(savedNote.updatedAt).not.toBe(baseNote.updatedAt);

    expect(result.current.lastLocalSaveAt).toBe(savedNote.updatedAt);
    expect(result.current.lastMutation).toMatchObject({ type: 'update', reason: 'auto' });
  });
});
