const STORAGE_KEY = 'globalGistSettings';
const defaultSettings = { gistId: '', gistToken: '' };

let currentSettings = { ...defaultSettings };
const subscribers = new Set();

const parseSettings = (value) => {
  if (!value) {
    return { ...defaultSettings };
  }

  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === 'object') {
      return {
        gistId: typeof parsed.gistId === 'string' ? parsed.gistId : '',
        gistToken: typeof parsed.gistToken === 'string' ? parsed.gistToken : '',
      };
    }
  } catch (error) {
    // ignore malformed storage value
  }

  return { ...defaultSettings };
};

if (typeof window !== 'undefined') {
  try {
    const storedValue = window.localStorage.getItem(STORAGE_KEY);
    currentSettings = parseSettings(storedValue);
  } catch (error) {
    currentSettings = { ...defaultSettings };
  }

  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY) return;
    currentSettings = parseSettings(event.newValue);
    subscribers.forEach((listener) => {
      try {
        listener({ ...currentSettings });
      } catch (listenerError) {
        // ignore listener errors to keep other subscribers notified
      }
    });
  });
}

export const readGlobalGistSettings = () => ({ ...currentSettings });

export const writeGlobalGistSettings = (nextSettings = {}) => {
  const next = {
    gistId: typeof nextSettings.gistId === 'string' ? nextSettings.gistId.trim() : '',
    gistToken: typeof nextSettings.gistToken === 'string' ? nextSettings.gistToken.trim() : '',
  };

  currentSettings = next;

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(currentSettings));
    } catch (error) {
      // Swallow storage errors (e.g., quota exceeded, privacy mode)
    }
  }

  subscribers.forEach((listener) => {
    try {
      listener({ ...currentSettings });
    } catch (listenerError) {
      // ignore listener errors to keep other subscribers notified
    }
  });

  return { ...currentSettings };
};

export const subscribeToGlobalGistSettings = (listener) => {
  if (typeof listener !== 'function') {
    return () => {};
  }

  subscribers.add(listener);
  return () => {
    subscribers.delete(listener);
  };
};
