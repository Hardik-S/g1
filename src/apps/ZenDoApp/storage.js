const STATE_KEY = 'zen-do:state';
const SETTINGS_KEY = 'zen-do:settings';
export const DEFAULT_GIST_FILENAME = 'zen-do-data.json';

const getStorage = () => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }
  return window.localStorage;
};

const readJson = (key, fallback) => {
  try {
    const storage = getStorage();
    if (!storage) return fallback;
    const raw = storage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (error) {
    return fallback;
  }
};

const writeJson = (key, value) => {
  try {
    const storage = getStorage();
    if (!storage) return false;
    if (value === undefined) {
      storage.removeItem(key);
      return true;
    }
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    return false;
  }
};

export const loadState = () => readJson(STATE_KEY, {
  tasks: [],
  lastUpdatedAt: null,
});

export const saveState = (state) => writeJson(STATE_KEY, state);

export const loadSettings = () => readJson(SETTINGS_KEY, {
  gistId: '',
  gistToken: '',
  filename: DEFAULT_GIST_FILENAME,
  lastSyncedAt: null,
});

export const saveSettings = (settings) => writeJson(SETTINGS_KEY, settings);

const createHeaders = (token) => {
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/vnd.github+json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
};

export const fetchGistSnapshot = async ({ gistId, token, filename = DEFAULT_GIST_FILENAME }) => {
  if (!gistId) {
    throw new Error('Gist ID is not configured');
  }
  const response = await fetch(`https://api.github.com/gists/${gistId}`, {
    headers: createHeaders(token),
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Failed to fetch gist: ${response.status} ${message}`);
  }
  const payload = await response.json();
  const file = payload.files?.[filename];
  if (!file || !file.content) {
    return {
      tasks: [],
      lastUpdatedAt: null,
    };
  }
  try {
    const parsed = JSON.parse(file.content);
    return {
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
      lastUpdatedAt: parsed.lastUpdatedAt || null,
    };
  } catch (error) {
    throw new Error('Failed to parse gist content');
  }
};

export const pushGistSnapshot = async ({ gistId, token, filename = DEFAULT_GIST_FILENAME }, data) => {
  if (!gistId) {
    throw new Error('Gist ID is not configured');
  }
  if (!token) {
    throw new Error('A GitHub token with gist scope is required to update the gist');
  }
  const response = await fetch(`https://api.github.com/gists/${gistId}`, {
    method: 'PATCH',
    headers: createHeaders(token),
    body: JSON.stringify({
      files: {
        [filename]: {
          content: JSON.stringify(data, null, 2),
        },
      },
    }),
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Failed to push gist: ${response.status} ${message}`);
  }
  const payload = await response.json();
  return payload;
};

export const createSnapshot = (tasks) => ({
  tasks,
  lastUpdatedAt: new Date().toISOString(),
});
