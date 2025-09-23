(() => {
  const DEFAULT_DURATION = 15;
  const HOLD_DURATION_MS = 1000;
  const LEADERBOARD_FILENAME = 'cat-typing-speed-test.json';
  const LEADERBOARD_MAX_ENTRIES = 50;
  const ALIAS_STORAGE_KEY = 'cat-typing-speed-test:alias';
  const GIST_SETTINGS_EVENT = 'g1:gist-settings-changed';

  const testScreen = document.getElementById('test-screen');
  const resultsScreen = document.getElementById('results-screen');
  const timerEl = document.getElementById('timer');
  const wpmEl = document.getElementById('wpm');
  const cpmEl = document.getElementById('cpm');
  const accuracyEl = document.getElementById('accuracy');
  const textDisplay = document.getElementById('text-display');
  const typingInput = document.getElementById('typing-input');
  const restartBtn = document.getElementById('restart-btn');
  const finalWpm = document.getElementById('final-wpm');
  const finalCpm = document.getElementById('final-cpm');
  const finalAccuracy = document.getElementById('final-accuracy');
  const resultsNote = document.getElementById('results-note');
  const resultsRetry = document.getElementById('results-retry');
  const durationOptions = Array.from(document.querySelectorAll('[data-duration-option]'));
  const holdDisplays = Array.from(document.querySelectorAll('[data-hold-display]')).map(
    (container) => ({
      container,
      text: container.querySelector('[data-hold-text]'),
      fill: container.querySelector('[data-hold-fill]'),
    }),
  );
  const aliasInput = document.getElementById('leaderboard-alias');
  const syncStatusEl = document.getElementById('sync-status');
  const leaderboardList = document.getElementById('leaderboard-list');
  const leaderboardEmpty = document.getElementById('leaderboard-empty');
  const historyList =
    document.getElementById('history-list') || document.querySelector('[data-history-list]');
  const historyEmpty =
    document.getElementById('history-empty') || document.querySelector('[data-history-empty]');

  if (!testScreen || !resultsScreen || !typingInput) {
    return;
  }

  const screenRegistry = {
    test: {
      element: testScreen,
      getDefaultFocus: () => typingInput,
    },
    results: {
      element: resultsScreen,
      getDefaultFocus: () => resultsRetry,
    },
  };

  const focusableSelector = [
    'button:not([disabled])',
    '[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  let corpusCache = null;
  let corpusPromise = null;
  let countdownSeconds = DEFAULT_DURATION;
  let testDuration = DEFAULT_DURATION;
  let selectedDuration = DEFAULT_DURATION;
  let timerId = null;
  let startTimestamp = null;
  let targetText = '';
  let charSpans = [];
  let correctChars = 0;
  let typedChars = 0;
  let activeScreen = testScreen;
  let holdStartTime = null;
  let holdFrameId = null;
  let holdResetTimeout = null;
  let holdState = 'idle';

  const scheduleNextFrame = (callback) => {
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(callback);
    } else {
      setTimeout(callback, 0);
    }
  };

  const requestHoldFrame = (callback) => {
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      return window.requestAnimationFrame(callback);
    }
    return setTimeout(callback, 16);
  };

  const cancelHoldFrame = (handle) => {
    if (handle == null) return;
    if (typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function') {
      window.cancelAnimationFrame(handle);
    } else {
      clearTimeout(handle);
    }
  };

  const findFirstFocusable = (container) => {
    if (!container) return null;
    return container.querySelector(focusableSelector);
  };

  const setScreen = (screenName, { focusTarget, focus = true } = {}) => {
    const config = screenRegistry[screenName];
    if (!config || !config.element) {
      return;
    }

    Object.values(screenRegistry).forEach(({ element }) => {
      if (!element) return;
      const isActive = element === config.element;
      element.classList.toggle('hidden', !isActive);
      element.setAttribute('aria-hidden', isActive ? 'false' : 'true');
    });

    activeScreen = config.element;

    if (!focus) {
      return;
    }

    scheduleNextFrame(() => {
      const resolvedFocusTarget = typeof focusTarget === 'function' ? focusTarget() : focusTarget;

      let target = resolvedFocusTarget || (config.getDefaultFocus && config.getDefaultFocus());
      if (!target) {
        target = findFirstFocusable(config.element);
      }

      if (target && typeof target.focus === 'function') {
        try {
          target.focus({ preventScroll: true });
        } catch {
          target.focus();
        }
      }
    });
  };

  const isScreenActive = (element) => element === activeScreen;

  const formatTime = (seconds) => {
    const safeSeconds = Math.max(0, Math.floor(seconds));
    const mins = Math.floor(safeSeconds / 60)
      .toString()
      .padStart(2, '0');
    const secs = (safeSeconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const baseHoldMessage = () =>
    `Hold Space for 1 second to restart a ${selectedDuration}-second run.`;

  const renderHoldState = (state, elapsed = 0) => {
    const progress = Math.max(0, Math.min(elapsed / HOLD_DURATION_MS, 1));
    holdDisplays.forEach(({ container, text, fill }) => {
      if (container) {
        container.classList.toggle('is-active', state === 'active');
        container.classList.toggle('is-complete', state === 'complete');
        container.setAttribute('data-hold-state', state);
      }
      if (fill) {
        const width = state === 'idle' ? 0 : state === 'complete' ? 1 : progress;
        fill.style.width = `${Math.max(0, Math.min(1, width)) * 100}%`;
      }
      if (text) {
        if (state === 'idle') {
          text.textContent = baseHoldMessage();
        } else if (state === 'active') {
          const remainingMs = Math.max(0, HOLD_DURATION_MS - elapsed);
          text.textContent = `Keep holding… ${(remainingMs / 1000).toFixed(1)}s left`;
        } else if (state === 'complete') {
          text.textContent = 'Restarting now…';
        }
      }
    });
  };

  const setHoldState = (state, elapsed = 0) => {
    holdState = state;
    renderHoldState(state, elapsed);
  };

  const refreshHoldDisplays = () => {
    if (!holdDisplays.length) return;
    if (holdState === 'active') {
      const elapsed = holdStartTime ? performance.now() - holdStartTime : 0;
      renderHoldState('active', elapsed);
    } else if (holdState === 'complete') {
      renderHoldState('complete', HOLD_DURATION_MS);
    } else {
      renderHoldState('idle', 0);
    }
  };

  const clearHoldResetTimeout = () => {
    if (holdResetTimeout) {
      clearTimeout(holdResetTimeout);
      holdResetTimeout = null;
    }
  };

  const scheduleHoldIdle = (delay = 400) => {
    if (!holdDisplays.length) return;
    clearHoldResetTimeout();
    holdResetTimeout = setTimeout(() => {
      holdResetTimeout = null;
      setHoldState('idle', 0);
    }, delay);
  };

  const handleHoldFrame = () => {
    if (holdStartTime == null) {
      return;
    }
    const elapsed = performance.now() - holdStartTime;
    if (elapsed >= HOLD_DURATION_MS) {
      holdStartTime = null;
      cancelHoldFrame(holdFrameId);
      holdFrameId = null;
      clearHoldResetTimeout();
      setHoldState('complete', HOLD_DURATION_MS);
      beginTest(selectedDuration || DEFAULT_DURATION);
      scheduleHoldIdle(600);
      return;
    }
    setHoldState('active', elapsed);
    holdFrameId = requestHoldFrame(handleHoldFrame);
  };

  const startHoldTracking = () => {
    if (!holdDisplays.length) return;
    if (holdStartTime != null) {
      return;
    }
    clearHoldResetTimeout();
    holdStartTime = performance.now();
    setHoldState('active', 0);
    cancelHoldFrame(holdFrameId);
    holdFrameId = requestHoldFrame(handleHoldFrame);
  };

  const cancelHoldTracking = () => {
    if (holdStartTime == null) {
      if (holdState === 'active') {
        setHoldState('idle', 0);
      }
      return;
    }
    holdStartTime = null;
    cancelHoldFrame(holdFrameId);
    holdFrameId = null;
    clearHoldResetTimeout();
    setHoldState('idle', 0);
  };

  const readSharedGistSettings = () => {
    try {
      if (typeof window !== 'undefined' && typeof window.readGlobalGistSettings === 'function') {
        const settings = window.readGlobalGistSettings();
        const gistId = typeof settings?.gistId === 'string' ? settings.gistId.trim() : '';
        const gistToken = typeof settings?.gistToken === 'string'
          ? settings.gistToken.trim()
          : typeof settings?.token === 'string'
            ? settings.token.trim()
            : '';
        return { gistId, gistToken };
      }
    } catch {
      // Ignore global settings read failures.
    }

    try {
      if (typeof document !== 'undefined' && typeof document.cookie === 'string') {
        const cookieEntries = document.cookie.split(';');
        for (let index = 0; index < cookieEntries.length; index += 1) {
          const entry = cookieEntries[index];
          if (!entry) continue;
          const [rawName, ...rest] = entry.split('=');
          if (!rawName || rawName.trim() !== 'g1:gist-settings') continue;
          try {
            const parsed = JSON.parse(decodeURIComponent(rest.join('=')) || '{}');
            const gistId = typeof parsed?.gistId === 'string' ? parsed.gistId.trim() : '';
            const gistToken = typeof parsed?.gistToken === 'string'
              ? parsed.gistToken.trim()
              : typeof parsed?.token === 'string'
                ? parsed.token.trim()
                : '';
            return { gistId, gistToken };
          } catch {
            return { gistId: '', gistToken: '' };
          }
        }
      }
    } catch {
      // Ignore cookie parsing errors and fall back to defaults.
    }

    return { gistId: '', gistToken: '' };
  };

  const sanitizeAlias = (value) => {
    if (typeof value !== 'string') return '';
    return value.replace(/\s+/g, ' ').trim().slice(0, 32);
  };

  const readStoredAlias = () => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return '';
      }
      const raw = window.localStorage.getItem(ALIAS_STORAGE_KEY);
      return sanitizeAlias(raw || '');
    } catch {
      return '';
    }
  };

  const writeStoredAlias = (value) => {
    try {
      if (typeof window === 'undefined' || !window.localStorage) {
        return;
      }
      const sanitized = sanitizeAlias(value);
      if (!sanitized) {
        window.localStorage.removeItem(ALIAS_STORAGE_KEY);
      } else {
        window.localStorage.setItem(ALIAS_STORAGE_KEY, sanitized);
      }
    } catch {
      // Ignore storage failures (e.g., quota exceeded).
    }
  };

  let currentEmptyMessage = 'Connect GitHub access from the global settings to sync your scores.';
  let currentHistoryMessage = 'Complete a run to build your personal history.';
  let gistSettings = { gistId: '', gistToken: '' };
  let aliasValue = '';
  let storedRuns = [];
  let leaderboardEntries = [];
  let historyEntries = [];
  let gistLoaded = false;
  let gistLoadPromise = null;
  let isPersistingLeaderboard = false;
  let persistQueued = false;
  let lastSyncedAt = null;
  let gistRefreshTimeoutId = null;
  let gistSettingsUnsubscribe = null;
  let gistSettingsPollId = null;

  const setEmptyMessage = (message) => {
    if (typeof message !== 'string' || !message) {
      return;
    }
    currentEmptyMessage = message;
    if (leaderboardEmpty) {
      leaderboardEmpty.textContent = message;
    }
  };

  const setHistoryEmptyMessage = (message) => {
    if (typeof message !== 'string' || !message) {
      return;
    }
    currentHistoryMessage = message;
    if (historyEmpty) {
      historyEmpty.textContent = message;
    }
  };

  const setSyncStatus = (type, message, emptyMessage) => {
    if (syncStatusEl) {
      syncStatusEl.textContent = message || '';
      if (type) {
        syncStatusEl.setAttribute('data-status', type);
      }
    }
    if (emptyMessage) {
      setEmptyMessage(emptyMessage);
    }
  };

  const clearGistRefreshTimer = () => {
    if (gistRefreshTimeoutId) {
      clearTimeout(gistRefreshTimeoutId);
      gistRefreshTimeoutId = null;
    }
  };

  const scheduleGistRefresh = (delayMs = 60000) => {
    clearGistRefreshTimer();
    if (!aliasValue || !gistSettings.gistId || !gistSettings.gistToken) {
      return;
    }
    gistRefreshTimeoutId = setTimeout(() => {
      gistRefreshTimeoutId = null;
      if (!aliasValue || !gistSettings.gistId || !gistSettings.gistToken) {
        return;
      }
      loadGistRuns({ silent: true }).catch(() => {});
    }, Math.max(5000, delayMs));
  };

  const normalizeRun = (run) => {
    if (!run) {
      return null;
    }
    const alias = sanitizeAlias(run.alias);
    if (!alias) {
      return null;
    }

    const numericWpm = Number(run.wpm);
    const wpm = Number.isFinite(numericWpm) ? Math.max(0, Math.round(numericWpm * 100) / 100) : null;
    if (wpm == null) {
      return null;
    }

    const durationValue = Number(run.duration);
    const duration = Number.isFinite(durationValue) && durationValue > 0
      ? Math.round(durationValue)
      : DEFAULT_DURATION;

    const timestampValue = typeof run.timestamp === 'string' ? run.timestamp : run.completedAt;
    const timestamp = (() => {
      if (!timestampValue) {
        return new Date().toISOString();
      }
      const parsed = Date.parse(timestampValue);
      if (Number.isNaN(parsed)) {
        return new Date().toISOString();
      }
      return new Date(parsed).toISOString();
    })();

    return {
      alias,
      wpm,
      duration: Math.max(1, duration),
      timestamp,
    };
  };

  const sortRunsForRanking = (runs) => {
    return runs
      .slice()
      .sort((a, b) => {
        const aWpm = Number.isFinite(a?.wpm) ? a.wpm : 0;
        const bWpm = Number.isFinite(b?.wpm) ? b.wpm : 0;
        if (bWpm !== aWpm) {
          return bWpm - aWpm;
        }

        const aDuration = Number.isFinite(a?.duration) ? a.duration : DEFAULT_DURATION;
        const bDuration = Number.isFinite(b?.duration) ? b.duration : DEFAULT_DURATION;
        if (aDuration !== bDuration) {
          return aDuration - bDuration;
        }

        const aTime = Date.parse(a?.timestamp || '') || 0;
        const bTime = Date.parse(b?.timestamp || '') || 0;
        return bTime - aTime;
      });
  };

  const trimStoredRuns = (runs) => {
    return sortRunsForRanking(runs).slice(0, LEADERBOARD_MAX_ENTRIES);
  };

  const computeLeaderboardEntries = (runs) => {
    return sortRunsForRanking(runs).slice(0, 5);
  };

  const computeHistoryEntries = (runs, alias) => {
    if (!alias) {
      return [];
    }
    const needle = alias.toLowerCase();
    return runs
      .filter((run) => run?.alias && run.alias.toLowerCase() === needle)
      .sort((a, b) => {
        const aTime = Date.parse(a?.timestamp || '') || 0;
        const bTime = Date.parse(b?.timestamp || '') || 0;
        return bTime - aTime;
      })
      .slice(0, 10);
  };

  const formatRelativeTime = (date) => {
    if (!(date instanceof Date)) {
      return 'just now';
    }
    const nowTs = Date.now();
    const diffMs = Math.max(0, nowTs - date.getTime());
    if (diffMs < 5000) {
      return 'just now';
    }
    if (diffMs < 60000) {
      return `${Math.round(diffMs / 1000)}s ago`;
    }
    if (diffMs < 3600000) {
      return `${Math.round(diffMs / 60000)}m ago`;
    }
    if (diffMs < 86400000) {
      return `${Math.round(diffMs / 3600000)}h ago`;
    }
    return date.toLocaleDateString();
  };

  const renderLeaderboardList = () => {
    if (!leaderboardList || !leaderboardEmpty) {
      return;
    }

    leaderboardList.innerHTML = '';

    if (!leaderboardEntries.length) {
      leaderboardList.classList.add('hidden');
      leaderboardEmpty.classList.remove('hidden');
      leaderboardEmpty.textContent = currentEmptyMessage;
      return;
    }

    leaderboardList.classList.remove('hidden');
    leaderboardEmpty.classList.add('hidden');

    leaderboardEntries.forEach((run, index) => {
      const item = document.createElement('li');
      item.className = 'leaderboard-row';
      if (aliasValue && run.alias && run.alias.toLowerCase() === aliasValue.toLowerCase()) {
        item.classList.add('is-self');
      }

      const rank = document.createElement('span');
      rank.className = 'leaderboard-rank';
      rank.textContent = `${index + 1}.`;

      const aliasSpan = document.createElement('span');
      aliasSpan.className = 'leaderboard-alias';
      aliasSpan.textContent = run.alias || 'Anonymous';

      const wpmSpan = document.createElement('span');
      wpmSpan.className = 'leaderboard-wpm';
      const wpmValue = Number.isFinite(run.wpm) ? run.wpm : 0;
      const formattedWpm = wpmValue >= 100 ? Math.round(wpmValue).toString() : wpmValue.toFixed(1);
      wpmSpan.textContent = `${formattedWpm} WPM`;

      const durationSpan = document.createElement('span');
      durationSpan.className = 'leaderboard-duration';
      const durationValue = Number.isFinite(run.duration) ? run.duration : DEFAULT_DURATION;
      durationSpan.textContent = `${durationValue}s`;

      item.append(rank, aliasSpan, wpmSpan, durationSpan);
      leaderboardList.appendChild(item);
    });
  };

  const renderPersonalHistory = () => {
    if (!historyList || !historyEmpty) {
      return;
    }

    historyList.innerHTML = '';

    if (!aliasValue) {
      historyList.classList.add('hidden');
      historyEmpty.classList.remove('hidden');
      historyEmpty.textContent = 'Enter an alias to see your personal history.';
      return;
    }

    if (!historyEntries.length) {
      historyList.classList.add('hidden');
      historyEmpty.classList.remove('hidden');
      historyEmpty.textContent = currentHistoryMessage;
      return;
    }

    historyList.classList.remove('hidden');
    historyEmpty.classList.add('hidden');

    historyEntries.forEach((run) => {
      const item = document.createElement('li');
      item.className = 'history-row';

      const wpmValue = Number.isFinite(run.wpm) ? run.wpm : 0;
      const formattedWpm = wpmValue >= 100 ? Math.round(wpmValue).toString() : wpmValue.toFixed(1);
      const timestamp = (() => {
        try {
          const parsed = new Date(run.timestamp);
          if (Number.isNaN(parsed.getTime())) {
            return 'just now';
          }
          return formatRelativeTime(parsed);
        } catch {
          return 'just now';
        }
      })();

      item.textContent = `${formattedWpm} WPM · ${run.duration || DEFAULT_DURATION}s · ${timestamp}`;
      historyList.appendChild(item);
    });
  };

  const updateDerivedRuns = () => {
    leaderboardEntries = computeLeaderboardEntries(storedRuns);
    historyEntries = computeHistoryEntries(storedRuns, aliasValue);
    renderLeaderboardList();
    renderPersonalHistory();
  };

  const createGistHeaders = (token, { json = false } = {}) => {
    const headers = {
      Accept: 'application/vnd.github+json',
    };
    if (json) {
      headers['Content-Type'] = 'application/json';
    }
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  };

  const fetchLeaderboardData = async ({ gistId, gistToken }) => {
    if (!gistId) {
      throw new Error('Gist ID is not configured.');
    }

    if (typeof fetch !== 'function') {
      throw new Error('Fetch API is not available.');
    }

    const response = await fetch(`https://api.github.com/gists/${gistId}`, {
      method: 'GET',
      headers: createGistHeaders(gistToken),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `Unable to load gist (${response.status}).`);
    }

    const payload = await response.json();
    const file = payload?.files?.[LEADERBOARD_FILENAME];
    if (!file || typeof file.content !== 'string' || !file.content.trim()) {
      return [];
    }

    try {
      const parsed = JSON.parse(file.content);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      if (parsed && Array.isArray(parsed.runs)) {
        return parsed.runs;
      }
      return [];
    } catch {
      return [];
    }
  };

  const pushLeaderboardData = async ({ gistId, gistToken }, runs) => {
    if (!gistId) {
      throw new Error('Gist ID is not configured.');
    }
    if (!gistToken) {
      throw new Error('A GitHub token is required to update the leaderboard.');
    }
    if (typeof fetch !== 'function') {
      throw new Error('Fetch API is not available.');
    }

    const payload = {
      runs,
      updatedAt: new Date().toISOString(),
    };

    const response = await fetch(`https://api.github.com/gists/${gistId}`, {
      method: 'PATCH',
      headers: createGistHeaders(gistToken, { json: true }),
      body: JSON.stringify({
        files: {
          [LEADERBOARD_FILENAME]: {
            content: JSON.stringify(payload, null, 2),
          },
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `Unable to update gist (${response.status}).`);
    }

    return response.json();
  };

  const loadGistRuns = async ({ silent = false } = {}) => {
    if (!aliasValue || !gistSettings.gistId || !gistSettings.gistToken) {
      return storedRuns;
    }

    if (gistLoadPromise) {
      return gistLoadPromise;
    }

    if (!silent) {
      setHistoryEmptyMessage('Loading your history…');
      setSyncStatus('syncing', gistLoaded ? 'Refreshing leaderboard…' : 'Loading leaderboard…', 'Loading leaderboard…');
    }

    gistLoadPromise = (async () => {
      try {
        const remoteRuns = await fetchLeaderboardData(gistSettings);
        const sanitized = remoteRuns.map((run) => normalizeRun(run)).filter((run) => run != null);
        storedRuns = trimStoredRuns(sanitized);
        gistLoaded = true;
        updateDerivedRuns();
        lastSyncedAt = new Date();
        if (!storedRuns.length) {
          setSyncStatus('success', 'Leaderboard ready. Finish a run to claim a spot.', 'No runs yet—finish a run to claim a spot.');
          setHistoryEmptyMessage('Complete a run to build your personal history.');
        } else if (!silent) {
          setSyncStatus('success', `Leaderboard updated ${formatRelativeTime(lastSyncedAt)}.`);
          setHistoryEmptyMessage('Complete a run to build your personal history.');
        }
      } catch (error) {
        if (!silent) {
          gistLoaded = false;
          storedRuns = [];
          updateDerivedRuns();
          setSyncStatus('error', `Unable to load leaderboard: ${error.message}`, 'Unable to load leaderboard.');
          setHistoryEmptyMessage('Unable to load your history.');
        }
        throw error;
      } finally {
        gistLoadPromise = null;
        scheduleGistRefresh();
      }

      return storedRuns;
    })();

    return gistLoadPromise;
  };

  const requestPersist = () => {
    if (!aliasValue || !gistSettings.gistId || !gistSettings.gistToken) {
      return;
    }

    if (isPersistingLeaderboard) {
      persistQueued = true;
      return;
    }

    isPersistingLeaderboard = true;
    persistQueued = false;
    setSyncStatus('syncing', 'Syncing your result…');

    (async () => {
      try {
        await pushLeaderboardData(gistSettings, storedRuns);
        lastSyncedAt = new Date();
        setSyncStatus('success', `Score synced ${formatRelativeTime(lastSyncedAt)}.`);
        setHistoryEmptyMessage('Complete a run to build your personal history.');
      } catch (error) {
        setSyncStatus('error', `Sync failed: ${error.message}`, 'Unable to sync leaderboard.');
        setHistoryEmptyMessage('Unable to sync your latest run.');
      } finally {
        isPersistingLeaderboard = false;
        if (persistQueued) {
          persistQueued = false;
          requestPersist();
        } else {
          scheduleGistRefresh();
        }
      }
    })();
  };

  const persistResult = async (run) => {
    const sanitized = normalizeRun(run);
    if (!sanitized) {
      return;
    }

    if (!aliasValue || !gistSettings.gistId || !gistSettings.gistToken) {
      return;
    }

    try {
      if (gistLoadPromise) {
        await gistLoadPromise.catch(() => {});
      } else if (!gistLoaded) {
        await loadGistRuns({ silent: true }).catch(() => {});
      }
    } catch {
      // Ignore load failures and continue attempting to persist the latest run.
    }

    if (!gistLoaded && storedRuns.length === 0) {
      setSyncStatus('error', 'Unable to sync leaderboard until the latest data loads.', 'Unable to sync leaderboard.');
      setHistoryEmptyMessage('Unable to sync your latest run.');
      return;
    }

    storedRuns = trimStoredRuns([...storedRuns, sanitized]);
    updateDerivedRuns();
    requestPersist();
  };

  const resetLeaderboardState = (message, type = 'idle') => {
    storedRuns = [];
    leaderboardEntries = [];
    historyEntries = [];
    gistLoaded = false;
    updateDerivedRuns();
    if (message) {
      setSyncStatus(type, message, message);
      setHistoryEmptyMessage(message);
    }
    clearGistRefreshTimer();
  };

  const applyGistSettings = (settings) => {
    const gistId = typeof settings?.gistId === 'string' ? settings.gistId.trim() : '';
    const gistToken = typeof settings?.gistToken === 'string'
      ? settings.gistToken.trim()
      : typeof settings?.token === 'string'
        ? settings.token.trim()
        : '';

    const idChanged = gistSettings.gistId !== gistId;
    const tokenChanged = gistSettings.gistToken !== gistToken;
    if (!idChanged && !tokenChanged) {
      return;
    }

    gistSettings = { gistId, gistToken };

    if (idChanged) {
      storedRuns = [];
      gistLoaded = false;
      updateDerivedRuns();
    }

    updateSyncReadiness({ refresh: true });
  };

  const subscribeToSharedGistSettings = (listener) => {
    if (typeof window === 'undefined') {
      return () => {};
    }

    if (typeof window.subscribeToGlobalGistSettings === 'function') {
      try {
        return window.subscribeToGlobalGistSettings((value) => {
          listener(value);
        });
      } catch {
        // Fall back to event subscription below.
      }
    }

    const handler = (event) => {
      listener(event?.detail);
    };

    window.addEventListener(GIST_SETTINGS_EVENT, handler);
    return () => {
      try {
        window.removeEventListener(GIST_SETTINGS_EVENT, handler);
      } catch {
        // Ignore teardown failures.
      }
    };
  };

  const updateSyncReadiness = ({ refresh = false } = {}) => {
    clearGistRefreshTimer();

    if (!aliasValue) {
      resetLeaderboardState('Enter an alias to join the leaderboard.');
      setHistoryEmptyMessage('Enter an alias to see your personal history.');
      return;
    }

    if (!gistSettings.gistId) {
      resetLeaderboardState('Connect GitHub access from the global settings to sync your scores.', 'disabled');
      setHistoryEmptyMessage('Connect GitHub access from the global settings to sync your scores.');
      return;
    }

    if (!gistSettings.gistToken) {
      resetLeaderboardState('Add a GitHub token with gist scope in settings to enable syncing.', 'disabled');
      setHistoryEmptyMessage('Add a GitHub token with gist scope in settings to enable syncing.');
      return;
    }

    setHistoryEmptyMessage('Loading your history…');

    if (refresh || !gistLoaded) {
      loadGistRuns().catch(() => {});
    } else {
      scheduleGistRefresh();
      updateDerivedRuns();
      if (lastSyncedAt) {
        setSyncStatus('success', `Leaderboard updated ${formatRelativeTime(lastSyncedAt)}.`);
      }
    }
  };

  const handleAliasInput = (event) => {
    const inputValue = typeof event?.target?.value === 'string' ? event.target.value : '';
    const sanitized = sanitizeAlias(inputValue);
    aliasValue = sanitized;
    if (aliasInput && aliasInput.value !== sanitized) {
      aliasInput.value = sanitized;
    }
    writeStoredAlias(sanitized);
    updateDerivedRuns();
    updateSyncReadiness({ refresh: false });
  };

  const initializeLeaderboard = () => {
    aliasValue = readStoredAlias();
    if (aliasInput) {
      aliasInput.value = aliasValue;
      aliasInput.addEventListener('input', handleAliasInput);
      aliasInput.addEventListener('blur', () => {
        if (!aliasInput) return;
        aliasInput.value = sanitizeAlias(aliasInput.value);
      });
    }

    updateDerivedRuns();
    setSyncStatus('idle', 'Enter an alias to join the leaderboard.', currentEmptyMessage);
    setHistoryEmptyMessage('Complete a run to build your personal history.');

    applyGistSettings(readSharedGistSettings());

    gistSettingsUnsubscribe = subscribeToSharedGistSettings((nextSettings) => {
      applyGistSettings(nextSettings);
    });

    if (typeof window !== 'undefined' && typeof window.setInterval === 'function') {
      gistSettingsPollId = window.setInterval(() => {
        applyGistSettings(readSharedGistSettings());
      }, 30000);
    }

    updateSyncReadiness({ refresh: true });
  };

  const syncDurationOptions = () => {
    durationOptions.forEach((input) => {
      input.checked = Number(input.value) === selectedDuration;
    });
  };

  const updateSelectedDuration = (value) => {
    const numericValue = Number(value);
    selectedDuration = Number.isFinite(numericValue) && numericValue > 0 ? Math.floor(numericValue) : DEFAULT_DURATION;
    syncDurationOptions();
    refreshHoldDisplays();
  };

  const shouldIgnoreHoldTarget = (target) => {
    if (!target || !(target instanceof HTMLElement)) {
      return false;
    }
    if (target === typingInput) {
      return false;
    }
    if (target.matches('input, button, select, textarea') || target.isContentEditable) {
      return true;
    }
    if (target.closest('input, button, select, textarea')) {
      return true;
    }
    return false;
  };

  const handleGlobalKeyDown = (event) => {
    if (event.defaultPrevented) return;
    const isSpace = event.code === 'Space' || event.key === ' ' || event.key === 'Spacebar';
    if (!isSpace) return;
    if (event.repeat) return;
    if (!isScreenActive(testScreen) && !isScreenActive(resultsScreen)) {
      return;
    }
    if (shouldIgnoreHoldTarget(event.target)) {
      return;
    }
    startHoldTracking();
  };

  const handleGlobalKeyUp = (event) => {
    const isSpace = event.code === 'Space' || event.key === ' ' || event.key === 'Spacebar';
    if (!isSpace) return;
    cancelHoldTracking();
  };

  const handleVisibilityChange = () => {
    if (document.hidden) {
      clearHoldResetTimeout();
      if (holdStartTime != null) {
        holdStartTime = null;
        cancelHoldFrame(holdFrameId);
        holdFrameId = null;
      }
      if (holdState !== 'idle') {
        setHoldState('idle', 0);
      }
    }
  };

  const resetStats = () => {
    correctChars = 0;
    typedChars = 0;
    if (wpmEl) wpmEl.textContent = '0';
    if (cpmEl) cpmEl.textContent = '0';
    if (accuracyEl) accuracyEl.textContent = '100%';
  };

  const renderTargetText = (text) => {
    if (!textDisplay) return;
    textDisplay.innerHTML = '';
    charSpans = [];
    [...text].forEach((char) => {
      const span = document.createElement('span');
      span.textContent = char;
      textDisplay.appendChild(span);
      charSpans.push(span);
    });

    if (charSpans.length) {
      charSpans[0].classList.add('current');
    }
  };

  const updateHighlights = (value) => {
    correctChars = 0;
    typedChars = value.length;

    charSpans.forEach((span, index) => {
      span.classList.remove('correct', 'incorrect', 'current');
      if (index < value.length) {
        if (value[index] === targetText[index]) {
          span.classList.add('correct');
          correctChars += 1;
        } else {
          span.classList.add('incorrect');
        }
      }
    });

    const nextIndex = value.length;
    if (nextIndex < charSpans.length && charSpans[nextIndex]) {
      charSpans[nextIndex].classList.add('current');
    }
  };

  const updateLiveStats = () => {
    if (!startTimestamp) return;
    const elapsedSeconds = Math.max((performance.now() - startTimestamp) / 1000, 0.1);
    const minutes = elapsedSeconds / 60;
    const words = correctChars / 5;
    const cpm = (correctChars / elapsedSeconds) * 60;
    const accuracy = typedChars === 0 ? 100 : (correctChars / typedChars) * 100;

    if (wpmEl) {
      wpmEl.textContent = Math.round(words / minutes || 0).toString();
    }
    if (cpmEl) {
      cpmEl.textContent = Math.round(cpm || 0).toString();
    }
    if (accuracyEl) {
      accuracyEl.textContent = `${Math.max(0, Math.min(100, accuracy)).toFixed(0)}%`;
    }
  };

  const applyInputWidth = () => {
    if (!typingInput || !textDisplay) return;
    const width = textDisplay.getBoundingClientRect().width;
    if (width > 0) {
      typingInput.style.width = `${width}px`;
    }
  };

  const observeTextPanel = () => {
    if (!textDisplay) return;
    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(() => {
        applyInputWidth();
      });
      observer.observe(textDisplay);
    } else {
      window.addEventListener('resize', applyInputWidth);
    }
  };

  const loadCorpus = async () => {
    if (corpusCache) return corpusCache;
    if (!corpusPromise) {
      corpusPromise = fetch('corpus.json')
        .then((response) => {
          if (!response.ok) {
            throw new Error(`Failed to load corpus: ${response.status}`);
          }
          return response.json();
        })
        .then((data) => {
          if (!data || !Array.isArray(data.sentences)) {
            throw new Error('Corpus is malformed. Expected { sentences: [] }');
          }
          corpusCache = data.sentences.slice();
          return corpusCache;
        })
        .catch((error) => {
          console.error(error);
          corpusPromise = null;
          throw error;
        });
    }
    return corpusPromise;
  };

  const pickPassage = (sentences) => {
    if (!sentences.length) {
      throw new Error('Corpus is empty.');
    }

    const targetLength = 200 + Math.floor(Math.random() * 60) - 30; // ~170-230 chars
    const shuffled = sentences
      .map((sentence) => ({ sentence, sort: Math.random() }))
      .sort((a, b) => a.sort - b.sort)
      .map(({ sentence }) => sentence);

    let passage = '';
    let index = 0;

    while (passage.length < 150 || (passage.length < targetLength && index < shuffled.length)) {
      passage += (passage ? ' ' : '') + shuffled[index % shuffled.length];
      index += 1;
      if (index >= shuffled.length) {
        shuffled.push(...shuffled);
      }
      if (passage.length >= 300) {
        break;
      }
    }

    return passage.trim();
  };

  const focusTypingInput = ({ selectEnd = true } = {}) => {
    if (!typingInput || !isScreenActive(testScreen)) {
      return;
    }

    scheduleNextFrame(() => {
      if (!typingInput || typingInput.disabled || !isScreenActive(testScreen)) {
        return;
      }

      try {
        typingInput.focus({ preventScroll: true });
      } catch {
        typingInput.focus();
      }

      if (selectEnd && typeof typingInput.setSelectionRange === 'function') {
        const end = typingInput.value.length;
        try {
          typingInput.setSelectionRange(end, end);
        } catch {
          // Ignore selection errors in unsupported environments.
        }
      }
    });
  };

  const handleTick = () => {
    countdownSeconds -= 1;
    if (timerEl) {
      timerEl.textContent = formatTime(countdownSeconds);
    }

    if (countdownSeconds <= 0) {
      finishTest('time');
    }
  };

  const setupTimer = () => {
    clearInterval(timerId);
    timerId = setInterval(handleTick, 1000);
  };

  const stopTimer = () => {
    clearInterval(timerId);
    timerId = null;
  };

  const resetTestState = () => {
    stopTimer();
    typingInput.value = '';
    typingInput.disabled = false;
    typingInput.style.width = '';
    startTimestamp = null;
    targetText = '';
    charSpans = [];
    resetStats();
    countdownSeconds = testDuration;
  };

  const finishTest = (reason) => {
    if (!startTimestamp) return;
    stopTimer();
    typingInput.disabled = true;
    countdownSeconds = 0;
    if (timerEl) {
      timerEl.textContent = formatTime(countdownSeconds);
    }

    const elapsedSeconds = Math.max((performance.now() - startTimestamp) / 1000, 0.1);
    const minutes = elapsedSeconds / 60;
    const words = correctChars / 5;
    const wpmValue = minutes > 0 ? words / minutes : 0;
    const cpmValue = elapsedSeconds > 0 ? (correctChars / elapsedSeconds) * 60 : 0;
    const accuracyValue = typedChars === 0 ? 0 : (correctChars / typedChars) * 100;

    if (finalWpm) {
      finalWpm.textContent = wpmValue.toFixed(1);
    }
    if (finalCpm) {
      finalCpm.textContent = Math.round(cpmValue || 0).toString();
    }
    if (finalAccuracy) {
      finalAccuracy.textContent = `${Math.max(0, Math.min(100, accuracyValue)).toFixed(1)}%`;
    }

    if (resultsNote) {
      const summary = reason === 'completed'
        ? 'Purrfect focus! You finished the story before the timer ran out.'
        : "Time's up! Scroll back for another lap with the cats.";
      resultsNote.textContent = summary;
    }

    syncDurationOptions();
    refreshHoldDisplays();
    setScreen('results', { focusTarget: resultsRetry });
    persistResult({
      alias: aliasValue,
      wpm: wpmValue,
      duration: testDuration,
      timestamp: new Date().toISOString(),
    });
    startTimestamp = null;
  };

  const beginTest = async (duration) => {
    try {
      const numericDuration = Number(duration);
      const resolvedDuration =
        Number.isFinite(numericDuration) && numericDuration > 0
          ? Math.floor(numericDuration)
          : DEFAULT_DURATION;

      testDuration = resolvedDuration;
      countdownSeconds = testDuration;
      updateSelectedDuration(resolvedDuration);
      cancelHoldTracking();

      resetTestState();
      typingInput.disabled = true;
      if (timerEl) {
        timerEl.textContent = formatTime(countdownSeconds);
      }

      setScreen('test', { focus: false });

      const sentences = await loadCorpus();
      targetText = pickPassage(sentences);
      renderTargetText(targetText);
      resetStats();
      typingInput.value = '';
      typingInput.disabled = false;

      updateHighlights('');
      if (timerEl) {
        timerEl.textContent = formatTime(countdownSeconds);
      }

      focusTypingInput({ selectEnd: false });
      scheduleNextFrame(() => {
        applyInputWidth();
      });

      startTimestamp = performance.now();
      setupTimer();
    } catch (error) {
      resetTestState();
      alert('Unable to load the cat corpus. Please refresh and try again.');
      console.error(error);
    }
  };

  const handleInput = () => {
    const value = typingInput.value;
    updateHighlights(value);
    updateLiveStats();

    if (value.length >= targetText.length) {
      finishTest('completed');
    }
  };

  typingInput.addEventListener('input', handleInput);

  durationOptions.forEach((input) => {
    input.addEventListener('change', () => {
      if (!input.checked) {
        return;
      }
      updateSelectedDuration(input.value);
    });
  });

  if (restartBtn) {
    restartBtn.addEventListener('click', () => {
      beginTest(selectedDuration || DEFAULT_DURATION);
    });
  }

  if (resultsRetry) {
    resultsRetry.addEventListener('click', () => {
      beginTest(selectedDuration || DEFAULT_DURATION);
    });
  }

  if (holdDisplays.length) {
    refreshHoldDisplays();
    window.addEventListener('keydown', handleGlobalKeyDown);
    window.addEventListener('keyup', handleGlobalKeyUp);
    window.addEventListener('blur', cancelHoldTracking);
    document.addEventListener('visibilitychange', handleVisibilityChange);
  }

  observeTextPanel();
  initializeLeaderboard();
  beginTest(DEFAULT_DURATION);

  window.addEventListener('beforeunload', () => {
    stopTimer();
    clearGistRefreshTimer();
    if (typeof gistSettingsUnsubscribe === 'function') {
      try {
        gistSettingsUnsubscribe();
      } catch {
        // Ignore teardown errors.
      }
    }
    if (gistSettingsPollId) {
      clearInterval(gistSettingsPollId);
      gistSettingsPollId = null;
    }
  });
})();
