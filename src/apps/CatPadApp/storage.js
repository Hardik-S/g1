const DB_NAME = 'catpad-db';
const DB_VERSION = 1;
const NOTES_STORE = 'notes';
const SETTINGS_STORE = 'settings';
const SETTINGS_KEY = 'preferences';
const TOKEN_KEY = 'gistToken';
const FALLBACK_NOTES_KEY = 'catpad:notes';
const FALLBACK_SETTINGS_KEY = 'catpad:settings';
const FALLBACK_TOKEN_KEY = 'catpad:gistToken';

const hasIndexedDB = () => typeof indexedDB !== 'undefined';

const openDatabase = () => new Promise((resolve, reject) => {
  if (!hasIndexedDB()) {
    reject(new Error('IndexedDB is not available'));
    return;
  }

  const request = indexedDB.open(DB_NAME, DB_VERSION);

  request.onupgradeneeded = (event) => {
    const db = event.target.result;

    if (!db.objectStoreNames.contains(NOTES_STORE)) {
      db.createObjectStore(NOTES_STORE, { keyPath: 'id' });
    }

    if (!db.objectStoreNames.contains(SETTINGS_STORE)) {
      db.createObjectStore(SETTINGS_STORE);
    }
  };

  request.onsuccess = () => {
    resolve(request.result);
  };

  request.onerror = () => {
    reject(request.error);
  };
});

const withStore = async (storeName, mode, executor) => {
  const db = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);

    let result;
    let request;
    try {
      result = executor(store, transaction);
      if (result && typeof result === 'object' && 'onsuccess' in result) {
        request = result;
      }
    } catch (error) {
      db.close();
      reject(error);
      return;
    }

    transaction.oncomplete = () => {
      db.close();
      if (request && 'result' in request) {
        resolve(request.result);
      } else {
        resolve(result);
      }
    };

    transaction.onabort = () => {
      const error = transaction.error || new Error('Transaction aborted');
      db.close();
      reject(error);
    };

    transaction.onerror = () => {
      const error = transaction.error || new Error('Transaction failed');
      db.close();
      reject(error);
    };
  });
};

const readAllFromStore = async (storeName) => {
  try {
    return await withStore(storeName, 'readonly', (store) => store.getAll());
  } catch (error) {
    if (!hasIndexedDB()) {
      return [];
    }
    throw error;
  }
};

const readValueFromStore = async (storeName, key) => {
  try {
    return await withStore(storeName, 'readonly', (store) => store.get(key));
  } catch (error) {
    if (!hasIndexedDB()) {
      return undefined;
    }
    throw error;
  }
};

const writeToStore = async (storeName, key, value) => {
  return withStore(storeName, 'readwrite', (store) => store.put(value, key));
};

const deleteFromStore = async (storeName, key) => {
  return withStore(storeName, 'readwrite', (store) => store.delete(key));
};

const clearStore = async (storeName) => {
  return withStore(storeName, 'readwrite', (store) => store.clear());
};

const getFallbackStorage = () => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }
  return window.localStorage;
};

const readFallback = (key, defaultValue) => {
  try {
    const storage = getFallbackStorage();
    if (!storage) {
      return defaultValue;
    }
    const raw = storage.getItem(key);
    if (!raw) {
      return defaultValue;
    }
    return JSON.parse(raw);
  } catch (_error) {
    return defaultValue;
  }
};

const writeFallback = (key, value) => {
  try {
    const storage = getFallbackStorage();
    if (!storage) {
      return;
    }
    storage.setItem(key, JSON.stringify(value));
  } catch (_error) {
    // Ignore quota or serialization issues
  }
};

export const getAllNotes = async () => {
  if (!hasIndexedDB()) {
    return readFallback(FALLBACK_NOTES_KEY, []);
  }

  try {
    const notes = await readAllFromStore(NOTES_STORE);
    return Array.isArray(notes) ? notes : [];
  } catch (error) {
    console.warn('[CatPad] Falling back to localStorage for notes', error);
    return readFallback(FALLBACK_NOTES_KEY, []);
  }
};

export const saveNote = async (note) => {
  if (!note || !note.id) return;

  if (!hasIndexedDB()) {
    const notes = await getAllNotes();
    const nextNotes = notes.filter((item) => item.id !== note.id);
    nextNotes.push(note);
    writeFallback(FALLBACK_NOTES_KEY, nextNotes);
    return;
  }

  try {
    await withStore(NOTES_STORE, 'readwrite', (store) => store.put(note));
  } catch (error) {
    console.warn('[CatPad] IndexedDB save failed, using localStorage', error);
    const notes = await getAllNotes();
    const nextNotes = notes.filter((item) => item.id !== note.id);
    nextNotes.push(note);
    writeFallback(FALLBACK_NOTES_KEY, nextNotes);
  }
};

export const deleteNote = async (noteId) => {
  if (!noteId) return;

  if (!hasIndexedDB()) {
    const notes = await getAllNotes();
    const nextNotes = notes.filter((item) => item.id !== noteId);
    writeFallback(FALLBACK_NOTES_KEY, nextNotes);
    return;
  }

  try {
    await deleteFromStore(NOTES_STORE, noteId);
  } catch (error) {
    console.warn('[CatPad] IndexedDB delete failed, using localStorage', error);
    const notes = await getAllNotes();
    const nextNotes = notes.filter((item) => item.id !== noteId);
    writeFallback(FALLBACK_NOTES_KEY, nextNotes);
  }
};

export const replaceAllNotes = async (notes) => {
  const sanitized = Array.isArray(notes) ? notes : [];

  if (!hasIndexedDB()) {
    writeFallback(FALLBACK_NOTES_KEY, sanitized);
    return;
  }

  try {
    await clearStore(NOTES_STORE);
    await withStore(NOTES_STORE, 'readwrite', (store) => {
      sanitized.forEach((note) => {
        store.put(note);
      });
    });
  } catch (error) {
    console.warn('[CatPad] IndexedDB replace failed, using localStorage', error);
    writeFallback(FALLBACK_NOTES_KEY, sanitized);
  }
};

export const DEFAULT_SETTINGS = {
  syncEnabled: false,
  autoSync: true,
  gistId: '',
  gistFilename: 'catpad-notes.json',
  rememberToken: true,
  lastRemoteExportedAt: null,
  lastSyncedAt: null,
};

export const getSettings = async () => {
  if (!hasIndexedDB()) {
    const settings = readFallback(FALLBACK_SETTINGS_KEY, DEFAULT_SETTINGS);
    return { ...DEFAULT_SETTINGS, ...settings };
  }

  try {
    const stored = await readValueFromStore(SETTINGS_STORE, SETTINGS_KEY);
    return { ...DEFAULT_SETTINGS, ...(stored || {}) };
  } catch (error) {
    console.warn('[CatPad] IndexedDB settings read failed, using localStorage', error);
    const settings = readFallback(FALLBACK_SETTINGS_KEY, DEFAULT_SETTINGS);
    return { ...DEFAULT_SETTINGS, ...settings };
  }
};

export const saveSettings = async (settings) => {
  const payload = { ...DEFAULT_SETTINGS, ...(settings || {}) };

  if (!hasIndexedDB()) {
    writeFallback(FALLBACK_SETTINGS_KEY, payload);
    return payload;
  }

  try {
    await writeToStore(SETTINGS_STORE, SETTINGS_KEY, payload);
  } catch (error) {
    console.warn('[CatPad] IndexedDB settings save failed, using localStorage', error);
    writeFallback(FALLBACK_SETTINGS_KEY, payload);
  }

  return payload;
};

export const getStoredToken = async () => {
  if (!hasIndexedDB()) {
    return readFallback(FALLBACK_TOKEN_KEY, '');
  }

  try {
    const token = await readValueFromStore(SETTINGS_STORE, TOKEN_KEY);
    return typeof token === 'string' ? token : '';
  } catch (error) {
    console.warn('[CatPad] IndexedDB token read failed, using localStorage', error);
    return readFallback(FALLBACK_TOKEN_KEY, '');
  }
};

export const setStoredToken = async (token) => {
  const normalized = typeof token === 'string' ? token : '';

  if (!hasIndexedDB()) {
    writeFallback(FALLBACK_TOKEN_KEY, normalized);
    return normalized;
  }

  try {
    await writeToStore(SETTINGS_STORE, TOKEN_KEY, normalized);
  } catch (error) {
    console.warn('[CatPad] IndexedDB token write failed, using localStorage', error);
    writeFallback(FALLBACK_TOKEN_KEY, normalized);
  }

  return normalized;
};

export const clearStoredToken = async () => {
  if (!hasIndexedDB()) {
    writeFallback(FALLBACK_TOKEN_KEY, '');
    return;
  }

  try {
    await deleteFromStore(SETTINGS_STORE, TOKEN_KEY);
  } catch (error) {
    console.warn('[CatPad] IndexedDB token delete failed, using localStorage', error);
    writeFallback(FALLBACK_TOKEN_KEY, '');
  }
};
