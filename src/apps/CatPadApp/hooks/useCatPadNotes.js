import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  deleteNote as deleteNoteFromStore,
  getAllNotes,
  replaceAllNotes,
  saveNote,
} from '../storage';
import {
  createWelcomeNote,
  formatRelativeTime,
  formatTimestamp,
  generateId,
  normalizeNote,
  sortNotes,
} from '../utils/notes';

const useCatPadNotes = () => {
  const [notes, setNotes] = useState([]);
  const [activeNoteId, setActiveNoteId] = useState(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [lastLocalSaveAt, setLastLocalSaveAt] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastMutation, setLastMutation] = useState(null);

  const notesRef = useRef([]);
  const draftRef = useRef({ title: '', content: '' });
  const autoSaveTimerRef = useRef(null);
  const activeNoteIdRef = useRef(null);

  const setNotesState = useCallback((updater) => {
    setNotes((prev) => {
      const nextValue = typeof updater === 'function' ? updater(prev) : updater;
      const sanitized = Array.isArray(nextValue) ? nextValue : [];
      notesRef.current = sanitized;
      return sanitized;
    });
  }, []);

  const markMutation = useCallback((type, reason) => {
    setLastMutation({ id: Date.now() + Math.random(), type, reason });
  }, []);

  const syncDraftState = useCallback((note) => {
    const safeNote = note || null;
    const nextTitle = safeNote ? safeNote.title || '' : '';
    const nextContent = safeNote ? safeNote.content || '' : '';
    setDraftTitle(nextTitle);
    setDraftContent(nextContent);
    draftRef.current = { title: nextTitle, content: nextContent };
    setLastLocalSaveAt(safeNote ? safeNote.updatedAt || null : null);
  }, []);

  useEffect(() => () => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
  }, []);

  useEffect(() => {
    draftRef.current = { title: draftTitle, content: draftContent };
  }, [draftTitle, draftContent]);

  useEffect(() => {
    activeNoteIdRef.current = activeNoteId;
  }, [activeNoteId]);

  useEffect(() => {
    let isMounted = true;
    const loadNotes = async () => {
      setIsLoading(true);
      try {
        const storedNotes = await getAllNotes();
        const normalized = sortNotes(
          storedNotes && storedNotes.length > 0
            ? storedNotes.map(normalizeNote)
            : [createWelcomeNote()],
        );
        if (!isMounted) return;
        setNotesState(normalized);
        const firstNote = normalized[0] || null;
        setActiveNoteId(firstNote ? firstNote.id : null);
        syncDraftState(firstNote);
        setError(null);
      } catch (loadError) {
        console.error('[CatPad] Failed to load saved data', loadError);
        if (!isMounted) return;
        const fallback = createWelcomeNote();
        setNotesState([fallback]);
        setActiveNoteId(fallback.id);
        syncDraftState(fallback);
        setError('Failed to load saved notes, starting fresh.');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadNotes();

    return () => {
      isMounted = false;
    };
  }, [setNotesState, syncDraftState]);

  const getNotesSnapshot = useCallback(() => notesRef.current, []);

  const persistDraft = useCallback(
    async (reason = 'auto') => {
      const note = notesRef.current.find((item) => item.id === activeNoteIdRef.current);
      if (!note) {
        return false;
      }
      const trimmedTitle = draftRef.current.title.trim() || 'Untitled Cat';
      const content = draftRef.current.content;
      if (note.title === trimmedTitle && note.content === content) {
        return false;
      }
      const timestamp = new Date().toISOString();
      const updatedNote = {
        ...note,
        title: trimmedTitle,
        content,
        updatedAt: timestamp,
      };
      const nextNotes = sortNotes(
        notesRef.current.map((item) => (item.id === note.id ? updatedNote : item)),
      );
      setNotesState(nextNotes);
      try {
        await saveNote(updatedNote);
        setLastLocalSaveAt(timestamp);
        if (draftRef.current.title !== trimmedTitle) {
          setDraftTitle(trimmedTitle);
        }
        markMutation('update', reason);
        setError(null);
        return true;
      } catch (saveError) {
        console.error('[CatPad] Failed to save note', saveError);
        setError('Local save failed. Check storage permissions.');
        return false;
      }
    },
    [markMutation, setNotesState],
  );

  useEffect(() => {
    if (!activeNoteId) return undefined;
    const note = notesRef.current.find((item) => item.id === activeNoteId);
    if (!note) return undefined;
    if (note.title === draftRef.current.title && note.content === draftRef.current.content) {
      return undefined;
    }
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }
    autoSaveTimerRef.current = setTimeout(() => {
      persistDraft('auto');
    }, 600);
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [activeNoteId, draftContent, draftTitle, persistDraft]);

  useEffect(() => {
    const note = notesRef.current.find((item) => item.id === activeNoteId);
    if (!note) {
      if (draftRef.current.title !== '' || draftRef.current.content !== '') {
        syncDraftState(null);
      }
      return;
    }
    if (note.title !== draftRef.current.title) {
      setDraftTitle(note.title);
    }
    if (note.content !== draftRef.current.content) {
      setDraftContent(note.content);
    }
  }, [activeNoteId, notes, syncDraftState]);

  useEffect(() => {
    const note = notesRef.current.find((item) => item.id === activeNoteId);
    setLastLocalSaveAt(note ? note.updatedAt : null);
  }, [activeNoteId, notes]);

  const handleSelectNote = useCallback(
    async (noteId) => {
      if (noteId === activeNoteIdRef.current) {
        return;
      }
      await persistDraft('auto');
      setActiveNoteId(noteId);
    },
    [persistDraft],
  );

  const createNote = useCallback(async () => {
    const now = new Date().toISOString();
    const existingTitles = new Set(notesRef.current.map((item) => item.title));
    let baseTitle = 'New Cat Note';
    let counter = 1;
    while (existingTitles.has(baseTitle)) {
      counter += 1;
      baseTitle = `New Cat Note ${counter}`;
    }
    const newNote = {
      id: generateId(),
      title: baseTitle,
      content: '',
      createdAt: now,
      updatedAt: now,
    };
    const nextNotes = sortNotes([newNote, ...notesRef.current]);
    setNotesState(nextNotes);
    try {
      await saveNote(newNote);
      setLastLocalSaveAt(now);
      markMutation('create', 'auto');
      setError(null);
    } catch (createError) {
      console.error('[CatPad] Failed to create note', createError);
      setError('Could not create a new note.');
    }
    return newNote;
  }, [markMutation, setNotesState]);

  const handleNewNote = useCallback(async () => {
    await persistDraft('auto');
    const note = await createNote();
    setActiveNoteId(note.id);
    return note;
  }, [createNote, persistDraft]);

  const handleDeleteNote = useCallback(
    async (noteId) => {
      const note = notesRef.current.find((item) => item.id === noteId);
      if (!note) return;
      const confirmed = typeof window !== 'undefined'
        ? window.confirm(`Send "${note.title}" to the catnap bin? This cannot be undone.`)
        : true;
      if (!confirmed) {
        return;
      }
      let nextNotes = [];
      setNotesState((prev) => {
        nextNotes = prev.filter((item) => item.id !== noteId);
        return nextNotes;
      });
      await deleteNoteFromStore(noteId);
      if (nextNotes.length === 0) {
        const newNote = await createNote();
        setActiveNoteId(newNote.id);
      } else if (activeNoteIdRef.current === noteId) {
        setActiveNoteId(nextNotes[0].id);
      }
      markMutation('delete', 'manual');
      setError(null);
    },
    [createNote, markMutation, setNotesState],
  );

  const handleManualSave = useCallback(async () => {
    await persistDraft('manual');
  }, [persistDraft]);

  const applySyncedNotes = useCallback(
    async (nextNotes) => {
      const sanitized = sortNotes(nextNotes);
      await replaceAllNotes(sanitized);
      setNotesState(sanitized);
      if (sanitized.length === 0) {
        const fallback = createWelcomeNote();
        await replaceAllNotes([fallback]);
        setNotesState([fallback]);
        setActiveNoteId(fallback.id);
        syncDraftState(fallback);
        markMutation('remote', 'remote');
        return fallback;
      }
      const currentActiveId = activeNoteIdRef.current;
      let nextActive = sanitized.find((item) => item.id === currentActiveId) || null;
      if (!nextActive) {
        nextActive = sanitized[0];
        setActiveNoteId(nextActive.id);
      }
      syncDraftState(nextActive);
      markMutation('remote', 'remote');
      return nextActive;
    },
    [setNotesState, syncDraftState, markMutation],
  );

  const activeNote = useMemo(
    () => notes.find((note) => note.id === activeNoteId) || null,
    [notes, activeNoteId],
  );

  return {
    notes,
    activeNote,
    activeNoteId,
    draftTitle,
    setDraftTitle,
    draftContent,
    setDraftContent,
    lastLocalSaveAt,
    isLoading,
    error,
    lastMutation,
    formatRelativeTime,
    formatTimestamp,
    handleSelectNote,
    handleNewNote,
    handleDeleteNote,
    handleManualSave,
    persistDraft,
    applySyncedNotes,
    getNotesSnapshot,
  };
};

export default useCatPadNotes;
