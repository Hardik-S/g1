const COOKIE_NAME = 'g1_gist_settings';
const BROADCAST_CHANNEL_NAME = 'g1-gist-settings';
const ONE_YEAR_IN_SECONDS = 60 * 60 * 24 * 365;

const defaultSettings = Object.freeze({ gistId: '', gistToken: '' });

function getDocument() {
  return typeof document !== 'undefined' ? document : null;
}

function getWindow() {
  return typeof window !== 'undefined' ? window : null;
}

function normalizeSettings(input = {}) {
  const gistId = typeof input.gistId === 'string' ? input.gistId.trim() : '';
  const gistToken = typeof input.gistToken === 'string' ? input.gistToken.trim() : '';

  return { gistId, gistToken };
}

function getCustomEventConstructor() {
  const win = getWindow();
  if (win && typeof win.CustomEvent === 'function') {
    return win.CustomEvent;
  }

  if (typeof CustomEvent === 'function') {
    return CustomEvent;
  }

  return null;
}

function getBroadcastChannelConstructor() {
  const win = getWindow();
  if (win && typeof win.BroadcastChannel === 'function') {
    return win.BroadcastChannel;
  }

  if (typeof BroadcastChannel === 'function') {
    return BroadcastChannel;
  }

  return null;
}

export function readGlobalGistSettings() {
  const doc = getDocument();
  if (!doc || !doc.cookie) {
    return { ...defaultSettings };
  }

  const cookieEntries = doc.cookie.split(';');
  let rawValue = '';

  for (const entry of cookieEntries) {
    const [name, ...valueParts] = entry.split('=');
    if (name && name.trim() === COOKIE_NAME) {
      rawValue = valueParts.join('=');
      break;
    }
  }

  if (!rawValue) {
    return { ...defaultSettings };
  }

  try {
    const decoded = decodeURIComponent(rawValue);
    const parsed = JSON.parse(decoded);
    return normalizeSettings(parsed);
  } catch (error) {
    return { ...defaultSettings };
  }
}

export function writeGlobalGistSettings(settings) {
  const detail = normalizeSettings(settings);
  const doc = getDocument();

  if (doc) {
    const encoded = encodeURIComponent(JSON.stringify(detail));
    const cookieString = `${COOKIE_NAME}=${encoded}; path=/; SameSite=Lax; max-age=${ONE_YEAR_IN_SECONDS}`;
    doc.cookie = cookieString;
  }

  const win = getWindow();
  const CustomEventConstructor = getCustomEventConstructor();
  if (win && typeof win.dispatchEvent === 'function' && CustomEventConstructor) {
    const event = new CustomEventConstructor('g1:gist-settings-changed', { detail });
    win.dispatchEvent(event);
  }

  const BroadcastChannelConstructor = getBroadcastChannelConstructor();
  if (BroadcastChannelConstructor) {
    const channel = new BroadcastChannelConstructor(BROADCAST_CHANNEL_NAME);
    try {
      channel.postMessage(detail);
    } finally {
      if (typeof channel.close === 'function') {
        channel.close();
      }
    }
  }

  return detail;
}

export function subscribeToGlobalGistSettings(callback) {
  if (typeof callback !== 'function') {
    throw new TypeError('Expected callback to be a function');
  }

  const cleanups = [];
  const win = getWindow();

  if (win && typeof win.addEventListener === 'function') {
    const handler = (event) => {
      callback(normalizeSettings(event && event.detail));
    };
    win.addEventListener('g1:gist-settings-changed', handler);
    cleanups.push(() => win.removeEventListener('g1:gist-settings-changed', handler));
  }

  const BroadcastChannelConstructor = getBroadcastChannelConstructor();
  let broadcastChannel;
  let broadcastHandler;

  if (BroadcastChannelConstructor) {
    broadcastChannel = new BroadcastChannelConstructor(BROADCAST_CHANNEL_NAME);
    broadcastHandler = (event) => {
      callback(normalizeSettings(event && event.data));
    };

    if (typeof broadcastChannel.addEventListener === 'function') {
      broadcastChannel.addEventListener('message', broadcastHandler);
      cleanups.push(() => broadcastChannel.removeEventListener('message', broadcastHandler));
    } else {
      broadcastChannel.onmessage = broadcastHandler;
      cleanups.push(() => {
        if (broadcastChannel.onmessage === broadcastHandler) {
          broadcastChannel.onmessage = null;
        }
      });
    }
  }

  return () => {
    cleanups.forEach((cleanup) => {
      try {
        cleanup();
      } catch (error) {
        // ignore cleanup errors
      }
    });

    if (broadcastChannel && typeof broadcastChannel.close === 'function') {
      broadcastChannel.close();
    }
  };
}

export function clearGlobalGistSettings() {
  return writeGlobalGistSettings({ gistId: '', gistToken: '' });
}

export default {
  readGlobalGistSettings,
  writeGlobalGistSettings,
  subscribeToGlobalGistSettings,
  clearGlobalGistSettings,
};

