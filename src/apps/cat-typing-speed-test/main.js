(() => {
  const DEFAULT_DURATION = 15;

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
  const scoreHistoryContainer = document.getElementById('score-history');
  const historyEmpty = document.getElementById('history-empty');
  const historyTable = document.getElementById('history-table');
  const historyRows = document.getElementById('history-rows');

  if (!testScreen || !resultsScreen || !typingInput) {
    return;
  }

  const SCOREBOARD_FILENAME = 'cat-typing-speed-test.json';
  const GIST_COOKIE_NAME = 'g1:gist-settings';
  const GIST_STORAGE_KEY = 'g1:gist-settings';
  const GIST_BROADCAST_CHANNEL = 'g1:gist-settings';
  const GIST_EVENT_NAME = 'g1:gist-settings-changed';
  const ALIAS_STORAGE_KEY = 'cat-typing:alias';
  const PENDING_RESULTS_STORAGE_KEY = 'cat-typing:pending-results';
  const MAX_RUNS_PER_PLAYER = 25;
  const LEADERBOARD_SIZE = 5;
  const SYNC_RETRY_DELAY_MS = 30000;
  const MAX_ALIAS_LENGTH = 32;

  const scoreboardElements = {
    container: scoreHistoryContainer,
    emptyMessage: historyEmpty,
    table: historyTable,
    rows: historyRows,
    aliasForm: null,
    aliasInput: null,
    aliasNote: null,
    syncStatus: null,
    leaderboardSection: null,
    leaderboardTable: null,
    leaderboardBody: null,
  };

  function createEmptyScoreboard() {
    return {
      version: 1,
      updatedAt: null,
      players: {},
      leaderboard: [],
    };
  }

  const scoreboardState = {
    alias: '',
    gistSettings: { gistId: '', gistToken: '' },
    gistData: createEmptyScoreboard(),
    pendingResults: [],
    syncStatus: { type: 'idle', message: '' },
    isFetching: false,
    isSyncing: false,
    syncRetryTimer: null,
    lastSyncError: null,
  };

  const getWindow = () => (typeof window !== 'undefined' ? window : undefined);
  const getDocument = () => (typeof document !== 'undefined' ? document : undefined);

  const safeParseJson = (value) => {
    if (typeof value !== 'string' || !value) {
      return null;
    }
    try {
      return JSON.parse(value);
    } catch (error) {
      return null;
    }
  };

  const sanitizeAlias = (value) => {
    if (typeof value !== 'string') {
      return '';
    }
    const trimmed = value.trim();
    if (!trimmed) {
      return '';
    }

    const normalized = trimmed.replace(/[^\w\s-]/g, ' ').replace(/\s+/g, ' ');
    return normalized.trim().slice(0, MAX_ALIAS_LENGTH);
  };

  const normalizeSettingsPayload = (value = {}) => {
    const gistId = typeof value.gistId === 'string' ? value.gistId.trim() : '';
    const gistToken = typeof value.gistToken === 'string'
      ? value.gistToken.trim()
      : typeof value.token === 'string'
        ? value.token.trim()
        : '';

    return { gistId, gistToken };
  };

  const mergeSettings = (primary, fallback) => ({
    gistId: (primary && primary.gistId) || (fallback && fallback.gistId) || '',
    gistToken: (primary && primary.gistToken) || (fallback && fallback.gistToken) || '',
  });

  const readCookieSettings = () => {
    const doc = getDocument();
    if (!doc || typeof doc.cookie !== 'string') {
      return null;
    }

    const entries = doc.cookie.split(';');
    for (let index = 0; index < entries.length; index += 1) {
      const entry = entries[index];
      if (!entry) {
        continue;
      }

      const [rawName, ...rest] = entry.split('=');
      if (!rawName || rawName.trim() !== GIST_COOKIE_NAME) {
        continue;
      }

      const rawValue = rest.join('=');
      if (!rawValue) {
        return { gistId: '', gistToken: '' };
      }

      try {
        const decoded = decodeURIComponent(rawValue);
        const parsed = safeParseJson(decoded);
        return normalizeSettingsPayload(parsed || {});
      } catch (error) {
        return { gistId: '', gistToken: '' };
      }
    }

    return null;
  };

  const readStorageSettings = () => {
    const win = getWindow();
    if (!win || !win.localStorage) {
      return null;
    }

    try {
      const stored = win.localStorage.getItem(GIST_STORAGE_KEY);
      if (!stored) {
        return null;
      }

      const parsed = safeParseJson(stored);
      return normalizeSettingsPayload(parsed || {});
    } catch (error) {
      return { gistId: '', gistToken: '' };
    }
  };

  const readSharedGistSettings = () => {
    const fromCookie = readCookieSettings();
    const fromStorage = readStorageSettings();
    return mergeSettings(fromCookie, fromStorage);
  };

  const subscribeToSharedGistSettings = (listener) => {
    const win = getWindow();
    if (!win || typeof listener !== 'function') {
      return () => {};
    }

    const handleCustomEvent = (event) => {
      const payload = event?.detail;
      if (payload && typeof payload === 'object') {
        listener(normalizeSettingsPayload(payload), { source: 'event' });
      } else {
        listener(readSharedGistSettings(), { source: 'event' });
      }
    };

    const handleStorage = (event) => {
      if (!event || event.key !== GIST_STORAGE_KEY) {
        return;
      }

      const parsed = event.newValue ? safeParseJson(event.newValue) : {};
      listener(normalizeSettingsPayload(parsed || {}), { source: 'storage' });
    };

    let channel = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        channel = new BroadcastChannel(GIST_BROADCAST_CHANNEL);
        const handleMessage = (event) => {
          const payload = event?.data;
          if (payload && typeof payload === 'object') {
            listener(normalizeSettingsPayload(payload), { source: 'broadcast' });
          } else {
            listener(readSharedGistSettings(), { source: 'broadcast' });
          }
        };

        if (typeof channel.addEventListener === 'function') {
          channel.addEventListener('message', handleMessage);
        } else {
          channel.onmessage = handleMessage;
        }
      }
    } catch (error) {
      channel = null;
    }

    win.addEventListener(GIST_EVENT_NAME, handleCustomEvent);
    win.addEventListener('storage', handleStorage);

    return () => {
      win.removeEventListener(GIST_EVENT_NAME, handleCustomEvent);
      win.removeEventListener('storage', handleStorage);
      if (channel && typeof channel.close === 'function') {
        try {
          channel.close();
        } catch (error) {
          // Ignore channel close failures.
        }
      }
    };
  };

  const readStoredAlias = () => {
    const win = getWindow();
    if (!win || !win.localStorage) {
      return '';
    }

    try {
      const value = win.localStorage.getItem(ALIAS_STORAGE_KEY);
      return sanitizeAlias(value);
    } catch (error) {
      return '';
    }
  };

  const writeStoredAlias = (value) => {
    const win = getWindow();
    if (!win || !win.localStorage) {
      return;
    }

    const alias = sanitizeAlias(value);
    try {
      if (alias) {
        win.localStorage.setItem(ALIAS_STORAGE_KEY, alias);
      } else {
        win.localStorage.removeItem(ALIAS_STORAGE_KEY);
      }
    } catch (error) {
      // Ignore storage write failures (e.g., Safari private mode).
    }
  };

  const normalizePendingEntry = (entry) => {
    if (!entry || typeof entry !== 'object') {
      return null;
    }

    const alias = sanitizeAlias(entry.alias || entry.name || '');
    if (!alias) {
      return null;
    }

    const run = entry.run && typeof entry.run === 'object' ? entry.run : entry;
    return { alias, run: normalizeRunEntry(run) };
  };

  const readPendingResults = () => {
    const win = getWindow();
    if (!win || !win.localStorage) {
      return [];
    }

    try {
      const stored = win.localStorage.getItem(PENDING_RESULTS_STORAGE_KEY);
      if (!stored) {
        return [];
      }

      const parsed = safeParseJson(stored);
      if (!Array.isArray(parsed)) {
        return [];
      }

      return parsed.map(normalizePendingEntry).filter(Boolean);
    } catch (error) {
      return [];
    }
  };

  const writePendingResults = (pending) => {
    const win = getWindow();
    if (!win || !win.localStorage) {
      return;
    }

    try {
      if (!pending || pending.length === 0) {
        win.localStorage.removeItem(PENDING_RESULTS_STORAGE_KEY);
      } else {
        win.localStorage.setItem(PENDING_RESULTS_STORAGE_KEY, JSON.stringify(pending));
      }
    } catch (error) {
      // Ignore storage write errors (e.g., quota exceeded).
    }
  };

  const generateRunId = () => {
    try {
      if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
      }
    } catch (error) {
      // Ignore crypto errors and fall back to Math.random.
    }

    return `run-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  };

  function normalizeRunEntry(value = {}) {
    const timestamp = typeof value.timestamp === 'string' && !Number.isNaN(Date.parse(value.timestamp))
      ? new Date(value.timestamp)
      : new Date();

    const duration = Number.isFinite(Number(value.duration)) ? Number(value.duration) : DEFAULT_DURATION;
    const wpm = Number.isFinite(Number(value.wpm)) ? Number(value.wpm) : 0;
    const accuracy = Number.isFinite(Number(value.accuracy)) ? Number(value.accuracy) : 0;
    const id = typeof value.id === 'string' && value.id ? value.id : generateRunId();
    const completed = value.completed === true;
    const reason = typeof value.reason === 'string'
      ? value.reason
      : typeof value.endedReason === 'string'
        ? value.endedReason
        : undefined;

    return {
      id,
      timestamp: timestamp.toISOString(),
      duration,
      wpm,
      accuracy,
      completed,
      ...(reason ? { reason } : {}),
    };
  }

  const compareRunsDesc = (a, b) => {
    if (!a && !b) return 0;
    if (!a) return 1;
    if (!b) return -1;

    const wpmDiff = (Number(b.wpm) || 0) - (Number(a.wpm) || 0);
    if (wpmDiff !== 0) {
      return wpmDiff;
    }

    const accuracyDiff = (Number(b.accuracy) || 0) - (Number(a.accuracy) || 0);
    if (accuracyDiff !== 0) {
      return accuracyDiff;
    }

    const timeA = Date.parse(a.timestamp) || 0;
    const timeB = Date.parse(b.timestamp) || 0;
    if (timeA !== timeB) {
      return timeA - timeB;
    }

    return (a.id || '').localeCompare(b.id || '');
  };

  const clonePlayers = (players = {}) => {
    const clone = {};
    Object.keys(players).forEach((aliasKey) => {
      const alias = sanitizeAlias(aliasKey);
      if (!alias) {
        return;
      }

      const source = players[aliasKey];
      const runs = Array.isArray(source?.runs)
        ? source.runs
        : Array.isArray(source)
          ? source
          : [];

      clone[alias] = {
        alias,
        runs: runs.map((run) => normalizeRunEntry(run)),
      };
    });

    return clone;
  };

  const addRunToPlayer = (players, alias, run) => {
    if (!alias) {
      return;
    }

    if (!players[alias]) {
      players[alias] = { alias, runs: [] };
    }

    const runs = players[alias].runs;
    const normalized = normalizeRunEntry(run);
    const existingIndex = runs.findIndex((entry) => entry.id === normalized.id);

    if (existingIndex >= 0) {
      runs[existingIndex] = normalized;
    } else {
      runs.push(normalized);
    }

    runs.sort((a, b) => (Date.parse(b.timestamp) || 0) - (Date.parse(a.timestamp) || 0));
    if (runs.length > MAX_RUNS_PER_PLAYER) {
      runs.length = MAX_RUNS_PER_PLAYER;
    }
  };

  const computeLeaderboard = (players) => {
    const entries = [];
    Object.keys(players || {}).forEach((alias) => {
      const runs = players[alias]?.runs || [];
      if (!runs.length) {
        return;
      }

      const best = runs.slice().sort(compareRunsDesc)[0];
      if (!best) {
        return;
      }

      entries.push({ alias, ...best });
    });

    entries.sort(compareRunsDesc);
    return entries.slice(0, LEADERBOARD_SIZE);
  };

  const buildHeaders = (token) => {
    const headers = {
      Accept: 'application/vnd.github+json',
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  };

  const parseScoreboardContent = (content) => {
    const scoreboard = createEmptyScoreboard();

    if (!content) {
      return scoreboard;
    }

    const parsed = safeParseJson(content);
    if (!parsed || typeof parsed !== 'object') {
      return scoreboard;
    }

    scoreboard.version = Number.isFinite(parsed.version) ? parsed.version : 1;
    scoreboard.updatedAt = typeof parsed.updatedAt === 'string' ? parsed.updatedAt : null;
    scoreboard.players = clonePlayers(parsed.players && typeof parsed.players === 'object' ? parsed.players : {});

    if (Array.isArray(parsed.leaderboard) && parsed.leaderboard.length) {
      scoreboard.leaderboard = parsed.leaderboard
        .map((entry) => {
          if (!entry || typeof entry !== 'object') {
            return null;
          }

          const alias = sanitizeAlias(entry.alias || entry.name || '');
          if (!alias) {
            return null;
          }

          const run = normalizeRunEntry(entry);
          return { alias, ...run };
        })
        .filter(Boolean)
        .slice(0, LEADERBOARD_SIZE);
    } else {
      scoreboard.leaderboard = computeLeaderboard(scoreboard.players);
    }

    return scoreboard;
  };

  const mergePendingIntoScoreboard = (baseScoreboard, pending) => {
    const merged = {
      version: Number.isFinite(baseScoreboard?.version) ? baseScoreboard.version : 1,
      updatedAt: new Date().toISOString(),
      players: clonePlayers(baseScoreboard?.players || {}),
      leaderboard: [],
    };

    (pending || []).forEach((entry) => {
      const alias = sanitizeAlias(entry?.alias || '');
      if (!alias) {
        return;
      }

      addRunToPlayer(merged.players, alias, entry.run);
    });

    merged.leaderboard = computeLeaderboard(merged.players);
    return merged;
  };

  const getPlayersWithPending = () => {
    const players = clonePlayers(scoreboardState.gistData.players || {});

    scoreboardState.pendingResults.forEach((entry) => {
      const alias = sanitizeAlias(entry?.alias || '');
      if (!alias) {
        return;
      }

      addRunToPlayer(players, alias, entry.run);
    });

    return players;
  };

  const getAliasRuns = (alias) => {
    const sanitizedAlias = sanitizeAlias(alias);
    if (!sanitizedAlias) {
      return [];
    }

    const players = getPlayersWithPending();
    const playerEntry = players[sanitizedAlias];
    if (!playerEntry || !Array.isArray(playerEntry.runs)) {
      return [];
    }

    const pendingIds = new Set(
      scoreboardState.pendingResults
        .filter((entry) => sanitizeAlias(entry.alias) === sanitizedAlias)
        .map((entry) => entry.run && entry.run.id)
        .filter(Boolean),
    );

    return playerEntry.runs
      .slice()
      .sort((a, b) => (Date.parse(b.timestamp) || 0) - (Date.parse(a.timestamp) || 0))
      .map((run) => ({ ...run, pending: pendingIds.has(run.id) }));
  };

  const getDisplayLeaderboard = () => computeLeaderboard(getPlayersWithPending());

  const formatRunDate = (timestamp) => {
    if (!timestamp) {
      return '';
    }

    try {
      const date = new Date(timestamp);
      if (Number.isNaN(date.getTime())) {
        return timestamp;
      }

      return date.toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch (error) {
      return timestamp;
    }
  };

  const formatAccuracy = (value) => {
    const number = Number(value);
    if (!Number.isFinite(number)) {
      return '0%';
    }

    return `${Math.max(0, Math.min(100, number)).toFixed(1)}%`;
  };

  const formatWpm = (value) => {
    const number = Number(value);
    if (!Number.isFinite(number)) {
      return '0';
    }

    return number.toFixed(1);
  };

  const clearSyncRetry = () => {
    if (scoreboardState.syncRetryTimer) {
      clearTimeout(scoreboardState.syncRetryTimer);
      scoreboardState.syncRetryTimer = null;
    }
  };

  const scheduleSyncRetry = () => {
    if (scoreboardState.syncRetryTimer || !scoreboardState.pendingResults.length) {
      return;
    }

    scoreboardState.syncRetryTimer = setTimeout(() => {
      scoreboardState.syncRetryTimer = null;
      attemptSync();
    }, SYNC_RETRY_DELAY_MS);
  };

  const ensureSyncStatusElement = () => {
    if (!scoreboardElements.container || scoreboardElements.syncStatus) {
      return;
    }

    const status = document.createElement('p');
    status.className = 'history-empty hidden';
    status.id = 'score-sync-status';
    status.dataset.status = 'idle';
    scoreboardElements.syncStatus = status;
    scoreboardElements.container.appendChild(status);
  };

  const setSyncStatus = (next = {}) => {
    const type = next.type || 'idle';
    const message = typeof next.message === 'string' ? next.message : '';
    scoreboardState.syncStatus = { type, message };

    ensureSyncStatusElement();
    const statusEl = scoreboardElements.syncStatus;
    if (!statusEl) {
      return;
    }

    statusEl.dataset.status = type;
    if (message) {
      statusEl.textContent = message;
      statusEl.classList.remove('hidden');
    } else {
      statusEl.textContent = '';
      statusEl.classList.add('hidden');
    }
  };

  const setupScoreboardUI = () => {
    if (!scoreboardElements.container) {
      return;
    }

    if (!scoreboardElements.aliasForm) {
      const aliasForm = document.createElement('form');
      aliasForm.className = 'score-alias-form';
      aliasForm.autocomplete = 'off';

      const aliasLabel = document.createElement('label');
      aliasLabel.setAttribute('for', 'score-alias-input');
      aliasLabel.textContent = 'Leaderboard alias';

      const aliasInput = document.createElement('input');
      aliasInput.type = 'text';
      aliasInput.id = 'score-alias-input';
      aliasInput.name = 'alias';
      aliasInput.maxLength = MAX_ALIAS_LENGTH;
      aliasInput.autocomplete = 'nickname';
      aliasInput.placeholder = 'KimchiFan99';

      const saveButton = document.createElement('button');
      saveButton.type = 'submit';
      saveButton.className = 'secondary';
      saveButton.textContent = 'Save alias';

      aliasForm.appendChild(aliasLabel);
      aliasForm.appendChild(aliasInput);
      aliasForm.appendChild(saveButton);

      aliasForm.addEventListener('submit', (event) => {
        event.preventDefault();
        applyAlias(aliasInput.value);
      });

      aliasInput.addEventListener('blur', () => {
        if (aliasInput.value !== scoreboardState.alias) {
          applyAlias(aliasInput.value);
        }
      });

      const insertBeforeNode = scoreboardElements.emptyMessage || scoreboardElements.table;
      if (insertBeforeNode && insertBeforeNode.parentNode) {
        insertBeforeNode.parentNode.insertBefore(aliasForm, insertBeforeNode);
      } else {
        scoreboardElements.container.appendChild(aliasForm);
      }

      scoreboardElements.aliasForm = aliasForm;
      scoreboardElements.aliasInput = aliasInput;

      const aliasNote = document.createElement('p');
      aliasNote.className = 'history-empty';
      aliasNote.textContent = 'Aliases never leave this device.';
      scoreboardElements.aliasNote = aliasNote;

      if (insertBeforeNode && insertBeforeNode.parentNode) {
        insertBeforeNode.parentNode.insertBefore(aliasNote, insertBeforeNode);
      } else {
        scoreboardElements.container.appendChild(aliasNote);
      }
    }

    ensureSyncStatusElement();

    if (!scoreboardElements.leaderboardSection) {
      const section = document.createElement('div');
      section.className = 'leaderboard-section hidden';
      const heading = document.createElement('h4');
      heading.textContent = 'Top cats';
      section.appendChild(heading);

      const table = document.createElement('table');
      table.className = 'history-table hidden';
      const thead = document.createElement('thead');
      const headRow = document.createElement('tr');
      ['Rank', 'Alias', 'WPM', 'Accuracy'].forEach((label) => {
        const cell = document.createElement('th');
        cell.scope = 'col';
        cell.textContent = label;
        headRow.appendChild(cell);
      });
      thead.appendChild(headRow);
      const tbody = document.createElement('tbody');
      table.appendChild(thead);
      table.appendChild(tbody);

      section.appendChild(table);
      scoreboardElements.container.appendChild(section);

      scoreboardElements.leaderboardSection = section;
      scoreboardElements.leaderboardTable = table;
      scoreboardElements.leaderboardBody = tbody;
    }
  };

  const renderScoreboard = () => {
    if (!scoreboardElements.container) {
      return;
    }

    setupScoreboardUI();

    if (scoreboardElements.aliasInput && scoreboardElements.aliasInput.value !== scoreboardState.alias) {
      scoreboardElements.aliasInput.value = scoreboardState.alias;
    }

    if (scoreboardElements.aliasNote) {
      scoreboardElements.aliasNote.textContent = scoreboardState.alias
        ? `Sharing as ${scoreboardState.alias}. Alias never leaves this device.`
        : 'Aliases never leave this device.';
    }

    const gistId = scoreboardState.gistSettings.gistId;
    const alias = scoreboardState.alias;
    const aliasRuns = alias ? getAliasRuns(alias) : [];
    const leaderboardEntries = getDisplayLeaderboard();

    if (scoreboardElements.emptyMessage) {
      let message = '';
      if (!gistId) {
        message = 'Connect GitHub access from the global settings to sync your scores.';
      } else if (!alias) {
        message = 'Choose an alias to join the leaderboard.';
      } else if (!aliasRuns.length) {
        message = 'No runs recorded yet. Finish a test to log your first score.';
      }

      if (message) {
        scoreboardElements.emptyMessage.textContent = message;
        scoreboardElements.emptyMessage.classList.remove('hidden');
      } else {
        scoreboardElements.emptyMessage.textContent = '';
        scoreboardElements.emptyMessage.classList.add('hidden');
      }
    }

    if (scoreboardElements.table && scoreboardElements.rows) {
      scoreboardElements.rows.innerHTML = '';
      scoreboardElements.table.classList.toggle('hidden', aliasRuns.length === 0);

      aliasRuns.slice(0, 10).forEach((run) => {
        const row = document.createElement('tr');

        const dateCell = document.createElement('td');
        dateCell.textContent = formatRunDate(run.timestamp);
        if (run.pending) {
          const badge = document.createElement('span');
          badge.textContent = ' (pending sync)';
          badge.className = 'pending-sync';
          dateCell.appendChild(badge);
        }
        row.appendChild(dateCell);

        const durationCell = document.createElement('td');
        durationCell.textContent = `${Number(run.duration) || DEFAULT_DURATION}s`;
        row.appendChild(durationCell);

        const wpmCell = document.createElement('td');
        wpmCell.textContent = formatWpm(run.wpm);
        row.appendChild(wpmCell);

        const accuracyCell = document.createElement('td');
        accuracyCell.textContent = formatAccuracy(run.accuracy);
        row.appendChild(accuracyCell);

        scoreboardElements.rows.appendChild(row);
      });
    }

    if (scoreboardElements.leaderboardSection && scoreboardElements.leaderboardBody) {
      scoreboardElements.leaderboardBody.innerHTML = '';
      scoreboardElements.leaderboardSection.classList.toggle('hidden', leaderboardEntries.length === 0);
      scoreboardElements.leaderboardTable.classList.toggle('hidden', leaderboardEntries.length === 0);

      leaderboardEntries.forEach((entry, index) => {
        const row = document.createElement('tr');

        const rankCell = document.createElement('td');
        rankCell.textContent = `#${index + 1}`;
        row.appendChild(rankCell);

        const aliasCell = document.createElement('td');
        aliasCell.textContent = entry.alias;
        row.appendChild(aliasCell);

        const wpmCell = document.createElement('td');
        wpmCell.textContent = formatWpm(entry.wpm);
        row.appendChild(wpmCell);

        const accuracyCell = document.createElement('td');
        accuracyCell.textContent = formatAccuracy(entry.accuracy);
        row.appendChild(accuracyCell);

        scoreboardElements.leaderboardBody.appendChild(row);
      });
    }
  };

  const fetchScoreboardData = async ({ silent = false } = {}) => {
    const { gistId, gistToken } = scoreboardState.gistSettings;
    if (!gistId) {
      scoreboardState.gistData = createEmptyScoreboard();
      if (!silent) {
        setSyncStatus({ type: 'idle', message: 'Add a gist ID to sync scores.' });
      }
      renderScoreboard();
      return scoreboardState.gistData;
    }

    if (scoreboardState.isFetching) {
      return scoreboardState.gistData;
    }

    scoreboardState.isFetching = true;
    if (!silent) {
      setSyncStatus({ type: 'loading', message: 'Loading leaderboard…' });
    }

    try {
      const response = await fetch(`https://api.github.com/gists/${gistId}`, {
        method: 'GET',
        headers: buildHeaders(gistToken),
      });

      if (!response.ok) {
        if (response.status === 404) {
          scoreboardState.gistData = createEmptyScoreboard();
          if (!silent) {
            setSyncStatus({ type: 'idle', message: 'No leaderboard found yet. We will create one after your next run.' });
          }
          renderScoreboard();
          return scoreboardState.gistData;
        }
        const errorText = await response.text();
        throw new Error(errorText || `HTTP ${response.status}`);
      }

      const payload = await response.json();
      const file = payload?.files?.[SCOREBOARD_FILENAME];
      const content = file?.content || '';
      const parsed = parseScoreboardContent(content);
      parsed.updatedAt = typeof payload?.updated_at === 'string' ? payload.updated_at : parsed.updatedAt;
      scoreboardState.gistData = parsed;

      if (!silent) {
        setSyncStatus({ type: 'success', message: 'Leaderboard loaded.' });
      }
    } catch (error) {
      scoreboardState.lastSyncError = error;
      if (!silent) {
        setSyncStatus({ type: 'error', message: `Unable to load leaderboard: ${error.message || 'Unknown error'}` });
      }
    } finally {
      scoreboardState.isFetching = false;
      renderScoreboard();
    }

    return scoreboardState.gistData;
  };

  const pushScoreboard = async (payload) => {
    const { gistId, gistToken } = scoreboardState.gistSettings;
    if (!gistId || !gistToken) {
      throw new Error('A gist ID and token are required to sync scores.');
    }

    const body = JSON.stringify({
      files: {
        [SCOREBOARD_FILENAME]: {
          content: `${JSON.stringify(payload, null, 2)}\n`,
        },
      },
    });

    const response = await fetch(`https://api.github.com/gists/${gistId}`, {
      method: 'PATCH',
      headers: {
        ...buildHeaders(gistToken),
        'Content-Type': 'application/json',
      },
      body,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `HTTP ${response.status}`);
    }

    const result = await response.json();
    const file = result?.files?.[SCOREBOARD_FILENAME];
    const content = file?.content || JSON.stringify(payload);
    const parsed = parseScoreboardContent(content);
    parsed.updatedAt = typeof result?.updated_at === 'string' ? result.updated_at : parsed.updatedAt;
    scoreboardState.gistData = parsed;
    return parsed;
  };

  async function attemptSync() {
    if (!scoreboardState.pendingResults.length) {
      return;
    }

    const { gistId, gistToken } = scoreboardState.gistSettings;
    if (!gistId) {
      setSyncStatus({
        type: 'pending',
        message: `${scoreboardState.pendingResults.length} result${scoreboardState.pendingResults.length === 1 ? '' : 's'} queued locally. Add a gist ID to sync them.`,
      });
      return;
    }

    if (!gistToken) {
      setSyncStatus({
        type: 'pending',
        message: `${scoreboardState.pendingResults.length} result${scoreboardState.pendingResults.length === 1 ? '' : 's'} ready. Add a gist token to push them.`,
      });
      return;
    }

    if (scoreboardState.isSyncing) {
      return;
    }

    scoreboardState.isSyncing = true;
    clearSyncRetry();
    setSyncStatus({ type: 'syncing', message: 'Syncing scores…' });

    try {
      const latest = await fetchScoreboardData({ silent: true });
      const merged = mergePendingIntoScoreboard(latest, scoreboardState.pendingResults);
      await pushScoreboard(merged);
      scoreboardState.pendingResults = [];
      writePendingResults(scoreboardState.pendingResults);
      setSyncStatus({ type: 'success', message: 'Scores synced.' });
    } catch (error) {
      scoreboardState.lastSyncError = error;
      setSyncStatus({ type: 'error', message: `Sync failed: ${error.message || 'Unknown error'}. We will retry automatically.` });
      scheduleSyncRetry();
    } finally {
      scoreboardState.isSyncing = false;
      renderScoreboard();
    }
  }

  function applyAlias(value) {
    const alias = sanitizeAlias(value);
    scoreboardState.alias = alias;
    if (scoreboardElements.aliasInput && scoreboardElements.aliasInput.value !== alias) {
      scoreboardElements.aliasInput.value = alias;
    }
    writeStoredAlias(alias);
    renderScoreboard();
    if (alias) {
      attemptSync();
    }
  }

  function persistResult(result) {
    if (!scoreboardElements.container) {
      return;
    }

    setupScoreboardUI();

    if (!scoreboardState.alias) {
      setSyncStatus({ type: 'idle', message: 'Choose an alias to record your scores.' });
      return;
    }

    const run = normalizeRunEntry({
      ...result,
      timestamp: result?.timestamp || new Date().toISOString(),
    });

    scoreboardState.pendingResults.push({ alias: scoreboardState.alias, run });
    writePendingResults(scoreboardState.pendingResults);
    renderScoreboard();
    attemptSync();
  }

  function handleSharedGistSettingsUpdate(nextSettings = {}, meta = {}) {
    const normalized = normalizeSettingsPayload(nextSettings);
    const previous = scoreboardState.gistSettings;
    const changed = normalized.gistId !== previous.gistId || normalized.gistToken !== previous.gistToken;
    scoreboardState.gistSettings = normalized;

    if (!normalized.gistId) {
      scoreboardState.gistData = createEmptyScoreboard();
      setSyncStatus({ type: 'idle', message: 'Add a gist ID to enable leaderboard sync.' });
      renderScoreboard();
      return;
    }

    if (changed || meta.force === true) {
      fetchScoreboardData().then(() => {
        if (scoreboardState.pendingResults.length) {
          attemptSync();
        }
      });
    }
  }

  let unsubscribeFromSharedSettings = null;

  function initializeScoreboard() {
    if (!scoreboardElements.container) {
      return;
    }

    setupScoreboardUI();

    scoreboardState.alias = readStoredAlias();
    scoreboardState.pendingResults = readPendingResults();

    if (scoreboardElements.aliasInput) {
      scoreboardElements.aliasInput.value = scoreboardState.alias;
    }

    renderScoreboard();

    const initialSettings = readSharedGistSettings();
    scoreboardState.gistSettings = normalizeSettingsPayload(initialSettings);
    renderScoreboard();

    if (scoreboardState.gistSettings.gistId) {
      fetchScoreboardData({ silent: true }).then(() => {
        if (scoreboardState.pendingResults.length) {
          attemptSync();
        }
      });
    }

    unsubscribeFromSharedSettings = subscribeToSharedGistSettings((settings, meta) => {
      handleSharedGistSettingsUpdate(settings, meta);
    });

    if (scoreboardState.pendingResults.length) {
      attemptSync();
    }
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
  let timerId = null;
  let startTimestamp = null;
  let targetText = '';
  let charSpans = [];
  let correctChars = 0;
  let typedChars = 0;
  let activeScreen = testScreen;

  const scheduleNextFrame = (callback) => {
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(callback);
    } else {
      setTimeout(callback, 0);
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
        } catch (error) {
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
      } catch (error) {
        typingInput.focus();
      }

      if (selectEnd && typeof typingInput.setSelectionRange === 'function') {
        const end = typingInput.value.length;
        try {
          typingInput.setSelectionRange(end, end);
        } catch (error) {
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

    persistResult({
      duration: testDuration,
      wpm: Number(wpmValue.toFixed(2)),
      accuracy: Number(Math.max(0, Math.min(100, accuracyValue)).toFixed(2)),
      completed: reason === 'completed',
      reason,
      timestamp: new Date().toISOString(),
    });

    setScreen('results', { focusTarget: resultsRetry });
    startTimestamp = null;
  };

  const beginTest = async (duration) => {
    try {
      testDuration = Number(duration) > 0 ? Number(duration) : DEFAULT_DURATION;
      countdownSeconds = testDuration;

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

  if (restartBtn) {
    restartBtn.addEventListener('click', () => {
      beginTest(testDuration || DEFAULT_DURATION);
    });
  }

  if (resultsRetry) {
    resultsRetry.addEventListener('click', () => {
      beginTest(testDuration || DEFAULT_DURATION);
    });
  }

  initializeScoreboard();
  observeTextPanel();
  beginTest(DEFAULT_DURATION);

  window.addEventListener('beforeunload', () => {
    stopTimer();
    clearSyncRetry();
    if (typeof unsubscribeFromSharedSettings === 'function') {
      try {
        unsubscribeFromSharedSettings();
      } catch (error) {
        // Ignore unsubscribe failures.
      }
      unsubscribeFromSharedSettings = null;
    }
  });
})();
