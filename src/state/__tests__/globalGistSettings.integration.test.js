import React from 'react';
import { act, render, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AppLauncher from '../../components/AppLauncher';
import CatPadApp from '../../apps/CatPadApp/CatPadApp';
import { clearGlobalGistSettings, __resetGlobalGistSettingsForTests } from '../globalGistSettings';
import MockBroadcastChannel from '../testUtils/mockBroadcastChannel';

jest.mock('../../apps/CatPadApp/storage', () => {
  const DEFAULT_SETTINGS = {
    syncEnabled: false,
    autoSync: true,
    gistId: '',
    gistFilename: 'catpad-notes.json',
    rememberToken: true,
    lastRemoteExportedAt: null,
    lastSyncedAt: null,
  };

  let settings = { ...DEFAULT_SETTINGS };
  let notes = [];
  let token = '';

  return {
    __esModule: true,
    DEFAULT_SETTINGS,
    getAllNotes: jest.fn(async () => [...notes]),
    getSettings: jest.fn(async () => ({ ...settings })),
    getStoredToken: jest.fn(async () => token),
    replaceAllNotes: jest.fn(async (next) => {
      notes = Array.isArray(next) ? [...next] : [];
    }),
    saveNote: jest.fn(async (note) => {
      const index = notes.findIndex((entry) => entry.id === note.id);
      if (index === -1) {
        notes.push({ ...note });
      } else {
        notes[index] = { ...notes[index], ...note };
      }
    }),
    deleteNote: jest.fn(async (id) => {
      notes = notes.filter((note) => note.id !== id);
    }),
    saveSettings: jest.fn(async (next) => {
      settings = { ...DEFAULT_SETTINGS, ...(next || {}) };
      return { ...settings };
    }),
    setStoredToken: jest.fn(async (value) => {
      token = typeof value === 'string' ? value : '';
    }),
    __resetMockState: () => {
      settings = { ...DEFAULT_SETTINGS };
      notes = [];
      token = '';
    },
  };
});

jest.mock('../../apps/CatPadApp/sync', () => ({
  __esModule: true,
  DEFAULT_SYNC_FILENAME: 'catpad-notes.json',
  mergeNoteCollections: jest.fn((local = [], remote = []) => remote || local),
  pullFromGist: jest.fn(async () => ({ notes: [], metadata: {} })),
  pushToGist: jest.fn(async () => ({ exportedAt: Date.now() })),
}));

describe('global gist settings integration', () => {
  const originalBroadcastChannel = global.BroadcastChannel;
  const storageModule = require('../../apps/CatPadApp/storage');

  beforeAll(() => {
    global.BroadcastChannel = MockBroadcastChannel;
  });

  afterAll(() => {
    global.BroadcastChannel = originalBroadcastChannel;
  });

  beforeEach(() => {
    __resetGlobalGistSettingsForTests();
    MockBroadcastChannel.reset();
    storageModule.__resetMockState();
    localStorage.clear();
    document.cookie = 'g1:gist-settings=; max-age=0; path=/;';
    clearGlobalGistSettings();
    document.cookie = 'g1:gist-settings=; max-age=0; path=/;';
  });

  test('remote tab updates keep AppLauncher and CatPad in sync', async () => {
    const user = userEvent.setup();

    const launcher = render(
      <MemoryRouter>
        <AppLauncher />
      </MemoryRouter>,
    );

    await user.click(launcher.getByRole('button', { name: /settings/i }));
    const launcherDialog = await launcher.findByRole('dialog', { name: /GitHub Gist Sync/i });
    const launcherGistInput = within(launcherDialog).getByLabelText('Gist ID');
    const launcherTokenInput = within(launcherDialog).getByLabelText('Personal Access Token');

    const catPad = render(<CatPadApp />);
    const catPadSettings = await catPad.findByLabelText('Cloud sync settings');
    const catPadGistInput = within(catPadSettings).getByLabelText('Gist ID');
    const catPadTokenInput = within(catPadSettings).getByLabelText('GitHub token');

    await waitFor(() => {
      expect(catPadGistInput).toHaveValue('');
      expect(catPadTokenInput).toHaveValue('');
    });

    const remoteChannel = new BroadcastChannel('g1:gist-settings');
    const payload = {
      gistId: 'shared-gist',
      gistToken: 'kitten-secret',
      token: 'kitten-secret',
      __source: 'remote-tab',
      __ts: Date.now(),
    };

    await act(async () => {
      localStorage.setItem('g1:gist-settings', JSON.stringify(payload));
      const storageEvent = new Event('storage');
      Object.assign(storageEvent, { key: 'g1:gist-settings', newValue: JSON.stringify(payload) });
      window.dispatchEvent(storageEvent);
      remoteChannel.postMessage(payload);
    });

    await waitFor(() => {
      expect(launcherGistInput).toHaveValue('shared-gist');
      expect(launcherTokenInput).toHaveValue('kitten-secret');
    });

    await waitFor(() => {
      expect(catPadGistInput).toHaveValue('shared-gist');
      expect(catPadTokenInput).toHaveValue('kitten-secret');
    });
  });
});
