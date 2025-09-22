import {
  readGlobalGistSettings,
  writeGlobalGistSettings,
  subscribeToGlobalGistSettings,
  clearGlobalGistSettings,
  GLOBAL_GIST_SETTINGS_CLIENT_ID,
  __resetGlobalGistSettingsForTests,
} from '../globalGistSettings';
import MockBroadcastChannel from '../testUtils/mockBroadcastChannel';

const COOKIE_NAME = 'g1:gist-settings';

const removeCookie = () => {
  document.cookie = `${COOKIE_NAME}=; max-age=0; path=/;`;
};

const parseCookie = () => {
  const cookies = document.cookie ? document.cookie.split(';') : [];
  for (const entry of cookies) {
    const [name, ...rest] = entry.split('=');
    if (name && name.trim() === COOKIE_NAME) {
      try {
        return JSON.parse(decodeURIComponent(rest.join('=')));
      } catch (error) {
        return null;
      }
    }
  }
  return null;
};

describe('state/globalGistSettings', () => {
  const originalBroadcastChannel = global.BroadcastChannel;

  beforeAll(() => {
    global.BroadcastChannel = MockBroadcastChannel;
  });

  afterAll(() => {
    global.BroadcastChannel = originalBroadcastChannel;
  });

  beforeEach(() => {
    __resetGlobalGistSettingsForTests();
    MockBroadcastChannel.reset();
    localStorage.clear();
    removeCookie();
    clearGlobalGistSettings();
    removeCookie();
  });

  test('readGlobalGistSettings returns defaults when storage is empty', () => {
    expect(readGlobalGistSettings()).toEqual({ gistId: '', gistToken: '', token: '' });
  });

  test('readGlobalGistSettings gracefully handles malformed cookies', () => {
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent('not-json')}; path=/;`;
    expect(readGlobalGistSettings()).toEqual({ gistId: '', gistToken: '', token: '' });
  });

  test('writeGlobalGistSettings normalizes values and notifies subscribers with meta details', () => {
    const listener = jest.fn();
    subscribeToGlobalGistSettings(listener);

    const result = writeGlobalGistSettings({ gistId: '  abc123  ', token: '  shh  ' });

    expect(result).toEqual({ gistId: 'abc123', gistToken: 'shh', token: 'shh' });
    expect(readGlobalGistSettings()).toEqual({ gistId: 'abc123', gistToken: 'shh', token: 'shh' });

    const stored = localStorage.getItem('g1:gist-settings');
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored)).toMatchObject({ gistId: 'abc123', gistToken: 'shh', token: 'shh' });

    const cookie = parseCookie();
    expect(cookie).toMatchObject({ gistId: 'abc123', gistToken: 'shh', token: 'shh' });

    expect(listener).toHaveBeenCalledTimes(1);
    const [payload, meta] = listener.mock.calls[0];
    expect(payload).toEqual({ gistId: 'abc123', gistToken: 'shh', token: 'shh' });
    expect(meta).toMatchObject({ source: 'local', clientId: GLOBAL_GIST_SETTINGS_CLIENT_ID });
    expect(typeof meta.timestamp).toBe('number');
  });

  test('storage events propagate updates to subscribers', () => {
    const listener = jest.fn();
    subscribeToGlobalGistSettings(listener);

    const remotePayload = {
      gistId: 'remote-id',
      gistToken: 'remote-token',
      token: 'remote-token',
      __source: 'remote-client',
      __ts: Date.now(),
    };

    localStorage.setItem('g1:gist-settings', JSON.stringify(remotePayload));
    const event = new Event('storage');
    Object.assign(event, { key: 'g1:gist-settings', newValue: JSON.stringify(remotePayload) });
    window.dispatchEvent(event);

    expect(listener).toHaveBeenCalledWith(
      { gistId: 'remote-id', gistToken: 'remote-token', token: 'remote-token' },
      expect.objectContaining({ source: 'storage', clientId: 'remote-client' }),
    );
    expect(readGlobalGistSettings()).toEqual({ gistId: 'remote-id', gistToken: 'remote-token', token: 'remote-token' });
  });

  test('broadcast messages from other clients update cached settings', () => {
    const listener = jest.fn();
    subscribeToGlobalGistSettings(listener);

    const remoteChannel = new BroadcastChannel('g1:gist-settings');
    const message = {
      gistId: 'broadcast-id',
      gistToken: 'broadcast-token',
      token: 'broadcast-token',
      __source: 'remote-peer',
      __ts: Date.now(),
    };

    remoteChannel.postMessage(message);

    expect(listener).toHaveBeenCalledWith(
      { gistId: 'broadcast-id', gistToken: 'broadcast-token', token: 'broadcast-token' },
      expect.objectContaining({ source: 'broadcast', clientId: 'remote-peer' }),
    );
    expect(readGlobalGistSettings()).toEqual({ gistId: 'broadcast-id', gistToken: 'broadcast-token', token: 'broadcast-token' });
  });

  test('clearGlobalGistSettings resets persistence and notifies listeners', () => {
    writeGlobalGistSettings({ gistId: 'value', gistToken: 'token' });

    const listener = jest.fn();
    subscribeToGlobalGistSettings(listener);

    clearGlobalGistSettings();

    expect(readGlobalGistSettings()).toEqual({ gistId: '', gistToken: '', token: '' });
    expect(localStorage.getItem('g1:gist-settings')).toBeNull();
    expect(parseCookie()).toBeNull();
    expect(listener).toHaveBeenCalledWith(
      { gistId: '', gistToken: '', token: '' },
      expect.objectContaining({ source: 'local', clientId: GLOBAL_GIST_SETTINGS_CLIENT_ID }),
    );
  });
});
