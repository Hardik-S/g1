const COOKIE_NAME = 'g1GlobalGistSettings';
const STORAGE_KEY = 'g1:globalGistSettings';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

const subscribers = new Set();
let cachedValue = null;
let storageListenerInitialized = false;

const isBrowser = () => typeof window !== 'undefined' && typeof document !== 'undefined';

const normalizeSettings = (value) => {
  if (!value || typeof value !== 'object') {
    return { gistId: '', token: '' };
  }

  const gistId = typeof value.gistId === 'string' ? value.gistId.trim() : '';
  const token = typeof value.token === 'string' ? value.token : '';

  return { gistId, token };
};

const shallowEqual = (a, b) => {
  return (a?.gistId || '') === (b?.gistId || '') && (a?.token || '') === (b?.token || '');
};

const readCookieValue = () => {
  if (!isBrowser()) {
    return null;
  }

  const cookieSource = document.cookie || '';
  const entries = cookieSource.split(';');
  for (let index = 0; index < entries.length; index += 1) {
    const part = entries[index].trim();
    if (!part) continue;
    if (part.startsWith(`${COOKIE_NAME}=`)) {
      const raw = part.slice(COOKIE_NAME.length + 1);
      try {
        const decoded = decodeURIComponent(raw);
        const parsed = JSON.parse(decoded);
        return normalizeSettings(parsed);
      } catch (error) {
        console.warn('[g1] Failed to parse global gist settings cookie.', error);
        return { gistId: '', token: '' };
      }
    }
  }

  return null;
};

const writeCookieValue = (value) => {
  if (!isBrowser()) {
    return;
  }

  try {
    const serialized = JSON.stringify(value);
    const encoded = encodeURIComponent(serialized);
    const cookie = `${COOKIE_NAME}=${encoded}; Max-Age=${COOKIE_MAX_AGE}; Path=/; SameSite=Lax`;
    document.cookie = cookie;
  } catch (error) {
    console.warn('[g1] Unable to persist global gist settings cookie.', error);
  }
};

const clearCookieValue = () => {
  if (!isBrowser()) {
    return;
  }

  try {
    document.cookie = `${COOKIE_NAME}=; Max-Age=0; Path=/; SameSite=Lax`;
  } catch (error) {
    console.warn('[g1] Unable to clear global gist settings cookie.', error);
  }
};

const readStorageValue = () => {
  if (!isBrowser() || !window.localStorage) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    return normalizeSettings(parsed);
  } catch (error) {
    console.warn('[g1] Failed to parse global gist settings from storage.', error);
    return { gistId: '', token: '' };
  }
};

const writeStorageValue = (value) => {
  if (!isBrowser() || !window.localStorage) {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch (error) {
    console.warn('[g1] Unable to persist global gist settings to storage.', error);
  }
};

const clearStorageValue = () => {
  if (!isBrowser() || !window.localStorage) {
    return;
  }

  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('[g1] Unable to clear global gist settings from storage.', error);
  }
};

const notifySubscribers = (value) => {
  if (!subscribers.size) {
    return;
  }

  subscribers.forEach((callback) => {
    try {
      callback(value);
    } catch (error) {
      console.error('[g1] Global gist settings subscriber failed.', error);
    }
  });
};

const ensureStorageListener = () => {
  if (storageListenerInitialized || !isBrowser()) {
    return;
  }

  storageListenerInitialized = true;

  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY) {
      return;
    }

    let nextValue;
    if (event.newValue) {
      try {
        nextValue = normalizeSettings(JSON.parse(event.newValue));
      } catch (error) {
        console.warn('[g1] Failed to parse global gist settings from storage event.', error);
        nextValue = { gistId: '', token: '' };
      }
    } else {
      nextValue = { gistId: '', token: '' };
    }
    const current = cachedValue || { gistId: '', token: '' };
    if (shallowEqual(current, nextValue)) {
      return;
    }

    cachedValue = nextValue;
    writeCookieValue(nextValue);
    notifySubscribers(nextValue);
  });
};

export const readGlobalGistSettings = () => {
  if (!cachedValue) {
    const cookieValue = readCookieValue();
    if (cookieValue) {
      cachedValue = cookieValue;
    } else {
      const storedValue = readStorageValue();
      cachedValue = storedValue || { gistId: '', token: '' };
    }
  }

  ensureStorageListener();

  return { ...cachedValue };
};

const updateGlobalSettings = (value) => {
  const normalized = normalizeSettings(value);
  ensureStorageListener();

  if (shallowEqual(cachedValue, normalized)) {
    return normalized;
  }

  cachedValue = normalized;
  writeCookieValue(normalized);
  writeStorageValue(normalized);
  notifySubscribers({ ...normalized });
  return normalized;
};

export const writeGlobalGistSettings = (value) => {
  return updateGlobalSettings(value);
};

export const clearGlobalGistSettings = () => {
  cachedValue = { gistId: '', token: '' };
  clearCookieValue();
  clearStorageValue();
  notifySubscribers({ ...cachedValue });
};

export const subscribeToGlobalGistSettings = (callback) => {
  ensureStorageListener();
  if (typeof callback !== 'function') {
    return () => {};
  }

  subscribers.add(callback);
  return () => {
    subscribers.delete(callback);
  };
};
