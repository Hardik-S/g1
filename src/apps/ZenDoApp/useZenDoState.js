import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createSnapshot,
  fetchGistSnapshot,
  loadSettings,
  loadState,
  pushGistSnapshot,
  saveSettings,
  saveState,
} from './storage';
import {
  readGlobalGistSettings,
  subscribeToGlobalGistSettings,
  GLOBAL_GIST_SETTINGS_CLIENT_ID,
} from '../../state/globalGistSettings';
import {
  assignFocusBucket,
  assignTaskToDay,
  normalizeTaskCollection,
  recalculateTaskTree,
  reorderDayAssignments,
  reorderFocusBucket,
  removeDayAssignment,
  removeFocusBucket,
  toggleTaskCompletion,
  updateTask,
  deleteTask,
  insertTaskAtPosition,
} from './taskUtils';

const defaultSyncStatus = {
  type: 'idle',
  message: 'Local only',
};

const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

const normalizeTasks = (tasks) => recalculateTaskTree(normalizeTaskCollection(tasks));

export const useZenDoState = () => {
  const [tasks, setTasksState] = useState([]);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [syncStatus, setSyncStatus] = useState(defaultSyncStatus);
  const [gistConfigState, setGistConfigState] = useState({
    gistId: '',
    gistToken: '',
    filename: undefined,
    lastSyncedAt: null,
  });
  const [error, setError] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const tasksRef = useRef([]);
  const pushTimerRef = useRef(null);
  const initializingRef = useRef(true);
  const pullingRef = useRef(false);
  const pushingRef = useRef(false);
  const gistConfigRef = useRef(gistConfigState);
  const isReadyRef = useRef(false);
  const initialPullGistIdRef = useRef(null);
  const skipNextGlobalPullRef = useRef(false);

  const setGistConfig = useCallback((updater) => {
    setGistConfigState((prev) => {
      const nextValue = typeof updater === 'function' ? updater(prev) : updater;
      if (!nextValue || typeof nextValue !== 'object') {
        gistConfigRef.current = prev;
        return prev;
      }
      const merged = { ...prev, ...nextValue };
      gistConfigRef.current = merged;
      return merged;
    });
  }, []);

  const gistConfig = gistConfigState;

  const persistSettings = useCallback((config) => {
    const nextSettings = {
      gistId: config?.gistId || '',
      gistToken: config?.gistToken || '',
      filename: config?.filename,
      lastSyncedAt: config?.lastSyncedAt || null,
    };
    saveSettings(nextSettings);
  }, [saveSettings]);

  const markLocalGlobalSettingsUpdate = useCallback(() => {
    skipNextGlobalPullRef.current = true;
  }, []);

  const setTasks = useCallback((nextTasks, { updatedAt, markDirty = true, preserveTimestamp = false } = {}) => {
    const normalized = normalizeTasks(nextTasks);
    tasksRef.current = normalized;
    setTasksState(normalized);
    if (updatedAt !== undefined) {
      setLastUpdatedAt(updatedAt);
    } else if (!preserveTimestamp) {
      setLastUpdatedAt(new Date().toISOString());
    }
    if (!markDirty) {
      return;
    }
    schedulePush();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const schedulePush = useCallback((delay = 800) => {
    if (!gistConfig.gistId || !gistConfig.gistToken) {
      return;
    }
    if (pushTimerRef.current) {
      clearTimeout(pushTimerRef.current);
    }
    pushTimerRef.current = setTimeout(() => {
      pushTimerRef.current = null;
      pushToGist();
    }, delay);
  }, [gistConfig.gistId, gistConfig.gistToken]);

  const pushToGist = useCallback(async () => {
    const currentConfig = gistConfigRef.current;
    if (!currentConfig.gistId || !currentConfig.gistToken) return;
    if (pushingRef.current) return;
    try {
      pushingRef.current = true;
      setIsSyncing(true);
      setSyncStatus({ type: 'syncing', message: 'Syncing with gist…' });
      const snapshot = createSnapshot(tasksRef.current);
      await pushGistSnapshot({ gistId: currentConfig.gistId, token: currentConfig.gistToken, filename: currentConfig.filename }, snapshot);
      const now = new Date().toISOString();
      setSyncStatus({ type: 'success', message: 'Synced' });
      setGistConfig((prev) => ({
        ...prev,
        lastSyncedAt: now,
      }));
      persistSettings({ ...currentConfig, lastSyncedAt: now });
    } catch (pushError) {
      setSyncStatus({ type: 'error', message: pushError.message });
      setError(pushError);
    } finally {
      pushingRef.current = false;
      setIsSyncing(false);
    }
  }, [persistSettings, setGistConfig]);

  const pullFromGist = useCallback(async () => {
    const currentConfig = gistConfigRef.current;
    if (!currentConfig.gistId) {
      setSyncStatus({ type: 'error', message: 'Configure a gist ID first' });
      return;
    }
    if (pullingRef.current) {
      return;
    }
    try {
      pullingRef.current = true;
      setIsSyncing(true);
      setSyncStatus({ type: 'syncing', message: 'Fetching gist…' });
      initialPullGistIdRef.current = currentConfig.gistId;
      const remote = await fetchGistSnapshot({
        gistId: currentConfig.gistId,
        token: currentConfig.gistToken,
        filename: currentConfig.filename,
      });
      const remoteUpdated = remote.lastUpdatedAt ? Date.parse(remote.lastUpdatedAt) : 0;
      const localUpdated = lastUpdatedAt ? Date.parse(lastUpdatedAt) : 0;
      if (!remote.tasks || remote.tasks.length === 0) {
        setSyncStatus({ type: 'success', message: 'Fetched empty gist' });
      }
      if (remoteUpdated > localUpdated) {
        setTasks(remote.tasks, { updatedAt: remote.lastUpdatedAt || new Date().toISOString(), markDirty: false, preserveTimestamp: true });
        setSyncStatus({ type: 'success', message: 'Pulled latest tasks' });
      } else {
        setSyncStatus({ type: 'success', message: 'Already up to date' });
      }
      setGistConfig((prev) => ({
        ...prev,
        lastSyncedAt: remote.lastUpdatedAt || prev.lastSyncedAt,
      }));
      persistSettings({
        ...currentConfig,
        lastSyncedAt: remote.lastUpdatedAt || currentConfig.lastSyncedAt,
      });
    } catch (pullError) {
      setSyncStatus({ type: 'error', message: pullError.message });
      setError(pullError);
    } finally {
      pullingRef.current = false;
      setIsSyncing(false);
    }
  }, [lastUpdatedAt, persistSettings, setGistConfig, setTasks]);

  useEffect(() => {
    const init = () => {
      const localState = loadState();
      const storedSettings = loadSettings();
      const globalSettings = readGlobalGistSettings();
      const mergedSettings = {
        ...storedSettings,
        ...globalSettings,
      };
      setTasks(localState.tasks || [], { updatedAt: localState.lastUpdatedAt, markDirty: false, preserveTimestamp: true });
      setGistConfig((prev) => ({
        ...prev,
        ...storedSettings,
        ...globalSettings,
      }));
      initializingRef.current = false;
      setSyncStatus(mergedSettings?.gistId ? { type: 'idle', message: 'Ready to sync' } : defaultSyncStatus);
      isReadyRef.current = true;
      setIsReady(true);
    };
    init();
    return () => {
      if (pushTimerRef.current) {
        clearTimeout(pushTimerRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isReady) return;
    saveState({ tasks: tasksRef.current, lastUpdatedAt });
  }, [isReady, tasksRef, lastUpdatedAt]);

  useEffect(() => {
    if (!isReady) return;
    persistSettings(gistConfig);
  }, [gistConfig, isReady, persistSettings]);

  useEffect(() => {
    if (!isReady || !gistConfig.gistId) return;
    if (initialPullGistIdRef.current === gistConfig.gistId) return;
    initialPullGistIdRef.current = gistConfig.gistId;
    pullFromGist();
  }, [gistConfig.gistId, isReady, pullFromGist]);

  useEffect(() => {
    if (gistConfig.gistId) return;
    initialPullGistIdRef.current = null;
  }, [gistConfig.gistId]);

  useEffect(() => {
    isReadyRef.current = isReady;
  }, [isReady]);

  useEffect(() => {
    const unsubscribe = subscribeToGlobalGistSettings((nextSettings, meta = {}) => {
      if (!nextSettings || typeof nextSettings !== 'object') {
        return;
      }
      setGistConfig((prev) => ({
        ...prev,
        ...nextSettings,
      }));
      if (!isReadyRef.current || !nextSettings.gistId) {
        skipNextGlobalPullRef.current = false;
        return;
      }
      const sameClient = meta?.clientId && meta.clientId === GLOBAL_GIST_SETTINGS_CLIENT_ID;
      if (sameClient && skipNextGlobalPullRef.current) {
        skipNextGlobalPullRef.current = false;
        return;
      }
      skipNextGlobalPullRef.current = false;
      initialPullGistIdRef.current = nextSettings.gistId;
      pullFromGist();
    });
    return unsubscribe;
  }, [pullFromGist, setGistConfig]);

  const updateTasks = useCallback((updater) => {
    setTasksState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      const normalized = normalizeTasks(next);
      tasksRef.current = normalized;
      setLastUpdatedAt(new Date().toISOString());
      schedulePush();
      return normalized;
    });
  }, [schedulePush]);

  const mutateTask = useCallback((taskId, updater) => {
    updateTasks((current) => updateTask(current, taskId, updater));
  }, [updateTasks]);

  const removeTask = useCallback((taskId) => {
    updateTasks((current) => deleteTask(current, taskId));
  }, [updateTasks]);

  const completeTask = useCallback((taskId, completed = null) => {
    updateTasks((current) => toggleTaskCompletion(current, taskId, completed));
  }, [updateTasks]);

  const placeTaskInDay = useCallback((taskId, dayKey, position = 0) => {
    updateTasks((current) => assignTaskToDay(current, taskId, dayKey, position));
  }, [updateTasks]);

  const reorderDay = useCallback((dayKey, orderedIds) => {
    updateTasks((current) => reorderDayAssignments(current, dayKey, orderedIds));
  }, [updateTasks]);

  const placeInFocusBucket = useCallback((taskId, bucket, position = 0) => {
    updateTasks((current) => assignFocusBucket(current, taskId, bucket, position));
  }, [updateTasks]);

  const reorderFocus = useCallback((bucket, orderedIds) => {
    updateTasks((current) => reorderFocusBucket(current, bucket, orderedIds));
  }, [updateTasks]);

  const clearFocus = useCallback((taskId) => {
    updateTasks((current) => removeFocusBucket(current, taskId));
  }, [updateTasks]);

  const clearDay = useCallback((taskId) => {
    updateTasks((current) => removeDayAssignment(current, taskId));
  }, [updateTasks]);

  const appendTask = useCallback((task, parentId = null) => {
    updateTasks((current) => insertTaskAtPosition(current, task, parentId));
  }, [updateTasks]);

  return {
    tasks,
    lastUpdatedAt,
    gistConfig,
    setGistConfig,
    markLocalGlobalSettingsUpdate,
    syncStatus,
    error,
    isReady,
    isSyncing,
    pullFromGist,
    pushToGist,
    mutateTask,
    removeTask,
    completeTask,
    placeTaskInDay,
    reorderDay,
    placeInFocusBucket,
    reorderFocus,
    clearFocus,
    clearDay,
    appendTask,
    setTasks,
    schedulePush,
    DAYS,
  };
};

export default useZenDoState;
