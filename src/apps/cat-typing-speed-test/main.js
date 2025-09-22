(() => {
  const startScreen = document.getElementById('start-screen');
  const testScreen = document.getElementById('test-screen');
  const resultsScreen = document.getElementById('results-screen');
  const timerEl = document.getElementById('timer');
  const wpmEl = document.getElementById('wpm');
  const cpmEl = document.getElementById('cpm');
  const accuracyEl = document.getElementById('accuracy');
  const textDisplay = document.getElementById('text-display');
  const typingInput = document.getElementById('typing-input');
  const restartBtn = document.getElementById('restart-btn');
  const backBtn = document.getElementById('back-btn');
  const finalWpm = document.getElementById('final-wpm');
  const finalCpm = document.getElementById('final-cpm');
  const finalAccuracy = document.getElementById('final-accuracy');
  const resultsNote = document.getElementById('results-note');
  const resultsRetry = document.getElementById('results-retry');
  const resultsMenu = document.getElementById('results-menu');

  const durationButtons = Array.from(document.querySelectorAll('.duration-btn'));

  const parseDurationValue = (button) => {
    if (!button) return null;
    const value = Number(button.dataset.duration);
    if (!Number.isFinite(value) || value <= 0) {
      return null;
    }
    return value;
  };

  const defaultDuration = (() => {
    for (let index = 0; index < durationButtons.length; index += 1) {
      const parsed = parseDurationValue(durationButtons[index]);
      if (parsed !== null) {
        return parsed;
      }
    }
    return null;
  })();

  let lastSelectedDuration = defaultDuration;

  const loginForm = document.getElementById('login-form');
  const aliasInput = document.getElementById('alias-input');
  const gistIdInput = document.getElementById('gist-id-input');
  const tokenInput = document.getElementById('token-input');
  const loginButton = document.getElementById('login-button');
  const logoutButton = document.getElementById('logout-button');
  const loginStatus = document.getElementById('login-status');
  const aliasDisplayRow = document.getElementById('alias-display');
  const currentAliasEl = document.getElementById('current-alias');
  const historyEmpty = document.getElementById('history-empty');
  const historyTable = document.getElementById('history-table');
  const historyRows = document.getElementById('history-rows');
  const startHint = document.getElementById('start-hint');

  const GIST_FILENAME = 'cat-typing-speed-test.json';
  const STORAGE_KEY = 'catTypingSettings';
  const SESSION_TOKEN_KEY = 'catTypingSessionToken';
  const GIST_SETTINGS_COOKIE = 'g1_gist_settings';
  const GIST_SETTINGS_TTL_MS = 30 * 24 * 60 * 60 * 1000;
  const GIST_SETTINGS_MESSAGE = 'g1-gist-settings-update';
  const gistSettingsChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('g1-gist-settings') : null;

  const sanitizeGistSettings = (value = {}) => ({
    gistId: typeof value.gistId === 'string' ? value.gistId.trim() : '',
    gistToken: typeof value.gistToken === 'string' ? value.gistToken.trim() : '',
  });

  const readGistSettingsCookie = () => {
    if (typeof document === 'undefined') {
      return { gistId: '', gistToken: '' };
    }

    try {
      const cookies = document.cookie ? document.cookie.split(';') : [];
      for (let index = 0; index < cookies.length; index += 1) {
        const cookie = cookies[index];
        const [rawName, ...rest] = cookie.split('=');
        if (!rawName || rawName.trim() !== GIST_SETTINGS_COOKIE) {
          continue;
        }
        const rawValue = rest.join('=');
        if (!rawValue) {
          return { gistId: '', gistToken: '' };
        }
        const decoded = decodeURIComponent(rawValue);
        const parsed = JSON.parse(decoded);
        return sanitizeGistSettings(parsed);
      }
    } catch (error) {
      console.warn('Unable to read gist settings cookie.', error);
    }

    return { gistId: '', gistToken: '' };
  };

  const writeGistSettingsCookie = (settings) => {
    if (typeof document === 'undefined') {
      return;
    }

    const sanitized = sanitizeGistSettings(settings);
    try {
      if (!sanitized.gistId && !sanitized.gistToken) {
        document.cookie = `${GIST_SETTINGS_COOKIE}=; expires=${new Date(0).toUTCString()}; path=/; SameSite=Lax`;
        return;
      }

      const expires = new Date(Date.now() + GIST_SETTINGS_TTL_MS).toUTCString();
      const encoded = encodeURIComponent(JSON.stringify(sanitized));
      document.cookie = `${GIST_SETTINGS_COOKIE}=${encoded}; expires=${expires}; path=/; SameSite=Lax`;
    } catch (error) {
      console.warn('Unable to persist gist settings cookie.', error);
    }
  };

  const postGistSettingsUpdate = (settings) => {
    const payload = {
      type: GIST_SETTINGS_MESSAGE,
      gistId: settings.gistId || '',
      gistToken: settings.gistToken || '',
    };

    if (gistSettingsChannel) {
      try {
        gistSettingsChannel.postMessage(payload);
      } catch (error) {
        console.warn('Unable to post gist settings update through BroadcastChannel.', error);
      }
      return;
    }

    if (typeof window === 'undefined' || typeof window.postMessage !== 'function') {
      return;
    }

    try {
      if (window.parent && window.parent !== window && typeof window.parent.postMessage === 'function') {
        window.parent.postMessage(payload, '*');
      }
      window.postMessage(payload, '*');
    } catch (error) {
      console.warn('Unable to post gist settings update through window messaging.', error);
    }
  };

  const shareGlobalGistSettings = (settings) => {
    const sanitized = sanitizeGistSettings(settings);
    writeGistSettingsCookie(sanitized);
    postGistSettingsUpdate(sanitized);
  };

  const defaultStartHint = startHint ? startHint.textContent : '';
  const keyboardShortcutHint = 'Tip: Press 1 or 2 (\u2190/\u2192) to launch instantly, hit Esc to return to the menu, and tap R or Space to restart mid-test or from results.';

  let corpusCache = null;
  let corpusPromise = null;
  let countdownSeconds = 0;
  let testDuration = 0;
  let timerId = null;
  let startTimestamp = null;
  let targetText = '';
  let charSpans = [];
  let correctChars = 0;
  let typedChars = 0;
  let activeScreen = startScreen;

  const setActiveDuration = (duration) => {
    let appliedDuration = null;
    durationButtons.forEach((button) => {
      const parsed = parseDurationValue(button);
      if (parsed === null) {
        button.removeAttribute('data-active');
        return;
      }
      const isActive = parsed === duration;
      if (isActive) {
        appliedDuration = parsed;
        button.setAttribute('data-active', 'true');
      } else {
        button.removeAttribute('data-active');
      }
    });

    if (appliedDuration !== null) {
      lastSelectedDuration = appliedDuration;
    }

    return appliedDuration;
  };

  const getDurationByIndex = (index) => {
    if (index < 0 || index >= durationButtons.length) {
      return null;
    }
    return parseDurationValue(durationButtons[index]);
  };

  const getCurrentDurationIndex = () => {
    if (!Number.isFinite(lastSelectedDuration)) {
      return -1;
    }
    for (let index = 0; index < durationButtons.length; index += 1) {
      if (parseDurationValue(durationButtons[index]) === lastSelectedDuration) {
        return index;
      }
    }
    return -1;
  };

  const focusActiveDurationButton = () => {
    const activeButton = durationButtons.find((button) => button.hasAttribute('data-active'));
    if (activeButton) {
      activeButton.focus();
    }
  };

  const getPreferredDuration = () => {
    if (Number.isFinite(testDuration) && testDuration > 0) {
      return testDuration;
    }
    if (Number.isFinite(lastSelectedDuration) && lastSelectedDuration > 0) {
      return lastSelectedDuration;
    }
    if (Number.isFinite(defaultDuration) && defaultDuration > 0) {
      return defaultDuration;
    }
    return null;
  };

  const startDuration = (duration) => {
    const applied = setActiveDuration(duration);
    if (!Number.isFinite(applied) || applied <= 0) {
      return;
    }
    countdownSeconds = applied;
    beginTest(applied);
  };

  const startDurationByIndex = (index) => {
    const parsed = getDurationByIndex(index);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return;
    }
    startDuration(parsed);
  };

  if (Number.isFinite(lastSelectedDuration) && lastSelectedDuration > 0) {
    setActiveDuration(lastSelectedDuration);
  }

  const isTextEntryElement = (element) => {
    if (!element) return false;
    if (element.isContentEditable) return true;
    const tagName = element.tagName;
    if (!tagName) return false;
    const normalized = tagName.toUpperCase();
    return normalized === 'INPUT' || normalized === 'TEXTAREA' || normalized === 'SELECT';
  };

  let gistStore = {};
  let currentAlias = '';
  let gistId = '';
  let gistToken = '';
  let isLoggedIn = false;
  let syncInFlight = false;
  let syncPending = false;

  const loadStoredSettings = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch (error) {
      console.warn('Unable to parse stored Cat Typing settings.', error);
      return {};
    }
  };

  const persistLocalSettings = (aliasValue, gistValue) => {
    try {
      const payload = { alias: aliasValue || '', gistId: gistValue || '' };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.warn('Unable to persist Cat Typing settings.', error);
    }
  };

  const getSessionToken = () => {
    try {
      return sessionStorage.getItem(SESSION_TOKEN_KEY) || '';
    } catch (error) {
      console.warn('Session storage unavailable.', error);
      return '';
    }
  };

  const setSessionToken = (value) => {
    try {
      if (value) {
        sessionStorage.setItem(SESSION_TOKEN_KEY, value);
      } else {
        sessionStorage.removeItem(SESSION_TOKEN_KEY);
      }
    } catch (error) {
      console.warn('Unable to persist session token.', error);
    }
  };

  const setLoginStatus = (message, tone = 'info') => {
    if (!loginStatus) return;
    loginStatus.textContent = message;
    loginStatus.dataset.tone = tone;
  };

  const updateAliasBadge = () => {
    if (!aliasDisplayRow || !currentAliasEl) return;
    if (currentAlias) {
      currentAliasEl.textContent = currentAlias;
      aliasDisplayRow.hidden = false;
    } else {
      currentAliasEl.textContent = '';
      aliasDisplayRow.hidden = true;
    }
  };

  const updateStartHint = (loggedIn) => {
    if (!startHint) return;
    const baseMessage = loggedIn
      ? defaultStartHint
      : 'Log in above to sync your scores to GitHub. You can still practice without signing in.';
    const combinedMessage = [baseMessage, keyboardShortcutHint].filter(Boolean).join(' ');
    startHint.textContent = combinedMessage.trim();
  };

  const setLoginState = (loggedIn) => {
    if (logoutButton) {
      logoutButton.disabled = !loggedIn;
    }
    updateStartHint(loggedIn);
  };

  const ensureAliasHistory = () => {
    if (!gistStore || typeof gistStore !== 'object') {
      gistStore = {};
    }
    if (!currentAlias) {
      return [];
    }
    if (!Array.isArray(gistStore[currentAlias])) {
      gistStore[currentAlias] = [];
    }
    return gistStore[currentAlias];
  };

  const renderScoreHistory = () => {
    if (!historyTable || !historyRows || !historyEmpty) return;
    historyRows.innerHTML = '';

    if (!currentAlias) {
      historyTable.classList.add('hidden');
      historyEmpty.classList.remove('hidden');
      historyEmpty.textContent = 'Log in to view saved scores.';
      return;
    }

    const history = ensureAliasHistory()
      .slice()
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (!history.length) {
      historyTable.classList.add('hidden');
      historyEmpty.classList.remove('hidden');
      historyEmpty.textContent = 'No scores yet — finish a test to record your first run.';
      return;
    }

    historyEmpty.classList.add('hidden');
    historyTable.classList.remove('hidden');

    const formatter = new Intl.DateTimeFormat(undefined, {
      dateStyle: 'short',
      timeStyle: 'short',
    });

    history.forEach((entry) => {
      const row = document.createElement('tr');

      const dateCell = document.createElement('td');
      const entryDate = entry && entry.date ? new Date(entry.date) : null;
      dateCell.textContent = entryDate && !Number.isNaN(entryDate.getTime())
        ? formatter.format(entryDate)
        : 'Unknown';
      row.appendChild(dateCell);

      const durationCell = document.createElement('td');
      const durationValue = Number(entry && entry.duration);
      durationCell.textContent = Number.isFinite(durationValue) ? `${durationValue}s` : '—';
      row.appendChild(durationCell);

      const wpmCell = document.createElement('td');
      const wpmValue = Number(entry && entry.wpm);
      wpmCell.textContent = Number.isFinite(wpmValue) ? wpmValue.toFixed(1) : '0.0';
      row.appendChild(wpmCell);

      const accuracyCell = document.createElement('td');
      const accuracyValue = Number(entry && entry.accuracy);
      accuracyCell.textContent = Number.isFinite(accuracyValue)
        ? `${accuracyValue.toFixed(1)}%`
        : '0.0%';
      row.appendChild(accuracyCell);

      historyRows.appendChild(row);
    });
  };

  const fetchGistFromGitHub = async () => {
    if (!gistId || !gistToken) {
      throw new Error('Missing GitHub configuration.');
    }

    // GitHub API: Fetch the gist that stores typing score history for all aliases.
    const response = await fetch(`https://api.github.com/gists/${gistId}`, {
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `token ${gistToken}`,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        gistStore = {};
        throw new Error('GitHub gist not found. Double-check the ID.');
      }
      throw new Error(`GitHub API error (${response.status}).`);
    }

    const payload = await response.json();
    const file = payload.files && payload.files[GIST_FILENAME];

    if (file && typeof file.content === 'string') {
      try {
        const parsed = JSON.parse(file.content);
        gistStore = parsed && typeof parsed === 'object' ? parsed : {};
      } catch (error) {
        console.warn('Gist content is not valid JSON. Starting with an empty history.', error);
        gistStore = {};
      }
    } else {
      gistStore = {};
    }

    ensureAliasHistory();
  };

  const syncGist = async () => {
    if (!gistId || !gistToken) {
      throw new Error('Missing GitHub credentials for syncing.');
    }

    const body = JSON.stringify({
      files: {
        [GIST_FILENAME]: {
          content: JSON.stringify(gistStore, null, 2),
        },
      },
    });

    // GitHub API: Persist the updated score history to the configured gist file.
    const response = await fetch(`https://api.github.com/gists/${gistId}`, {
      method: 'PATCH',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `token ${gistToken}`,
        'Content-Type': 'application/json',
      },
      body,
    });

    if (!response.ok) {
      throw new Error(`Failed to sync with GitHub (${response.status}).`);
    }

    await response.json().catch(() => null);
  };

  const queueSync = () => {
    if (!currentAlias || !gistId || !gistToken) return;

    if (syncInFlight) {
      syncPending = true;
      return;
    }

    syncInFlight = true;
    setLoginStatus('Saving score to GitHub…');

    syncGist()
      .then(() => {
        setLoginStatus('Score synced to GitHub.', 'success');
      })
      .catch((error) => {
        console.error(error);
        setLoginStatus(error.message || 'Unable to sync with GitHub.', 'error');
      })
      .finally(() => {
        syncInFlight = false;
        if (syncPending) {
          syncPending = false;
          queueSync();
        }
      });
  };

  const persistResult = (result) => {
    if (!currentAlias) {
      setLoginStatus('Result not saved — log in to store your history.', 'error');
      return;
    }

    const history = ensureAliasHistory();
    history.push(result);
    history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    if (history.length > 50) {
      history.length = 50;
    }

    renderScoreHistory();
    queueSync();
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

  const handleLogin = async (isAuto = false) => {
    if (!loginForm) return;

    const aliasValue = aliasInput ? aliasInput.value.trim() : '';
    const rawTokenValue = tokenInput ? tokenInput.value.trim() : '';
    const sessionTokenValue = getSessionToken();
    const gistValue = gistIdInput ? gistIdInput.value.trim() : '';
    const tokenValue = rawTokenValue || sessionTokenValue;
    const { gistId: normalizedGistId, gistToken: normalizedToken } = sanitizeGistSettings({
      gistId: gistValue,
      gistToken: tokenValue,
    });

    if (!aliasValue) {
      setLoginStatus('Enter an alias to continue.', 'error');
      return;
    }
    if (!normalizedGistId) {
      setLoginStatus('Add the GitHub gist ID to store your scores.', 'error');
      return;
    }
    if (!normalizedToken) {
      setLoginStatus('Provide a GitHub personal access token with gist access.', 'error');
      return;
    }

    if (loginButton) {
      loginButton.disabled = true;
    }
    setLoginStatus('Loading score history…');

    currentAlias = aliasValue;
    gistId = normalizedGistId;
    gistToken = normalizedToken;
    if (gistIdInput) {
      gistIdInput.value = normalizedGistId;
    }
    if (tokenInput && rawTokenValue) {
      tokenInput.value = normalizedToken;
    }

    try {
      await fetchGistFromGitHub();
      persistLocalSettings(aliasValue, normalizedGistId);
      setSessionToken(normalizedToken);
      setLoginState(true);
      updateAliasBadge();
      renderScoreHistory();
      setLoginStatus(`Signed in as ${aliasValue}.`, 'success');
      isLoggedIn = true;
      shareGlobalGistSettings({ gistId, gistToken });
    } catch (error) {
      console.error(error);
      gistStore = {};
      currentAlias = '';
      gistToken = '';
      setSessionToken('');
      setLoginState(false);
      updateAliasBadge();
      renderScoreHistory();
      setLoginStatus(error.message || 'Login failed.', 'error');
      if (!isAuto && tokenInput) {
        tokenInput.focus();
      }
      isLoggedIn = false;
    } finally {
      if (loginButton) {
        loginButton.disabled = false;
      }
    }
  };

  const performLogout = ({ broadcast = true, statusMessage, statusTone } = {}) => {
    const normalizedAlias = aliasInput ? aliasInput.value.trim() : '';
    const normalizedGistId = gistIdInput ? gistIdInput.value.trim() : '';
    persistLocalSettings(normalizedAlias, normalizedGistId);
    setSessionToken('');
    gistStore = {};
    currentAlias = '';
    gistId = normalizedGistId;
    gistToken = '';
    syncInFlight = false;
    syncPending = false;
    isLoggedIn = false;
    if (tokenInput) {
      tokenInput.value = '';
    }
    if (gistIdInput) {
      gistIdInput.value = normalizedGistId;
    }
    setLoginState(false);
    updateAliasBadge();
    renderScoreHistory();
    setLoginStatus(statusMessage || 'Signed out. Enter your details to sync scores again.', statusTone || 'info');
    if (broadcast) {
      shareGlobalGistSettings({ gistId: normalizedGistId, gistToken: '' });
    }
  };

  const handleLogout = () => {
    performLogout({ broadcast: true });
  };

  const handleSharedGistSettingsUpdate = (raw) => {
    if (!raw || typeof raw !== 'object') {
      return;
    }

    const previousGistId = gistId;
    const previousGistToken = gistToken;
    const sanitized = sanitizeGistSettings(raw);
    const hasChanged = sanitized.gistId !== previousGistId || sanitized.gistToken !== previousGistToken;

    gistId = sanitized.gistId;
    gistToken = sanitized.gistToken;

    if (gistIdInput) {
      gistIdInput.value = sanitized.gistId;
    }
    if (tokenInput) {
      tokenInput.value = sanitized.gistToken;
    }

    if (!hasChanged) {
      return;
    }

    if (aliasInput && sanitized.gistId !== previousGistId) {
      persistLocalSettings(aliasInput.value.trim(), sanitized.gistId);
    }

    if (sanitized.gistToken) {
      setSessionToken(sanitized.gistToken);
      if (isLoggedIn) {
        setLoginStatus('Refreshing GitHub history…');
        fetchGistFromGitHub()
          .then(() => {
            renderScoreHistory();
            setLoginStatus(`Signed in as ${currentAlias}.`, 'success');
          })
          .catch((error) => {
            console.warn('Unable to refresh GitHub history from broadcast.', error);
            setLoginStatus('Unable to refresh GitHub history.', 'error');
          });
      }
    } else {
      setSessionToken('');
      if (isLoggedIn) {
        performLogout({
          broadcast: false,
          statusMessage: 'GitHub access removed in another tab. Log in again to sync.',
          statusTone: 'info',
        });
      }
    }
  };

  if (gistSettingsChannel) {
    gistSettingsChannel.addEventListener('message', (event) => {
      if (!event || typeof event.data !== 'object') {
        return;
      }
      handleSharedGistSettingsUpdate(event.data);
    });
  }

  window.addEventListener('message', (event) => {
    if (!event || typeof event.data !== 'object') {
      return;
    }
    if (event.data.type !== GIST_SETTINGS_MESSAGE) {
      return;
    }
    handleSharedGistSettingsUpdate(event.data);
  });

  const formatTime = (seconds) => {
    const safeSeconds = Math.max(0, Math.floor(seconds));
    const mins = Math.floor(safeSeconds / 60)
      .toString()
      .padStart(2, '0');
    const secs = (safeSeconds % 60).toString().padStart(2, '0');
    return `${mins}:${secs}`;
  };

  const setScreen = (screen) => {
    const sections = [startScreen, testScreen, resultsScreen];
    sections.forEach((section) => {
      const isActive = section === screen;
      section.classList.toggle('hidden', !isActive);
      section.setAttribute('aria-hidden', isActive ? 'false' : 'true');
    });
    activeScreen = screen;
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

  const renderTargetText = (text) => {
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

  const resetStats = () => {
    correctChars = 0;
    typedChars = 0;
    wpmEl.textContent = '0';
    cpmEl.textContent = '0';
    accuracyEl.textContent = '100%';
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

    wpmEl.textContent = Math.round(words / minutes || 0).toString();
    cpmEl.textContent = Math.round(cpm || 0).toString();
    accuracyEl.textContent = `${Math.max(0, Math.min(100, accuracy)).toFixed(0)}%`;
  };

  const handleTick = () => {
    countdownSeconds -= 1;
    timerEl.textContent = formatTime(countdownSeconds);

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

  const finishTest = (reason) => {
    if (!startTimestamp) return;
    stopTimer();
    typingInput.disabled = true;
    countdownSeconds = 0;

    const elapsedSeconds = Math.max((performance.now() - startTimestamp) / 1000, 0.1);
    const minutes = elapsedSeconds / 60;
    const words = correctChars / 5;
    const wpmValue = minutes > 0 ? words / minutes : 0;
    const cpmValue = elapsedSeconds > 0 ? (correctChars / elapsedSeconds) * 60 : 0;
    const accuracyValue = typedChars === 0 ? 0 : (correctChars / typedChars) * 100;

    finalWpm.textContent = wpmValue.toFixed(1);
    finalCpm.textContent = Math.round(cpmValue || 0).toString();
    finalAccuracy.textContent = `${Math.max(0, Math.min(100, accuracyValue)).toFixed(1)}%`;

    const summary = reason === 'completed'
      ? 'Purrfect focus! You finished the story before the timer ran out.'
      : "Time's up! Scroll back for another lap with the cats.";
    resultsNote.textContent = summary;

    persistResult({
      date: new Date().toISOString(),
      duration: Number.isFinite(testDuration) ? Number(testDuration) : 0,
      wpm: Number.isFinite(wpmValue) ? Number(wpmValue.toFixed(1)) : 0,
      accuracy: Number.isFinite(accuracyValue) ? Number(Math.max(0, Math.min(100, accuracyValue)).toFixed(1)) : 0,
    });

    setScreen(resultsScreen);
    resultsRetry.focus();
    startTimestamp = null;
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
    countdownSeconds = 0;
    testDuration = 0;
  };

  const beginTest = async (duration) => {
    try {
      testDuration = Number(duration);
      const sentences = await loadCorpus();
      targetText = pickPassage(sentences);
      renderTargetText(targetText);
      resetStats();
      typingInput.value = '';
      typingInput.disabled = false;

      countdownSeconds = testDuration;
      updateHighlights('');
      timerEl.textContent = formatTime(countdownSeconds);

      setScreen(testScreen);
      requestAnimationFrame(() => {
        typingInput.focus();
        typingInput.setSelectionRange(typingInput.value.length, typingInput.value.length);
        applyInputWidth();
      });

      startTimestamp = performance.now();
      setupTimer();
      timerEl.textContent = formatTime(countdownSeconds);
    } catch (error) {
      resetTestState();
      setScreen(startScreen);
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

  if (loginForm) {
    loginForm.addEventListener('submit', (event) => {
      event.preventDefault();
      handleLogin();
    });
  }

  if (logoutButton) {
    logoutButton.addEventListener('click', handleLogout);
  }

  durationButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const duration = parseDurationValue(button);
      if (!Number.isFinite(duration) || duration <= 0) return;
      startDuration(duration);
    });
  });

  restartBtn.addEventListener('click', () => {
    const preferredDuration = Number.isFinite(testDuration) && testDuration > 0
      ? testDuration
      : getPreferredDuration();
    if (!Number.isFinite(preferredDuration) || preferredDuration <= 0) {
      setScreen(startScreen);
      requestAnimationFrame(() => {
        focusActiveDurationButton();
      });
      return;
    }
    startDuration(preferredDuration);
  });

  backBtn.addEventListener('click', () => {
    resetTestState();
    setScreen(startScreen);
    requestAnimationFrame(() => {
      focusActiveDurationButton();
    });
  });

  typingInput.addEventListener('input', handleInput);

  resultsRetry.addEventListener('click', () => {
    const preferredDuration = getPreferredDuration();
    if (!Number.isFinite(preferredDuration) || preferredDuration <= 0) {
      setScreen(startScreen);
      requestAnimationFrame(() => {
        focusActiveDurationButton();
      });
      return;
    }
    startDuration(preferredDuration);
  });

  resultsMenu.addEventListener('click', () => {
    resetTestState();
    setScreen(startScreen);
    requestAnimationFrame(() => {
      focusActiveDurationButton();
    });
  });

  window.addEventListener('keydown', (event) => {
    if (event.defaultPrevented || event.repeat) {
      return;
    }

    const { key } = event;
    const activeElement = document.activeElement;
    const lowerKey = typeof key === 'string' ? key.toLowerCase() : '';
    const restartKey = lowerKey === 'r' || key === ' ' || key === 'Spacebar';
    const isMenuActive = activeScreen === startScreen;
    const isTestOrResults = activeScreen === testScreen || activeScreen === resultsScreen;

    if (isMenuActive) {
      if (isTextEntryElement(activeElement)) {
        return;
      }

      if (/^[1-9]$/.test(key)) {
        const numericIndex = Number.parseInt(key, 10) - 1;
        if (numericIndex >= 0 && numericIndex < durationButtons.length) {
          event.preventDefault();
          startDurationByIndex(numericIndex);
          return;
        }
      }

      if (durationButtons.length > 0) {
        if (key === 'ArrowLeft' || key === 'ArrowUp') {
          event.preventDefault();
          const currentIndex = getCurrentDurationIndex();
          const targetIndex = currentIndex > 0 ? currentIndex - 1 : 0;
          startDurationByIndex(targetIndex);
          return;
        }
        if (key === 'ArrowRight' || key === 'ArrowDown') {
          event.preventDefault();
          const currentIndex = getCurrentDurationIndex();
          const fallbackIndex = durationButtons.length - 1;
          const targetIndex = currentIndex >= 0 && currentIndex < fallbackIndex
            ? currentIndex + 1
            : fallbackIndex;
          startDurationByIndex(targetIndex);
          return;
        }
      }
    }

    if (key === 'Escape' && isTestOrResults) {
      event.preventDefault();
      resetTestState();
      setScreen(startScreen);
      requestAnimationFrame(() => {
        focusActiveDurationButton();
      });
      return;
    }

    if (restartKey && isTestOrResults) {
      if (isTextEntryElement(activeElement) && activeElement === typingInput && !typingInput.disabled) {
        return;
      }
      event.preventDefault();
      const preferredDuration = getPreferredDuration();
      if (!Number.isFinite(preferredDuration) || preferredDuration <= 0) {
        resetTestState();
        setScreen(startScreen);
        requestAnimationFrame(() => {
          focusActiveDurationButton();
        });
        return;
      }
      startDuration(preferredDuration);
    }
  });

  observeTextPanel();

  const storedSettings = loadStoredSettings();
  const cookieSettings = readGistSettingsCookie();

  if (aliasInput && storedSettings.alias) {
    aliasInput.value = storedSettings.alias;
  }

  if (gistIdInput) {
    const initialGistId = storedSettings.gistId || cookieSettings.gistId;
    if (initialGistId) {
      gistIdInput.value = initialGistId;
    }
  }

  const sessionToken = getSessionToken();
  if (tokenInput) {
    if (sessionToken) {
      tokenInput.value = sessionToken;
    } else if (cookieSettings.gistToken) {
      tokenInput.value = cookieSettings.gistToken;
    }
  }

  const initialInputs = sanitizeGistSettings({
    gistId: gistIdInput ? gistIdInput.value : '',
    gistToken: tokenInput ? tokenInput.value : '',
  });
  gistId = initialInputs.gistId;
  gistToken = initialInputs.gistToken || sessionToken || '';

  if (gistIdInput) {
    gistIdInput.value = gistId;
  }
  if (tokenInput && initialInputs.gistToken) {
    tokenInput.value = initialInputs.gistToken;
  }

  updateAliasBadge();
  setLoginState(false);
  renderScoreHistory();
  setLoginStatus('Log in with your alias to start tracking scores.');

  const aliasForAutoLogin = aliasInput ? aliasInput.value.trim() : '';
  const tokenForAutoLogin = sessionToken || (tokenInput ? tokenInput.value.trim() : '');
  if (aliasForAutoLogin && gistId && tokenForAutoLogin) {
    handleLogin(true);
  }

  setScreen(startScreen);
  requestAnimationFrame(() => {
    focusActiveDurationButton();
  });

  window.addEventListener('beforeunload', () => {
    stopTimer();
  });
})();
