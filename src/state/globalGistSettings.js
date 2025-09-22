const COOKIE_NAME = 'g1:gist-settings';
const STORAGE_KEY = 'g1:gist-settings';
const BROADCAST_CHANNEL_NAME = 'g1:gist-settings';
const EVENT_NAME = 'g1:gist-settings-changed';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

const DEFAULT_SETTINGS = Object.freeze({ gistId: '', gistToken: '' });

const subscribers = new Set();
let cachedSettings = null;
let broadcastChannel = null;
let isInitialized = false;
let storageListenerAttached = false;

const detachStorageListener = () => {
  const win = getWindow();
  if (!win || typeof win.removeEventListener !== 'function') {
    return;
  }

  if (storageListenerAttached) {
    try {
      win.removeEventListener('storage', handleStorageEvent);
    } catch (error) {
      // Ignore listener removal failures.
    }
  }

  storageListenerAttached = false;
};

const CLIENT_ID = (() => {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch (error) {
    // Ignore crypto failures and fall back to Math.random.
  }

  return `g1-gist-${Math.random().toString(36).slice(2)}`;
})();

const now = () => Date.now();

const getWindow = () => (typeof window !== 'undefined' ? window : undefined);
const getDocument = () => (typeof document !== 'undefined' ? document : undefined);

const getCustomEventConstructor = () => {
  const win = getWindow();
  if (win && typeof win.CustomEvent === 'function') {
    return win.CustomEvent;
  }

  if (typeof CustomEvent === 'function') {
    return CustomEvent;
  }

  return null;
};

const getBroadcastChannelConstructor = () => {
  const win = getWindow();
  if (win && typeof win.BroadcastChannel === 'function') {
    return win.BroadcastChannel;
  }

  if (typeof BroadcastChannel === 'function') {
    return BroadcastChannel;
  }

  return null;
};

const normalizeSettings = (value = {}) => {
  const gistId = typeof value.gistId === 'string' ? value.gistId.trim() : '';
  const gistToken = typeof value.gistToken === 'string'
    ? value.gistToken.trim()
    : typeof value.token === 'string'
      ? value.token.trim()
      : '';

  return { gistId, gistToken };
};

const withAliases = (value = DEFAULT_SETTINGS) => ({
  gistId: value.gistId || '',
  gistToken: value.gistToken || '',
  token: value.gistToken || '',
});

const settingsAreEqual = (a = DEFAULT_SETTINGS, b = DEFAULT_SETTINGS) => {
  return (a.gistId || '') === (b.gistId || '') && (a.gistToken || '') === (b.gistToken || '');
};

const readCookieValue = () => {
  const doc = getDocument();
  if (!doc || !doc.cookie) {
    return null;
  }

  const entries = doc.cookie.split(';');
  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index];
    if (!entry) {
      continue;
    }

    const [rawName, ...rest] = entry.split('=');
    if (!rawName || rawName.trim() !== COOKIE_NAME) {
      continue;
    }

    const rawValue = rest.join('=');
    if (!rawValue) {
      return DEFAULT_SETTINGS;
    }

    try {
      const decoded = decodeURIComponent(rawValue);
      const parsed = JSON.parse(decoded);
      return normalizeSettings(parsed);
    } catch (error) {
      return DEFAULT_SETTINGS;
    }
  }

  return null;
};

const writeCookieValue = (value) => {
  const doc = getDocument();
  if (!doc) {
    return;
  }

  try {
    const serialized = JSON.stringify(withAliases(value));
    const encoded = encodeURIComponent(serialized);
    doc.cookie = `${COOKIE_NAME}=${encoded}; max-age=${COOKIE_MAX_AGE}; path=/; SameSite=Lax`;
  } catch (error) {
    // Swallow cookie write errors (e.g., privacy mode).
  }
};

const clearCookieValue = () => {
  const doc = getDocument();
  if (!doc) {
    return;
  }

  try {
    doc.cookie = `${COOKIE_NAME}=; max-age=0; path=/; SameSite=Lax`;
  } catch (error) {
    // Ignore cookie clearing failures.
  }
};

const readStorageValue = () => {
  const win = getWindow();
  if (!win || !win.localStorage) {
    return null;
  }

  try {
    const raw = win.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    return normalizeSettings(parsed);
  } catch (error) {
    return DEFAULT_SETTINGS;
  }
};

const writeStorageValue = (value, meta) => {
  const win = getWindow();
  if (!win || !win.localStorage) {
    return;
  }

  try {
    const payload = {
      ...withAliases(value),
      __source: meta?.clientId || CLIENT_ID,
      __ts: meta?.timestamp || now(),
    };
    win.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    // Ignore localStorage errors (e.g., quota exceeded).
  }
};

const clearStorageValue = () => {
  const win = getWindow();
  if (!win || !win.localStorage) {
    return;
  }

  try {
    win.localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    // Ignore removal failures.
  }
};

const notifySubscribers = (value, meta) => {
  subscribers.forEach((listener) => {
    try {
      listener(withAliases(value), meta);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('[g1] Global gist settings subscriber failed.', error);
    }
  });
};

const dispatchCustomEvent = (value) => {
  const win = getWindow();
  if (!win || typeof win.dispatchEvent !== 'function') {
    return;
  }

  const CustomEventConstructor = getCustomEventConstructor();
  if (!CustomEventConstructor) {
    return;
  }

  try {
    const event = new CustomEventConstructor(EVENT_NAME, { detail: withAliases(value) });
    win.dispatchEvent(event);
  } catch (error) {
    // Ignore event dispatch failures.
  }
};

const applyIncomingSettings = (nextValue, meta, { persistCookie = true } = {}) => {
  const normalized = normalizeSettings(nextValue);
  const changed = !settingsAreEqual(cachedSettings, normalized);
  cachedSettings = normalized;

  if (persistCookie) {
    writeCookieValue(cachedSettings);
  }

  if (changed) {
    notifySubscribers(cachedSettings, meta);
    dispatchCustomEvent(cachedSettings);
  }

  return cachedSettings;
};

const handleStorageEvent = (event) => {
  if (!event || event.key !== STORAGE_KEY) {
    return;
  }

  let payload = DEFAULT_SETTINGS;
  let source = null;
  let timestamp = now();

  if (event.newValue) {
    try {
      const parsed = JSON.parse(event.newValue);
      const { __source, __ts, ...rest } = parsed || {};
      payload = normalizeSettings(rest);
      source = typeof __source === 'string' ? __source : null;
      timestamp = typeof __ts === 'number' ? __ts : now();
    } catch (error) {
      payload = DEFAULT_SETTINGS;
    }
  }

  if (source && source === CLIENT_ID) {
    return;
  }

  applyIncomingSettings(payload, { source: 'storage', clientId: source, timestamp });
};

const ensureBroadcastChannel = () => {
  if (broadcastChannel) {
    return broadcastChannel;
  }

  const BroadcastChannelConstructor = getBroadcastChannelConstructor();
  if (!BroadcastChannelConstructor) {
    return null;
  }

  broadcastChannel = new BroadcastChannelConstructor(BROADCAST_CHANNEL_NAME);

  const handler = (event) => {
    const data = event?.data || {};
    const { __source, __ts, ...rest } = (data && typeof data === 'object') ? data : {};
    if (__source && __source === CLIENT_ID) {
      return;
    }
    applyIncomingSettings(rest, {
      source: 'broadcast',
      clientId: typeof __source === 'string' ? __source : null,
      timestamp: typeof __ts === 'number' ? __ts : now(),
    });
  };

  if (typeof broadcastChannel.addEventListener === 'function') {
    broadcastChannel.addEventListener('message', handler);
  } else {
    broadcastChannel.onmessage = handler;
  }

  return broadcastChannel;
};

const ensureStorageListener = () => {
  if (storageListenerAttached) {
    return;
  }

  const win = getWindow();
  if (!win || typeof win.addEventListener !== 'function') {
    return;
  }

  win.addEventListener('storage', handleStorageEvent);
  storageListenerAttached = true;
};

const initialize = () => {
  if (isInitialized) {
    return;
  }

  const fromCookie = readCookieValue();
  const fromStorage = readStorageValue();
  cachedSettings = fromCookie || fromStorage || { ...DEFAULT_SETTINGS };

  ensureStorageListener();
  ensureBroadcastChannel();

  isInitialized = true;
};

export const readGlobalGistSettings = () => {
  initialize();
  return withAliases(cachedSettings);
};

export const writeGlobalGistSettings = (value) => {
  initialize();
  const meta = { source: 'local', clientId: CLIENT_ID, timestamp: now() };
  const normalized = normalizeSettings(value);
  const changed = !settingsAreEqual(cachedSettings, normalized);
  cachedSettings = normalized;

  writeCookieValue(cachedSettings);
  writeStorageValue(cachedSettings, meta);

  const channel = ensureBroadcastChannel();
  if (channel) {
    try {
      channel.postMessage({ ...withAliases(cachedSettings), __source: meta.clientId, __ts: meta.timestamp });
    } catch (error) {
      // Ignore broadcast failures.
    }
  }

  if (changed) {
    notifySubscribers(cachedSettings, meta);
    dispatchCustomEvent(cachedSettings);
  }

  return withAliases(cachedSettings);
};

export const clearGlobalGistSettings = () => {
  initialize();
  cachedSettings = { ...DEFAULT_SETTINGS };
  clearCookieValue();
  clearStorageValue();
  const meta = { source: 'local', clientId: CLIENT_ID, timestamp: now() };
  const channel = ensureBroadcastChannel();
  if (channel) {
    try {
      channel.postMessage({ ...withAliases(cachedSettings), __source: meta.clientId, __ts: meta.timestamp });
    } catch (error) {
      // Ignore broadcast failures.
    }
  }
  notifySubscribers(cachedSettings, meta);
  dispatchCustomEvent(cachedSettings);
  return withAliases(cachedSettings);
};

export const subscribeToGlobalGistSettings = (listener) => {
  initialize();
  if (typeof listener !== 'function') {
    return () => {};
  }

  subscribers.add(listener);
  return () => {
    subscribers.delete(listener);
  };
};

export const GLOBAL_GIST_SETTINGS_CLIENT_ID = CLIENT_ID;

export const __resetGlobalGistSettingsForTests = () => {
  subscribers.clear();
  cachedSettings = null;
  if (broadcastChannel && typeof broadcastChannel.close === 'function') {
    try {
      broadcastChannel.close();
    } catch (error) {
      // Ignore close failures.
    }
  }
  broadcastChannel = null;
  detachStorageListener();
  isInitialized = false;
};

const globalScope = typeof globalThis !== 'undefined'
  ? globalThis
  : getWindow();

if (globalScope) {
  if (typeof globalScope.readGlobalGistSettings !== 'function') {
    globalScope.readGlobalGistSettings = readGlobalGistSettings;
  }
  if (typeof globalScope.writeGlobalGistSettings !== 'function') {
    globalScope.writeGlobalGistSettings = writeGlobalGistSettings;
  }
  if (typeof globalScope.subscribeToGlobalGistSettings !== 'function') {
    globalScope.subscribeToGlobalGistSettings = subscribeToGlobalGistSettings;
  }
  if (typeof globalScope.clearGlobalGistSettings !== 'function') {
    globalScope.clearGlobalGistSettings = clearGlobalGistSettings;
  }
}

export default {
  readGlobalGistSettings,
  writeGlobalGistSettings,
  subscribeToGlobalGistSettings,
  clearGlobalGistSettings,
  GLOBAL_GIST_SETTINGS_CLIENT_ID,
};
