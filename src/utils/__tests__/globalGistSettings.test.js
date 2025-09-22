import {
  readGlobalGistSettings,
  writeGlobalGistSettings,
  subscribeToGlobalGistSettings,
  clearGlobalGistSettings,
} from '../globalGistSettings';

const COOKIE_NAME = 'g1_gist_settings';

class MockBroadcastChannel {
  static channels = new Map();

  constructor(name) {
    this.name = name;
    this.listeners = new Set();
    this.onmessage = null;

    if (!MockBroadcastChannel.channels.has(name)) {
      MockBroadcastChannel.channels.set(name, new Set());
    }

    MockBroadcastChannel.channels.get(name).add(this);
  }

  postMessage(data) {
    const peers = MockBroadcastChannel.channels.get(this.name) || new Set();
    for (const channel of peers) {
      channel.dispatchMessage(data);
    }
  }

  dispatchMessage(data) {
    const event = { data };
    for (const listener of this.listeners) {
      listener(event);
    }

    if (typeof this.onmessage === 'function') {
      this.onmessage(event);
    }
  }

  addEventListener(type, handler) {
    if (type === 'message') {
      this.listeners.add(handler);
    }
  }

  removeEventListener(type, handler) {
    if (type === 'message') {
      this.listeners.delete(handler);
    }
  }

  close() {
    const peers = MockBroadcastChannel.channels.get(this.name);
    if (peers) {
      peers.delete(this);
      if (!peers.size) {
        MockBroadcastChannel.channels.delete(this.name);
      }
    }

    this.listeners.clear();
    this.onmessage = null;
  }
}

describe('globalGistSettings utilities', () => {
  const originalBroadcastChannel = global.BroadcastChannel;

  beforeAll(() => {
    global.BroadcastChannel = MockBroadcastChannel;
  });

  afterAll(() => {
    global.BroadcastChannel = originalBroadcastChannel;
  });

  beforeEach(() => {
    clearCookie();
    MockBroadcastChannel.channels.clear();
  });

  function clearCookie() {
    document.cookie = `${COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  }

  function setCookie(value) {
    document.cookie = `${COOKIE_NAME}=${value}; path=/`;
  }

  test('readGlobalGistSettings returns defaults when cookie is missing', () => {
    expect(readGlobalGistSettings()).toEqual({ gistId: '', gistToken: '' });
  });

  test('readGlobalGistSettings gracefully handles invalid JSON', () => {
    setCookie(encodeURIComponent('not-json'));
    expect(readGlobalGistSettings()).toEqual({ gistId: '', gistToken: '' });
  });

  test('readGlobalGistSettings trims values from the cookie payload', () => {
    const payload = {
      gistId: '  abc123  ',
      gistToken: '  token-value  ',
    };
    setCookie(encodeURIComponent(JSON.stringify(payload)));

    expect(readGlobalGistSettings()).toEqual({ gistId: 'abc123', gistToken: 'token-value' });
  });

  test('writeGlobalGistSettings persists cookies and broadcasts updates', () => {
    const callback = jest.fn();
    const unsubscribe = subscribeToGlobalGistSettings(callback);

    const detail = { gistId: ' my-id ', gistToken: ' my-token ' };
    writeGlobalGistSettings(detail);

    expect(readGlobalGistSettings()).toEqual({ gistId: 'my-id', gistToken: 'my-token' });
    expect(callback).toHaveBeenCalledWith({ gistId: 'my-id', gistToken: 'my-token' });
    const callsAfterWrite = callback.mock.calls.length;
    expect(callsAfterWrite).toBeGreaterThanOrEqual(1);

    unsubscribe();
    clearGlobalGistSettings();
    expect(callback.mock.calls.length).toBe(callsAfterWrite);
  });

  test('writeGlobalGistSettings does not throw when document is unavailable', () => {
    const originalDocument = global.document;
    // eslint-disable-next-line no-global-assign
    global.document = undefined;

    expect(() => writeGlobalGistSettings({ gistId: '1', gistToken: '2' })).not.toThrow();

    global.document = originalDocument;
  });
});

