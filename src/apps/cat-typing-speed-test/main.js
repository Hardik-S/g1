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
  let gistSettings = { gistId: '', gistToken: '' };
  let aliasValue = '';
  let leaderboardRuns = [];
  let leaderboardLoaded = false;
  let leaderboardFetchPromise = null;
  let isPersistingLeaderboard = false;
  let persistQueued = false;
  let currentEmptyMessage = 'Connect GitHub access from the global settings to sync your scores.';
  let lastSyncedAt = null;

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

  const setEmptyMessage = (message) => {
    if (typeof message !== 'string' || !message) {
      return;
    }
    currentEmptyMessage = message;
    if (leaderboardEmpty) {
      leaderboardEmpty.textContent = message;
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

  const sortLeaderboardRuns = (runs) => {
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

        const aAccuracy = Number.isFinite(a?.accuracy) ? a.accuracy : 0;
        const bAccuracy = Number.isFinite(b?.accuracy) ? b.accuracy : 0;
        if (bAccuracy !== aAccuracy) {
          return bAccuracy - aAccuracy;
        }

        const aTime = Date.parse(a?.timestamp || '') || 0;
        const bTime = Date.parse(b?.timestamp || '') || 0;
        return bTime - aTime;
      });
  };

  const trimLeaderboardRuns = (runs) => {
    return sortLeaderboardRuns(runs).slice(0, LEADERBOARD_MAX_ENTRIES);
  };

  const renderLeaderboard = () => {
    if (!leaderboardList || !leaderboardEmpty) {
      return;
    }

    const rankedRuns = sortLeaderboardRuns(leaderboardRuns).slice(0, 5);
    leaderboardList.innerHTML = '';

    if (!rankedRuns.length) {
      leaderboardList.classList.add('hidden');
      leaderboardEmpty.classList.remove('hidden');
      leaderboardEmpty.textContent = currentEmptyMessage;
      return;
    }

    leaderboardList.classList.remove('hidden');
    leaderboardEmpty.classList.add('hidden');

    rankedRuns.forEach((run, index) => {
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

  const sanitizeRun = (run) => {
    if (!run) return null;
    const alias = sanitizeAlias(run.alias);
    if (!alias) return null;

    const numericWpm = Number(run.wpm);
    if (!Number.isFinite(numericWpm)) {
      return null;
    }

    const duration = Math.max(1, Math.round(Number(run.duration) || DEFAULT_DURATION));
    const accuracyValue = Number(run.accuracy);
    const accuracy = Number.isFinite(accuracyValue)
      ? Math.max(0, Math.min(100, Math.round(accuracyValue * 10) / 10))
      : null;
    const cpmValue = Number(run.cpm);
    const cpm = Number.isFinite(cpmValue) ? Math.max(0, Math.round(cpmValue)) : null;
    const timestampValue = run.timestamp || run.completedAt;
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
      wpm: Math.max(0, Math.round(numericWpm * 100) / 100),
      duration,
      accuracy,
      cpm,
      timestamp,
    };
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

  const shouldSyncLeaderboard = () => {
    return Boolean(aliasValue && gistSettings.gistId && gistSettings.gistToken);
  };

  const ensureLeaderboardLoaded = async () => {
    if (!shouldSyncLeaderboard()) {
      return leaderboardRuns;
    }

    if (leaderboardLoaded) {
      return leaderboardRuns;
    }

    if (leaderboardFetchPromise) {
      return leaderboardFetchPromise;
    }

    setSyncStatus('syncing', 'Loading leaderboard…', 'Loading leaderboard…');

    leaderboardFetchPromise = (async () => {
      try {
        const remoteRuns = await fetchLeaderboardData(gistSettings);
        const sanitized = remoteRuns
          .map((run) => sanitizeRun(run))
          .filter((run) => run != null);
        leaderboardRuns = trimLeaderboardRuns(sanitized);
        leaderboardLoaded = true;
        renderLeaderboard();
        lastSyncedAt = new Date();
        if (leaderboardRuns.length === 0) {
          setSyncStatus('success', 'Leaderboard ready. Finish a run to claim a spot.', 'No runs yet—finish a run to claim a spot.');
        } else {
          setSyncStatus('success', `Leaderboard updated ${formatRelativeTime(lastSyncedAt)}.`);
        }
      } catch (error) {
        leaderboardLoaded = false;
        setSyncStatus('error', `Unable to load leaderboard: ${error.message}`, 'Unable to load leaderboard.');
        throw error;
      } finally {
        leaderboardFetchPromise = null;
      }
      return leaderboardRuns;
    })();

    return leaderboardFetchPromise;
  };

  const persistLeaderboard = async () => {
    if (!shouldSyncLeaderboard()) {
      return;
    }

    if (isPersistingLeaderboard) {
      persistQueued = true;
      return;
    }

    isPersistingLeaderboard = true;
    persistQueued = false;
    setSyncStatus('syncing', 'Syncing your result…');

    try {
      await pushLeaderboardData(gistSettings, leaderboardRuns);
      lastSyncedAt = new Date();
      setSyncStatus('success', `Score synced ${formatRelativeTime(lastSyncedAt)}.`);
    } catch (error) {
      setSyncStatus('error', `Sync failed: ${error.message}`, 'Unable to sync leaderboard.');
    } finally {
      isPersistingLeaderboard = false;
      if (persistQueued) {
        persistQueued = false;
        persistLeaderboard();
      }
    }
  };

  const recordLeaderboardRun = (run) => {
    if (!shouldSyncLeaderboard()) {
      return;
    }

    (async () => {
      try {
        await ensureLeaderboardLoaded();
      } catch {
        // Continue attempting to sync even if the initial fetch fails.
      }

      const sanitized = sanitizeRun(run);
      if (!sanitized) {
        return;
      }

      leaderboardRuns = trimLeaderboardRuns([...leaderboardRuns, sanitized]);
      renderLeaderboard();
      await persistLeaderboard();
    })();
  };

  const resetLeaderboardState = (message, type = 'idle') => {
    leaderboardRuns = [];
    leaderboardLoaded = false;
    renderLeaderboard();
    if (message) {
      setSyncStatus(type, message, message);
    }
  };

  const updateSyncReadiness = () => {
    if (!gistSettings.gistId) {
      resetLeaderboardState('Connect GitHub access from the global settings to sync your scores.', 'disabled');
      return;
    }

    if (!gistSettings.gistToken) {
      resetLeaderboardState('Add a GitHub token with gist scope in settings to enable syncing.', 'disabled');
      return;
    }

    if (!aliasValue) {
      resetLeaderboardState('Enter an alias to join the leaderboard.');
      return;
    }

    ensureLeaderboardLoaded();
  };

  const applyGistSettings = (settings) => {
    const gistId = typeof settings?.gistId === 'string' ? settings.gistId.trim() : '';
    const gistToken = typeof settings?.gistToken === 'string'
      ? settings.gistToken.trim()
      : typeof settings?.token === 'string'
        ? settings.token.trim()
        : '';

    const changed = gistSettings.gistId !== gistId || gistSettings.gistToken !== gistToken;
    if (!changed) {
      return;
    }

    gistSettings = { gistId, gistToken };
    leaderboardRuns = [];
    leaderboardLoaded = false;
    renderLeaderboard();
    updateSyncReadiness();
  };

  const handleAliasInput = (event) => {
    const inputValue = typeof event?.target?.value === 'string' ? event.target.value : '';
    const sanitized = sanitizeAlias(inputValue);
    aliasValue = sanitized;
    if (aliasInput && aliasInput.value !== sanitized) {
      aliasInput.value = sanitized;
    }
    writeStoredAlias(sanitized);
    renderLeaderboard();
    updateSyncReadiness();
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

    renderLeaderboard();
    setSyncStatus('idle', 'Enter an alias to join the leaderboard.', 'Connect GitHub access from the global settings to sync your scores.');

    applyGistSettings(readSharedGistSettings());

    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener(GIST_SETTINGS_EVENT, (event) => {
        applyGistSettings(event?.detail);
      });
    }

    updateSyncReadiness();
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
    recordLeaderboardRun({
      alias: aliasValue,
      wpm: wpmValue,
      cpm: cpmValue,
      accuracy: accuracyValue,
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
  });
})();
