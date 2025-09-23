import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  DEFAULT_SETTINGS,
  getSettings,
  getStoredToken,
  saveSettings,
  setStoredToken,
} from '../storage';
import {
  clearGlobalGistSettings,
  readGlobalGistSettings,
  subscribeToGlobalGistSettings,
  writeGlobalGistSettings,
} from '../../../state/globalGistSettings';
import { DEFAULT_SYNC_FILENAME, mergeNoteCollections, pullFromGist, pushToGist } from '../sync';
import { formatTimestamp, hasNotesChanged } from '../utils/notes';

const useCatPadSync = (notesApi) => {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [gistToken, setGistTokenState] = useState('');
  const [syncStatus, setSyncStatus] = useState({ type: 'idle', message: 'Cloud sync disabled' });
  const [isLoading, setIsLoading] = useState(true);

  const settingsRef = useRef(DEFAULT_SETTINGS);
  const gistTokenRef = useRef('');
  const pushTimerRef = useRef(null);
  const pushInFlightRef = useRef(false);
  const initialSyncAttemptedRef = useRef(false);

  const {
    getNotesSnapshot,
    applySyncedNotes,
    lastMutation,
    error: notesError,
  } = notesApi || {};

  const persistSettings = useCallback(async (updater) => {
    let nextSettingsValue = settingsRef.current;
    setSettings((prev) => {
      const computed = typeof updater === 'function' ? updater(prev) : updater;
      nextSettingsValue = { ...DEFAULT_SETTINGS, ...computed };
      settingsRef.current = nextSettingsValue;
      return nextSettingsValue;
    });
    await saveSettings(nextSettingsValue);
    return nextSettingsValue;
  }, []);

  const applyToken = useCallback(async (token, persist) => {
    const normalized = typeof token === 'string' ? token : '';
    gistTokenRef.current = normalized;
    setGistTokenState(normalized);
    if (persist) {
      await setStoredToken(normalized);
    }
  }, []);

  const getSyncConfig = useCallback(() => {
    const current = settingsRef.current || DEFAULT_SETTINGS;
    return {
      gistId: (current.gistId || '').trim(),
      filename: (current.gistFilename || DEFAULT_SYNC_FILENAME).trim() || DEFAULT_SYNC_FILENAME,
      token: (gistTokenRef.current || '').trim(),
    };
  }, []);

  const pushToRemote = useCallback(
    async (reason = 'manual') => {
      const currentSettings = settingsRef.current;
      if (!currentSettings.syncEnabled) {
        return;
      }
      const config = getSyncConfig();
      if (!config.gistId) {
        setSyncStatus({ type: 'error', message: 'Add a GitHub gist ID to sync.' });
        return;
      }
      if (!config.token) {
        setSyncStatus({ type: 'error', message: 'Add a gist token to push changes.' });
        return;
      }
      if (pushInFlightRef.current) {
        return;
      }

      pushInFlightRef.current = true;
      setSyncStatus({
        type: 'syncing',
        message: reason === 'manual' ? 'Syncing with Cat Cloud…' : 'Auto-syncing with Cat Cloud…',
      });

      try {
        const result = await pushToGist({
          gistId: config.gistId,
          token: config.token,
          filename: config.filename,
          notes: notesApi.getNotesSnapshot(),
        });
        await persistSettings((prev) => ({
          ...prev,
          lastRemoteExportedAt: result.exportedAt,
          lastSyncedAt: result.exportedAt,
        }));
        setSyncStatus({ type: 'success', message: `Synced at ${formatTimestamp(result.exportedAt)}` });
      } catch (error) {
        console.error('[CatPad] push failed', error);
        setSyncStatus({ type: 'error', message: error.message || 'Cloud sync failed' });
      } finally {
        pushInFlightRef.current = false;
      }
    },
    [getSyncConfig, notesApi, persistSettings],
  );

  const scheduleRemotePush = useCallback(
    (reason = 'auto') => {
      if (pushTimerRef.current) {
        clearTimeout(pushTimerRef.current);
      }

      const currentSettings = settingsRef.current;
      if (!currentSettings.syncEnabled) {
        return;
      }
      if (reason !== 'manual' && !currentSettings.autoSync) {
        return;
      }

      const config = getSyncConfig();
      if (!config.gistId || !config.token) {
        return;
      }

      const delay = reason === 'manual' ? 0 : 1200;
      pushTimerRef.current = setTimeout(() => {
        pushToRemote(reason);
      }, delay);
    },
    [getSyncConfig, pushToRemote],
  );

  useEffect(() => {
    return () => {
      if (pushTimerRef.current) {
        clearTimeout(pushTimerRef.current);
      }
    };
  }, []);

  const pullFromRemote = useCallback(
    async (reason = 'manual') => {
      const currentSettings = settingsRef.current;
      if (!currentSettings.syncEnabled) {
        return;
      }

      const config = getSyncConfig();
      if (!config.gistId) {
        setSyncStatus({ type: 'error', message: 'Add a GitHub gist ID to sync.' });
        return;
      }

      setSyncStatus({
        type: 'syncing',
        message: reason === 'initial' ? 'Connecting to Cat Cloud…' : 'Fetching latest from Cat Cloud…',
      });

      try {
        const result = await pullFromGist({
          gistId: config.gistId,
          token: config.token,
          filename: config.filename,
        });
        const merged = mergeNoteCollections(
          getNotesSnapshot ? getNotesSnapshot() : [],
          result.notes,
          result.exportedAt,
          currentSettings.lastRemoteExportedAt,
        );
        if (hasNotesChanged(getNotesSnapshot ? getNotesSnapshot() : [], merged)) {
          await applySyncedNotes?.(merged);
        }
        await persistSettings((prev) => ({
          ...prev,
          lastRemoteExportedAt: result.exportedAt ?? prev.lastRemoteExportedAt,
          lastSyncedAt: result.exportedAt ?? prev.lastSyncedAt,
        }));
        setSyncStatus({ type: 'success', message: 'Cloud copy synced' });
        return true;
      } catch (error) {
        console.error('[CatPad] pull failed', error);
        setSyncStatus({ type: 'error', message: error.message || 'Failed to fetch from cloud' });
        return null;
      }
    },
    [getSyncConfig, notesApi, persistSettings],
  );

  useEffect(() => {
    let isMounted = true;
    const loadSettings = async () => {
      setIsLoading(true);
      try {
        const [storedSettings, storedToken] = await Promise.all([
          getSettings(),
          getStoredToken(),
        ]);
        if (!isMounted) {
          return;
        }
        const baseSettings = { ...DEFAULT_SETTINGS, ...storedSettings };
        const globalSettings = readGlobalGistSettings();
        const globalGistId = typeof globalSettings.gistId === 'string' ? globalSettings.gistId.trim() : '';
        const globalToken = typeof globalSettings.token === 'string' ? globalSettings.token : '';
        const mergedSettings = globalGistId
          ? { ...baseSettings, gistId: globalGistId, syncEnabled: true }
          : baseSettings;
        const appliedSettings = await persistSettings(mergedSettings);
        const rememberedToken = appliedSettings.rememberToken ? storedToken : '';
        await applyToken(rememberedToken, appliedSettings.rememberToken);
        if (globalGistId || globalToken) {
          await applyToken(globalToken, appliedSettings.rememberToken);
        } else if (appliedSettings.rememberToken) {
          const localGistId = (appliedSettings.gistId || '').trim();
          if (localGistId || gistTokenRef.current) {
            writeGlobalGistSettings({ gistId: localGistId, token: gistTokenRef.current });
          }
        }
        if (appliedSettings.lastSyncedAt) {
          setSyncStatus({
            type: 'success',
            message: `Last synced ${formatTimestamp(appliedSettings.lastSyncedAt)}`,
          });
        } else if (!appliedSettings.syncEnabled) {
          setSyncStatus({ type: 'idle', message: 'Cloud sync disabled' });
        }
      } catch (error) {
        console.error('[CatPad] Failed to load sync settings', error);
        if (!isMounted) return;
        setSyncStatus({ type: 'error', message: 'Failed to load sync settings.' });
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadSettings();

    return () => {
      isMounted = false;
    };
  }, [applyToken, persistSettings]);

  useEffect(() => {
    const unsubscribe = subscribeToGlobalGistSettings((nextGlobal) => {
      if (!nextGlobal) {
        return;
      }

      const trimmedId = typeof nextGlobal.gistId === 'string' ? nextGlobal.gistId.trim() : '';
      const nextToken = typeof nextGlobal.token === 'string' ? nextGlobal.token : '';
      const previousSettings = settingsRef.current || DEFAULT_SETTINGS;
      const previousGistId = (previousSettings.gistId || '').trim();
      const previousToken = gistTokenRef.current || '';
      const desiredSyncEnabled = Boolean(trimmedId);

      if (
        trimmedId === previousGistId
        && nextToken === previousToken
        && previousSettings.syncEnabled === desiredSyncEnabled
      ) {
        return;
      }

      (async () => {
        try {
          if (trimmedId !== previousGistId || previousSettings.syncEnabled !== desiredSyncEnabled) {
            await persistSettings((prev) => ({
              ...prev,
              gistId: trimmedId,
              syncEnabled: desiredSyncEnabled,
            }));
          }

          if (nextToken !== previousToken) {
            await applyToken(nextToken, settingsRef.current.rememberToken);
          }

          initialSyncAttemptedRef.current = false;
          const effectiveGistId = trimmedId || (settingsRef.current.gistId || '').trim();
          if (effectiveGistId) {
            pullFromRemote('initial');
          }
        } catch (error) {
          console.error('[CatPad] Failed to apply global gist settings', error);
        }
      })();
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [applyToken, persistSettings, pullFromRemote]);

  useEffect(() => {
    if (isLoading) return;
    if (!settings.syncEnabled) return;
    if (!settings.gistId) return;
    if (initialSyncAttemptedRef.current) return;
    initialSyncAttemptedRef.current = true;
    pullFromRemote('initial');
  }, [isLoading, pullFromRemote, settings.gistId, settings.syncEnabled]);

  useEffect(() => {
    if (!settings.syncEnabled) {
      setSyncStatus({ type: 'idle', message: 'Cloud sync disabled' });
      return;
    }
    if (!settings.gistId) {
      setSyncStatus({ type: 'idle', message: 'Add a gist ID to enable Cat Cloud sync' });
    }
  }, [settings.gistId, settings.syncEnabled]);

  useEffect(() => {
    if (!lastMutation) {
      return;
    }
    const { reason, type } = lastMutation;
    if (reason === 'remote') {
      return;
    }
    const scheduleReason = reason === 'manual' || type === 'delete' ? 'manual' : 'auto';
    scheduleRemotePush(scheduleReason);
  }, [lastMutation, scheduleRemotePush]);

  useEffect(() => {
    if (!notesError) {
      return;
    }
    setSyncStatus({ type: 'error', message: notesError });
  }, [notesError]);

  const handleSettingsChange = useCallback(
    (field, value) => {
      if (field === 'syncEnabled' || field === 'gistId') {
        initialSyncAttemptedRef.current = false;
      }

      if (field === 'gistId') {
        const raw = typeof value === 'string' ? value : '';
        const trimmed = raw.trim();
        (async () => {
          await persistSettings((prev) => ({
            ...prev,
            gistId: trimmed,
            syncEnabled: Boolean(trimmed),
          }));
          if (settingsRef.current.rememberToken && (trimmed || gistTokenRef.current)) {
            writeGlobalGistSettings({ gistId: trimmed, token: gistTokenRef.current });
          } else {
            clearGlobalGistSettings();
          }
        })();
        return;
      }

      if (field === 'syncEnabled') {
        const enabled = Boolean(value);
        persistSettings((prev) => ({ ...prev, syncEnabled: enabled }));
        return;
      }

      persistSettings((prev) => ({
        ...prev,
        [field]: value,
      }));
    },
    [persistSettings],
  );

  const canPush = useMemo(() => {
    const config = getSyncConfig();
    return settings.syncEnabled && Boolean(config.gistId) && Boolean(config.token);
  }, [getSyncConfig, settings.syncEnabled]);

  const updateTokenValue = useCallback(
    async (value) => {
      await applyToken(value, settingsRef.current.rememberToken);
      if (settingsRef.current.rememberToken) {
        const gistId = (settingsRef.current.gistId || '').trim();
        if (gistId || gistTokenRef.current) {
          writeGlobalGistSettings({ gistId, token: gistTokenRef.current });
        } else {
          clearGlobalGistSettings();
        }
      } else {
        clearGlobalGistSettings();
      }
    },
    [applyToken],
  );

  const updateRememberToken = useCallback(
    async (remember) => {
      await persistSettings((prev) => ({ ...prev, rememberToken: remember }));
      if (remember) {
        await applyToken(gistTokenRef.current, true);
        const gistId = (settingsRef.current.gistId || '').trim();
        if (gistId || gistTokenRef.current) {
          writeGlobalGistSettings({ gistId, token: gistTokenRef.current });
        }
      } else {
        await setStoredToken('');
        clearGlobalGistSettings();
      }
    },
    [applyToken, persistSettings],
  );

  return {
    settings,
    gistToken,
    syncStatus,
    isLoading,
    canPush,
    handleSettingsChange,
    updateTokenValue,
    updateRememberToken,
    pushToRemote,
    pullFromRemote,
  };
};

export default useCatPadSync;
