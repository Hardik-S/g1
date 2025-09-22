import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './CatPadApp.css';
import {
  DEFAULT_SETTINGS,
  deleteNote as deleteNoteFromStore,
  getAllNotes,
  getSettings,
  getStoredToken,
  replaceAllNotes,
  saveNote,
  saveSettings,
  setStoredToken,
} from './storage';
import {
  clearGlobalGistSettings,
  readGlobalGistSettings,
  subscribeToGlobalGistSettings,
  writeGlobalGistSettings,
} from '../../state/globalGistSettings';
import {
  DEFAULT_SYNC_FILENAME,
  mergeNoteCollections,
  pullFromGist,
  pushToGist,
} from './sync';

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `cat-${Math.random().toString(16).slice(2)}-${Date.now()}`;
};

const normalizeNote = (note) => {
  if (!note) return null;
  const now = new Date().toISOString();
  return {
    id: note.id || generateId(),
    title: note.title || 'Untitled Cat',
    content: note.content || '',
    createdAt: note.createdAt || now,
    updatedAt: note.updatedAt || note.createdAt || now,
  };
};

const createWelcomeNote = () => {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    title: 'Welcome to CatPad',
    content: `Welcome to CatPad! 🐾

• Use the sidebar to create, open, and delete notes.
• CatPad autosaves locally and can sync through a GitHub Gist.
• Head to the Cloud Sync panel to plug in your gist ID and token so every browser stays in purr-fect sync.

Happy typing!`,
    createdAt: now,
    updatedAt: now,
  };
};

const sortNotes = (notes) => {
  const safe = Array.isArray(notes) ? [...notes] : [];
  safe.sort((a, b) => {
    const aTime = Date.parse(a.updatedAt || a.createdAt || 0) || 0;
    const bTime = Date.parse(b.updatedAt || b.createdAt || 0) || 0;
    if (bTime !== aTime) {
      return bTime - aTime;
    }
    return (a.title || '').localeCompare(b.title || '');
  });
  return safe;
};

const formatRelativeTime = (timestamp) => {
  if (!timestamp) return 'never';
  const time = Date.parse(timestamp);
  if (Number.isNaN(time)) {
    return 'unknown';
  }
  const diffSeconds = Math.round((Date.now() - time) / 1000);
  if (diffSeconds < 45) {
    return 'just now';
  }
  if (diffSeconds < 90) {
    return 'a meowment ago';
  }
  const diffMinutes = Math.round(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes} min ago`;
  }
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hr${diffHours === 1 ? '' : 's'} ago`;
  }
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  }
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(time);
};

const formatTimestamp = (timestamp) => {
  if (!timestamp) return 'Never synced';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return 'Never synced';
  }
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  }).format(date);
};

const statusIconMap = {
  idle: '☁️',
  syncing: '🐾',
  success: '😺',
  error: '⚠️',
};

const catTips = [
  'Public gists work great for read-only sync. Add a token to update from any device.',
  'Create a fine-grained GitHub token with only the “gist” scope for extra safety.',
  'Tap “Pull latest” after switching devices to be sure you have the newest whisker scribbles.',
  'Auto-sync keeps notes aligned every time CatPad saves a change.',
];

const hasNotesChanged = (previous, next) => {
  if (previous.length !== next.length) {
    return true;
  }
  const sortById = (list) => [...list].sort((a, b) => a.id.localeCompare(b.id));
  const aSorted = sortById(previous);
  const bSorted = sortById(next);
  for (let index = 0; index < aSorted.length; index += 1) {
    const aNote = aSorted[index];
    const bNote = bSorted[index];
    if (aNote.id !== bNote.id) return true;
    if (aNote.title !== bNote.title) return true;
    if (aNote.content !== bNote.content) return true;
    if (aNote.updatedAt !== bNote.updatedAt) return true;
  }
  return false;
};

const CatPadApp = () => {
  const [notes, setNotes] = useState([]);
  const [activeNoteId, setActiveNoteId] = useState(null);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [lastLocalSaveAt, setLastLocalSaveAt] = useState(null);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [gistToken, setGistTokenState] = useState('');
  const [syncStatus, setSyncStatus] = useState({ type: 'idle', message: 'Cloud sync disabled' });
  const [isLoading, setIsLoading] = useState(true);
  const [tipIndex, setTipIndex] = useState(0);

  const notesRef = useRef([]);
  const settingsRef = useRef(DEFAULT_SETTINGS);
  const gistTokenRef = useRef('');
  const draftRef = useRef({ title: '', content: '' });
  const autoSaveTimerRef = useRef(null);
  const pushTimerRef = useRef(null);
  const pushInFlightRef = useRef(false);
  const initialSyncAttemptedRef = useRef(false);

  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      if (pushTimerRef.current) {
        clearTimeout(pushTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    draftRef.current = { title: draftTitle, content: draftContent };
  }, [draftTitle, draftContent]);

  const updateNotesState = useCallback((updater) => {
    setNotes((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      const sanitized = Array.isArray(next) ? next : [];
      notesRef.current = sanitized;
      return sanitized;
    });
  }, []);

  const persistSettings = useCallback(async (updater) => {
    let nextSettingsValue = settingsRef.current;
    setSettings((prev) => {
      const computed = typeof updater === 'function' ? updater(prev) : updater;
      nextSettingsValue = { ...DEFAULT_SETTINGS, ...computed };
      settingsRef.current = nextSettingsValue;
      return nextSettingsValue;
    });
    await saveSettings(nextSettingsValue);
    return nextSettingsValue;
  }, []);

  const applyToken = useCallback(async (token, persist) => {
    const normalized = typeof token === 'string' ? token : '';
    gistTokenRef.current = normalized;
    setGistTokenState(normalized);
    if (persist) {
      await setStoredToken(normalized);
    }
  }, []);

  const getSyncConfig = useCallback(() => {
    const current = settingsRef.current || DEFAULT_SETTINGS;
    return {
      gistId: (current.gistId || '').trim(),
      filename: (current.gistFilename || DEFAULT_SYNC_FILENAME).trim() || DEFAULT_SYNC_FILENAME,
      token: (gistTokenRef.current || '').trim(),
    };
  }, []);

  const pushToRemote = useCallback(async (reason = 'manual') => {
    const currentSettings = settingsRef.current;
    if (!currentSettings.syncEnabled) {
      return;
    }
    const config = getSyncConfig();
    if (!config.gistId) {
      setSyncStatus({ type: 'error', message: 'Add a GitHub gist ID to sync.' });
      return;
    }
    if (!config.token) {
      setSyncStatus({ type: 'error', message: 'Add a gist token to push changes.' });
      return;
    }
    if (pushInFlightRef.current) {
      return;
    }

    pushInFlightRef.current = true;
    setSyncStatus({
      type: 'syncing',
      message: reason === 'manual' ? 'Syncing with Cat Cloud…' : 'Auto-syncing with Cat Cloud…',
    });

    try {
      const result = await pushToGist({
        gistId: config.gistId,
        token: config.token,
        filename: config.filename,
        notes: notesRef.current,
      });
      await persistSettings((prev) => ({
        ...prev,
        lastRemoteExportedAt: result.exportedAt,
        lastSyncedAt: result.exportedAt,
      }));
      setSyncStatus({ type: 'success', message: `Synced at ${formatTimestamp(result.exportedAt)}` });
    } catch (error) {
      console.error('[CatPad] push failed', error);
      setSyncStatus({ type: 'error', message: error.message || 'Cloud sync failed' });
    } finally {
      pushInFlightRef.current = false;
    }
  }, [getSyncConfig, persistSettings]);

  const scheduleRemotePush = useCallback((reason = 'auto') => {
    if (pushTimerRef.current) {
      clearTimeout(pushTimerRef.current);
    }

    const currentSettings = settingsRef.current;
    if (!currentSettings.syncEnabled) {
      return;
    }
    if (reason !== 'manual' && !currentSettings.autoSync) {
      return;
    }

    const config = getSyncConfig();
    if (!config.gistId || !config.token) {
      return;
    }

    const delay = reason === 'manual' ? 0 : 1200;
    pushTimerRef.current = setTimeout(() => {
      pushToRemote(reason);
    }, delay);
  }, [getSyncConfig, pushToRemote]);

  const pullFromRemote = useCallback(async (reason = 'manual') => {
    const currentSettings = settingsRef.current;
    if (!currentSettings.syncEnabled) {
      return;
    }

    const config = getSyncConfig();
    if (!config.gistId) {
      setSyncStatus({ type: 'error', message: 'Add a GitHub gist ID to sync.' });
      return;
    }

    setSyncStatus({
      type: 'syncing',
      message: reason === 'initial' ? 'Connecting to Cat Cloud…' : 'Fetching latest from Cat Cloud…',
    });

    try {
      const result = await pullFromGist({
        gistId: config.gistId,
        token: config.token,
        filename: config.filename,
      });
      const merged = sortNotes(
        mergeNoteCollections(
          notesRef.current,
          result.notes,
          result.exportedAt,
          currentSettings.lastRemoteExportedAt,
        ),
      );
      if (hasNotesChanged(notesRef.current, merged)) {
        await replaceAllNotes(merged);
        updateNotesState(merged);
        if (merged.length > 0) {
          const stillActive = merged.find((note) => note.id === activeNoteId);
          if (!stillActive) {
            setActiveNoteId(merged[0].id);
          }
        } else {
          const fallback = createWelcomeNote();
          await replaceAllNotes([fallback]);
          updateNotesState([fallback]);
          setActiveNoteId(fallback.id);
        }
      }
      await persistSettings((prev) => ({
        ...prev,
        lastRemoteExportedAt: result.exportedAt ?? prev.lastRemoteExportedAt,
        lastSyncedAt: result.exportedAt ?? prev.lastSyncedAt,
      }));
      setSyncStatus({ type: 'success', message: 'Cloud copy synced' });
    } catch (error) {
      console.error('[CatPad] pull failed', error);
      setSyncStatus({ type: 'error', message: error.message || 'Failed to fetch from cloud' });
    }
  }, [activeNoteId, getSyncConfig, persistSettings, updateNotesState]);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const [storedNotes, storedSettings, storedToken] = await Promise.all([
          getAllNotes(),
          getSettings(),
          getStoredToken(),
        ]);
        const normalizedNotes = sortNotes(
          (storedNotes && storedNotes.length > 0
            ? storedNotes.map(normalizeNote)
            : [createWelcomeNote()]),
        );
        updateNotesState(normalizedNotes);
        const firstNote = normalizedNotes[0] || null;
        setActiveNoteId(firstNote ? firstNote.id : null);
        setDraftTitle(firstNote ? firstNote.title : '');
        setDraftContent(firstNote ? firstNote.content : '');
        setLastLocalSaveAt(firstNote ? firstNote.updatedAt : null);
        draftRef.current = {
          title: firstNote ? firstNote.title : '',
          content: firstNote ? firstNote.content : '',
        };
        const baseSettings = { ...DEFAULT_SETTINGS, ...storedSettings };
        const globalSettings = readGlobalGistSettings();
        const globalGistId = typeof globalSettings.gistId === 'string' ? globalSettings.gistId.trim() : '';
        const globalToken = typeof globalSettings.token === 'string' ? globalSettings.token : '';
        const mergedSettings = globalGistId
          ? { ...baseSettings, gistId: globalGistId, syncEnabled: true }
          : baseSettings;
        const appliedSettings = await persistSettings(mergedSettings);
        const rememberedToken = appliedSettings.rememberToken ? storedToken : '';
        await applyToken(rememberedToken, appliedSettings.rememberToken);
        if (globalGistId || globalToken) {
          await applyToken(globalToken, appliedSettings.rememberToken);
        } else if (appliedSettings.rememberToken) {
          const localGistId = (appliedSettings.gistId || '').trim();
          if (localGistId || gistTokenRef.current) {
            writeGlobalGistSettings({ gistId: localGistId, token: gistTokenRef.current });
          }
        }
        if (appliedSettings.lastSyncedAt) {
          setSyncStatus({
            type: 'success',
            message: `Last synced ${formatTimestamp(appliedSettings.lastSyncedAt)}`,
          });
        } else if (!appliedSettings.syncEnabled) {
          setSyncStatus({ type: 'idle', message: 'Cloud sync disabled' });
        }
      } catch (error) {
        console.error('[CatPad] Failed to load saved data', error);
        const fallbackNote = createWelcomeNote();
        updateNotesState([fallbackNote]);
        setActiveNoteId(fallbackNote.id);
        setDraftTitle(fallbackNote.title);
        setDraftContent(fallbackNote.content);
        setLastLocalSaveAt(fallbackNote.updatedAt);
        draftRef.current = { title: fallbackNote.title, content: fallbackNote.content };
        setSyncStatus({ type: 'error', message: 'Failed to load saved notes, starting fresh.' });
      } finally {
        setIsLoading(false);
        setTipIndex(Math.floor(Math.random() * catTips.length));
      }
    };

    load();
  }, [applyToken, persistSettings, updateNotesState]);

  useEffect(() => {
    const unsubscribe = subscribeToGlobalGistSettings((nextGlobal) => {
      if (!nextGlobal) {
        return;
      }

      const trimmedId = typeof nextGlobal.gistId === 'string' ? nextGlobal.gistId.trim() : '';
      const nextToken = typeof nextGlobal.token === 'string' ? nextGlobal.token : '';
      const previousSettings = settingsRef.current || DEFAULT_SETTINGS;
      const previousGistId = (previousSettings.gistId || '').trim();
      const previousToken = gistTokenRef.current || '';
      const desiredSyncEnabled = Boolean(trimmedId);

      if (
        trimmedId === previousGistId
        && nextToken === previousToken
        && previousSettings.syncEnabled === desiredSyncEnabled
      ) {
        return;
      }

      (async () => {
        try {
          if (trimmedId !== previousGistId || previousSettings.syncEnabled !== desiredSyncEnabled) {
            await persistSettings((prev) => ({
              ...prev,
              gistId: trimmedId,
              syncEnabled: desiredSyncEnabled,
            }));
          }

          if (nextToken !== previousToken) {
            await applyToken(nextToken, settingsRef.current.rememberToken);
          }

          initialSyncAttemptedRef.current = false;
          const effectiveGistId = trimmedId || (settingsRef.current.gistId || '').trim();
          if (effectiveGistId) {
            pullFromRemote('initial');
          }
        } catch (error) {
          console.error('[CatPad] Failed to apply global gist settings', error);
        }
      })();
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [applyToken, persistSettings, pullFromRemote]);

  useEffect(() => {
    if (isLoading) return;
    if (!settings.syncEnabled) return;
    if (!settings.gistId) return;
    if (initialSyncAttemptedRef.current) return;
    initialSyncAttemptedRef.current = true;
    pullFromRemote('initial');
  }, [isLoading, pullFromRemote, settings.gistId, settings.syncEnabled]);

  useEffect(() => {
    if (!settings.syncEnabled) {
      setSyncStatus({ type: 'idle', message: 'Cloud sync disabled' });
      return;
    }
    if (!settings.gistId) {
      setSyncStatus({ type: 'idle', message: 'Add a gist ID to enable Cat Cloud sync' });
    }
  }, [settings.gistId, settings.syncEnabled]);

  useEffect(() => {
    const note = notesRef.current.find((item) => item.id === activeNoteId);
    if (!note) {
      if (draftRef.current.title !== '' || draftRef.current.content !== '') {
        setDraftTitle('');
        setDraftContent('');
      }
      return;
    }
    if (note.title !== draftRef.current.title) {
      setDraftTitle(note.title);
    }
    if (note.content !== draftRef.current.content) {
      setDraftContent(note.content);
    }
  }, [activeNoteId, notes]);

  useEffect(() => {
    const current = notesRef.current.find((item) => item.id === activeNoteId);
    setLastLocalSaveAt(current ? current.updatedAt : null);
  }, [activeNoteId, notes]);

  const persistDraft = useCallback(async (reason = 'auto') => {
    const note = notesRef.current.find((item) => item.id === activeNoteId);
    if (!note) {
      return;
    }
    const trimmedTitle = draftRef.current.title.trim() || 'Untitled Cat';
    const content = draftRef.current.content;
    if (note.title === trimmedTitle && note.content === content) {
      return;
    }
    const timestamp = new Date().toISOString();
    const updatedNote = {
      ...note,
      title: trimmedTitle,
      content,
      updatedAt: timestamp,
    };
    updateNotesState((prev) => sortNotes(prev.map((item) => (item.id === note.id ? updatedNote : item))));
    try {
      await saveNote(updatedNote);
      setLastLocalSaveAt(timestamp);
      if (draftRef.current.title !== trimmedTitle) {
        setDraftTitle(trimmedTitle);
      }
      if (reason !== 'remote') {
        scheduleRemotePush('auto');
      }
    } catch (error) {
      console.error('[CatPad] Failed to save note', error);
      setSyncStatus({ type: 'error', message: 'Local save failed. Check storage permissions.' });
    }
  }, [activeNoteId, scheduleRemotePush, updateNotesState]);

  useEffect(() => {
    if (!activeNoteId) return;
    const note = notesRef.current.find((item) => item.id === activeNoteId);
    if (!note) return;
    if (note.title === draftRef.current.title && note.content === draftRef.current.content) {
      return;
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
  }, [activeNoteId, draftTitle, draftContent, persistDraft]);

  const handleSelectNote = useCallback(async (noteId) => {
    if (noteId === activeNoteId) {
      return;
    }
    await persistDraft('auto');
    setActiveNoteId(noteId);
  }, [activeNoteId, persistDraft]);

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
    updateNotesState((prev) => sortNotes([newNote, ...prev]));
    await saveNote(newNote);
    setLastLocalSaveAt(now);
    scheduleRemotePush('auto');
    return newNote;
  }, [scheduleRemotePush, updateNotesState]);

  const handleNewNote = useCallback(async () => {
    await persistDraft('auto');
    const note = await createNote();
    setActiveNoteId(note.id);
  }, [createNote, persistDraft]);

  const handleDeleteNote = useCallback(async (noteId) => {
    const note = notesRef.current.find((item) => item.id === noteId);
    if (!note) return;
    const confirmed = typeof window !== 'undefined'
      ? window.confirm(`Send "${note.title}" to the catnap bin? This cannot be undone.`)
      : true;
    if (!confirmed) {
      return;
    }
    let nextNotes = [];
    updateNotesState((prev) => {
      nextNotes = prev.filter((item) => item.id !== noteId);
      return nextNotes;
    });
    await deleteNoteFromStore(noteId);
    if (nextNotes.length === 0) {
      const newNote = await createNote();
      setActiveNoteId(newNote.id);
    } else if (activeNoteId === noteId) {
      setActiveNoteId(nextNotes[0].id);
    }
    scheduleRemotePush('manual');
  }, [activeNoteId, createNote, scheduleRemotePush, updateNotesState]);

  const handleManualSave = useCallback(async () => {
    await persistDraft('manual');
    scheduleRemotePush('manual');
  }, [persistDraft, scheduleRemotePush]);

  const handleSettingsChange = useCallback((field, value) => {
    if (field === 'syncEnabled' || field === 'gistId') {
      initialSyncAttemptedRef.current = false;
    }

    if (field === 'gistId') {
      const raw = typeof value === 'string' ? value : '';
      const trimmed = raw.trim();
      (async () => {
        await persistSettings((prev) => ({
          ...prev,
          gistId: trimmed,
          syncEnabled: Boolean(trimmed),
        }));
        if (settingsRef.current.rememberToken && (trimmed || gistTokenRef.current)) {
          writeGlobalGistSettings({ gistId: trimmed, token: gistTokenRef.current });
        } else {
          clearGlobalGistSettings();
        }
      })();
      return;
    }

    if (field === 'syncEnabled') {
      const enabled = Boolean(value);
      persistSettings((prev) => ({ ...prev, syncEnabled: enabled }));
      return;
    }

    persistSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
  }, [clearGlobalGistSettings, persistSettings, writeGlobalGistSettings]);

  const syncStateIcon = statusIconMap[syncStatus.type] || statusIconMap.idle;
  const activeNote = useMemo(
    () => notes.find((note) => note.id === activeNoteId) || null,
    [notes, activeNoteId],
  );
  const canPush = settings.syncEnabled && Boolean(getSyncConfig().gistId) && Boolean(getSyncConfig().token);

  if (isLoading) {
    return (
      <div className="catpad-app catpad-loading">
        <div className="catpad-loader" role="status" aria-live="polite">
          <div className="catpad-paw-spinner" />
          <p>Stretching whiskers…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="catpad-app">
      <div className="catpad-layout">
        <aside className="catpad-sidebar">
          <div className="catpad-sidebar-header">
            <h2>Cat Files</h2>
            <button type="button" className="catpad-primary" onClick={handleNewNote}>
              + New note
            </button>
          </div>
          <div className="catpad-note-list" role="list">
            {notes.length === 0 && (
              <div className="catpad-empty">No notes yet — start a new cat tale!</div>
            )}
            {notes.map((note) => (
              <button
                key={note.id}
                type="button"
                role="listitem"
                className={`catpad-note-item ${note.id === activeNoteId ? 'active' : ''}`}
                onClick={() => handleSelectNote(note.id)}
              >
                <div className="catpad-note-title">{note.title || 'Untitled Cat'}</div>
                <div className="catpad-note-meta">Updated {formatRelativeTime(note.updatedAt)}</div>
              </button>
            ))}
          </div>
        </aside>

        <section className="catpad-editor" aria-label="CatPad editor">
          <div className="catpad-editor-toolbar">
            <input
              className="catpad-title-input"
              type="text"
              value={draftTitle}
              onChange={(event) => setDraftTitle(event.target.value)}
              placeholder="Name your cat note"
            />
            <div className="catpad-toolbar-actions">
              <button type="button" className="catpad-secondary" onClick={handleManualSave}>
                Save
              </button>
              <button
                type="button"
                className="catpad-danger"
                onClick={() => activeNote && handleDeleteNote(activeNote.id)}
                disabled={!activeNote}
              >
                Delete
              </button>
            </div>
          </div>
          <textarea
            className="catpad-textarea"
            value={draftContent}
            onChange={(event) => setDraftContent(event.target.value)}
            placeholder="Write something delightful for your feline friends…"
          />
          <div className="catpad-status-row">
            <div className={`catpad-sync-status ${syncStatus.type}`}>
              <span className="catpad-sync-icon" aria-hidden="true">{syncStateIcon}</span>
              <span>{syncStatus.message}</span>
            </div>
            <div className="catpad-save-meta">
              <span>Last local save: {formatRelativeTime(lastLocalSaveAt)}</span>
            </div>
          </div>
        </section>

        <aside className="catpad-settings" aria-label="Cloud sync settings">
          <h2>Cloud Sync</h2>
          <p className="catpad-settings-blurb">
            CatPad syncs through a GitHub gist so every browser shares the same scratchpad. Enter a gist ID and a
            GitHub token with the <code>gist</code> scope. Your token never leaves this device.
          </p>

          <label className="catpad-field">
            <span>Enable cloud sync</span>
            <input
              type="checkbox"
              checked={settings.syncEnabled}
              onChange={(event) => handleSettingsChange('syncEnabled', event.target.checked)}
            />
          </label>

          <label className="catpad-field">
            <span>Gist ID</span>
            <input
              type="text"
              value={settings.gistId}
              onChange={(event) => handleSettingsChange('gistId', event.target.value)}
              placeholder="e.g. a1b2c3d4e5f6"
            />
          </label>

          <label className="catpad-field">
            <span>Filename</span>
            <input
              type="text"
              value={settings.gistFilename}
              onChange={(event) => handleSettingsChange('gistFilename', event.target.value || DEFAULT_SYNC_FILENAME)}
              placeholder={DEFAULT_SYNC_FILENAME}
            />
          </label>

          <label className="catpad-field">
            <span>GitHub token</span>
            <input
              type="password"
              value={gistToken}
              onChange={async (event) => {
                const value = event.target.value;
                await applyToken(value, settings.rememberToken);
                if (settings.rememberToken) {
                  const gistId = (settingsRef.current.gistId || '').trim();
                  if (gistId || gistTokenRef.current) {
                    writeGlobalGistSettings({ gistId, token: gistTokenRef.current });
                  } else {
                    clearGlobalGistSettings();
                  }
                } else {
                  clearGlobalGistSettings();
                }
              }}
              placeholder="ghp_…"
            />
          </label>

          <label className="catpad-field catpad-remember">
            <input
              type="checkbox"
              checked={settings.rememberToken}
              onChange={async (event) => {
                const remember = event.target.checked;
                await persistSettings((prev) => ({ ...prev, rememberToken: remember }));
                if (remember) {
                  await applyToken(gistTokenRef.current, true);
                  const gistId = (settingsRef.current.gistId || '').trim();
                  if (gistId || gistTokenRef.current) {
                    writeGlobalGistSettings({ gistId, token: gistTokenRef.current });
                  }
                } else {
                  await setStoredToken('');
                  clearGlobalGistSettings();
                }
              }}
            />
            <span>Remember token on this device</span>
          </label>

          <label className="catpad-field">
            <span>Auto-sync after edits</span>
            <input
              type="checkbox"
              checked={settings.autoSync}
              onChange={(event) => handleSettingsChange('autoSync', event.target.checked)}
              disabled={!settings.syncEnabled}
            />
          </label>

          <div className="catpad-sync-actions">
            <button
              type="button"
              className="catpad-secondary"
              onClick={() => pullFromRemote('manual')}
              disabled={!settings.syncEnabled || !settings.gistId}
            >
              Pull latest
            </button>
            <button
              type="button"
              className="catpad-primary"
              onClick={() => pushToRemote('manual')}
              disabled={!canPush}
            >
              Push changes
            </button>
          </div>

          <div className="catpad-tip">
            <span className="catpad-tip-icon" aria-hidden="true">🐈</span>
            <p>{catTips[tipIndex]}</p>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default CatPadApp;
