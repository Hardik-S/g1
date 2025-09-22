const COOKIE_NAME = 'g1:gist-settings';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year
const STORAGE_BROADCAST_KEY = 'g1:gist-settings:broadcast';
const CHANNEL_NAME = 'g1:gist-settings';

const DEFAULT_SETTINGS = {
  gistId: '',
  gistToken: '',
};

const subscribers = new Set();
let storageListener = null;
let broadcastChannel = null;

const generateClientId = () => {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch (error) {
    // Ignore crypto errors and fall back to Math.random
  }
  return `g1-gist-${Math.random().toString(36).slice(2)}`;
};

const CLIENT_ID = generateClientId();

const normalizeSettings = (value = {}) => ({
  gistId: typeof value.gistId === 'string' ? value.gistId : '',
  gistToken: typeof value.gistToken === 'string' ? value.gistToken : '',
});

const parseCookieValue = (rawValue) => {
  if (!rawValue) return DEFAULT_SETTINGS;
  try {
    const parsed = JSON.parse(decodeURIComponent(rawValue));
    return { ...DEFAULT_SETTINGS, ...normalizeSettings(parsed) };
  } catch (error) {
    return DEFAULT_SETTINGS;
  }
};

const readCookie = () => {
  if (typeof document === 'undefined' || typeof document.cookie !== 'string') {
    return DEFAULT_SETTINGS;
  }
  const entries = document.cookie.split(';').map((entry) => entry.trim());
  const target = entries.find((entry) => entry.startsWith(`${COOKIE_NAME}=`));
  if (!target) {
    return DEFAULT_SETTINGS;
  }
  const [, rawValue] = target.split('=');
  return parseCookieValue(rawValue);
};

const writeCookie = (settings) => {
  if (typeof document === 'undefined') return;
  const serialized = encodeURIComponent(JSON.stringify(normalizeSettings(settings)));
  document.cookie = `${COOKIE_NAME}=${serialized}; max-age=${COOKIE_MAX_AGE}; path=/; SameSite=Lax`;
};

const notifySubscribers = (settings, meta = {}) => {
  subscribers.forEach((listener) => {
    try {
      listener(settings, meta);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('Global gist settings subscriber error', error);
    }
  });
};

const ensureStorageListener = () => {
  if (storageListener || typeof window === 'undefined') {
    return;
  }
  storageListener = (event) => {
    if (event.key !== STORAGE_BROADCAST_KEY || !event.newValue) return;
    try {
      const parsed = JSON.parse(event.newValue);
      const { __source: sourceClientId, __ts: timestamp, ...settings } = parsed || {};
      notifySubscribers(normalizeSettings(settings), {
        source: 'storage',
        clientId: sourceClientId || null,
        timestamp: typeof timestamp === 'number' ? timestamp : null,
      });
    } catch (error) {
      // Ignore malformed payloads
    }
  };
  window.addEventListener('storage', storageListener);
};

const ensureBroadcastChannel = () => {
  if (typeof window === 'undefined' || typeof window.BroadcastChannel !== 'function') {
    return null;
  }
  if (!broadcastChannel) {
    broadcastChannel = new window.BroadcastChannel(CHANNEL_NAME);
    broadcastChannel.addEventListener('message', (event) => {
      const payload = event?.data || {};
      if (!payload || typeof payload !== 'object') {
        notifySubscribers(normalizeSettings(payload));
        return;
      }
      const { __source: sourceClientId, __ts: timestamp, ...settings } = payload;
      notifySubscribers(normalizeSettings(settings), {
        source: 'broadcast',
        clientId: sourceClientId || null,
        timestamp: typeof timestamp === 'number' ? timestamp : null,
      });
    });
  }
  return broadcastChannel;
};

export const readGlobalGistSettings = () => normalizeSettings(readCookie());

export const writeGlobalGistSettings = (settings) => {
  const normalized = normalizeSettings(settings);
  writeCookie(normalized);
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(
        STORAGE_BROADCAST_KEY,
        JSON.stringify({ ...normalized, __ts: Date.now(), __source: CLIENT_ID }),
      );
    } catch (error) {
      // Ignore storage errors (e.g., quota exceeded)
    }
  }
  const channel = ensureBroadcastChannel();
  channel?.postMessage({ ...normalized, __ts: Date.now(), __source: CLIENT_ID });
  notifySubscribers(normalized, { source: 'local', clientId: CLIENT_ID, timestamp: Date.now() });
  return normalized;
};

export const subscribeToGlobalGistSettings = (listener) => {
  if (typeof listener !== 'function') {
    return () => {};
  }
  ensureStorageListener();
  ensureBroadcastChannel();
  subscribers.add(listener);
  return () => {
    subscribers.delete(listener);
    if (subscribers.size === 0) {
      if (storageListener && typeof window !== 'undefined') {
        window.removeEventListener('storage', storageListener);
        storageListener = null;
      }
      if (broadcastChannel) {
        broadcastChannel.close();
        broadcastChannel = null;
      }
    }
  };
};

export default {
  readGlobalGistSettings,
  writeGlobalGistSettings,
  subscribeToGlobalGistSettings,
};

export const GLOBAL_GIST_SETTINGS_CLIENT_ID = CLIENT_ID;
