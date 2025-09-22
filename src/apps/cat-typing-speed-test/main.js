(() => {
  const loginScreen = document.getElementById('login-screen');
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

  const loginForm = document.getElementById('login-form');
  const aliasInput = document.getElementById('alias-input');
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
  const GIST_SETTINGS_MESSAGE = 'g1-gist-settings-update';
  const gistSettingsChannel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('g1-gist-settings') : null;

  const sanitizeGistSettings = (value = {}) => {
    const gistId = typeof value.gistId === 'string' ? value.gistId.trim() : '';
    const gistToken = typeof value.gistToken === 'string'
      ? value.gistToken.trim()
      : typeof value.token === 'string'
        ? value.token.trim()
        : '';

    return { gistId, gistToken };
  };

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

  const readSharedGistSettings = () => {
    let embeddedSettings = null;

    if (typeof window !== 'undefined') {
      const candidates = [window];
      if (window.parent && window.parent !== window) {
        candidates.push(window.parent);
      }

      for (let index = 0; index < candidates.length; index += 1) {
        const scope = candidates[index];
        if (!scope) {
          continue;
        }

        try {
          if (typeof scope.readGlobalGistSettings === 'function') {
            embeddedSettings = scope.readGlobalGistSettings();
            break;
          }
        } catch (error) {
          console.warn('Unable to read embedded global gist settings.', error);
        }
      }
    }

    if (embeddedSettings) {
      const sanitized = sanitizeGistSettings(embeddedSettings);
      if (sanitized.gistId || sanitized.gistToken) {
        return sanitized;
      }
    }

    return readGistSettingsCookie();
  };

  const defaultStartHint = startHint ? startHint.textContent : '';

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
      if (!raw) return { alias: '' };
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') {
        return { alias: '' };
      }

      const alias = typeof parsed.alias === 'string' ? parsed.alias : '';
      return { alias };
    } catch (error) {
      console.warn('Unable to parse stored Cat Typing settings.', error);
      return { alias: '' };
    }
  };

  const persistLocalSettings = (aliasValue) => {
    try {
      const payload = { alias: aliasValue || '' };
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

  const updateStartHint = (canSync) => {
    if (!startHint) return;
    if (canSync) {
      startHint.textContent = defaultStartHint;
    } else {
      startHint.textContent = 'Connect GitHub access from the global settings to sync your scores. You can still practice without signing in.';
    }
  };

  const setLoginState = (loggedIn) => {
    if (logoutButton) {
      logoutButton.disabled = !loggedIn;
    }
    const canSync = Boolean(loggedIn && gistId && gistToken);
    updateStartHint(canSync);
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
    if (!currentAlias) return;

    if (!gistId || !gistToken) {
      setLoginStatus('GitHub access missing. Open the global settings to reconnect before syncing scores.', 'info');
      return;
    }

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
      setLoginStatus('Result not saved — enter your alias after reconnecting GitHub access to store your history.', 'error');
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
    const sharedSettings = readSharedGistSettings();
    const normalizedGistId = sharedSettings.gistId;
    const normalizedToken = sharedSettings.gistToken;

    if (!aliasValue) {
      setLoginStatus('Enter an alias to continue.', 'error');
      return;
    }

    gistId = normalizedGistId;
    gistToken = normalizedToken;

    if (!normalizedGistId || !normalizedToken) {
      setLoginStatus('Connect a GitHub gist in the global settings to sync your scores.', 'error');
      return;
    }

    if (loginButton) {
      loginButton.disabled = true;
    }
    setLoginStatus('Loading score history…');

    currentAlias = aliasValue;

    try {
      await fetchGistFromGitHub();
      persistLocalSettings(aliasValue);
      setSessionToken(normalizedToken);
      isLoggedIn = true;
      setLoginState(true);
      updateAliasBadge();
      renderScoreHistory();
      setLoginStatus(`Signed in as ${aliasValue}.`, 'success');
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
      if (!isAuto && aliasInput) {
        aliasInput.focus();
      }
      isLoggedIn = false;
      setScreen('login-screen');
    } finally {
      if (loginButton) {
        loginButton.disabled = false;
      }
    }
  };

  const performLogout = ({ statusMessage, statusTone } = {}) => {
    const normalizedAlias = aliasInput ? aliasInput.value.trim() : '';
    persistLocalSettings(normalizedAlias);
    setSessionToken('');
    gistStore = {};
    currentAlias = '';
    syncInFlight = false;
    syncPending = false;
    isLoggedIn = false;
    setLoginState(false);
    updateAliasBadge();
    renderScoreHistory();
    setLoginStatus(statusMessage || 'Signed out. Enter your alias after reconnecting GitHub access to sync again.', statusTone || 'info');
  };

  const handleLogout = () => {
    performLogout({});
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

    if (!hasChanged) {
      return;
    }

    if (sanitized.gistToken) {
      setSessionToken(sanitized.gistToken);
      if (!isLoggedIn && currentAlias) {
        if (aliasInput && !aliasInput.value.trim()) {
          aliasInput.value = currentAlias;
        }
        handleLogin(true);
        return;
      }
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
      const hadAlias = Boolean(currentAlias);
      if (isLoggedIn) {
        isLoggedIn = false;
      }
      setLoginState(hadAlias);
      if (hadAlias) {
        setLoginStatus('GitHub access removed in another tab. Open the global settings to reconnect before syncing again.', 'info');
      }
      updateAliasBadge();
      renderScoreHistory();
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

  const focusableSelector = [
    'button:not([disabled])',
    '[href]',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  const findFirstFocusable = (container) => {
    if (!container) return null;
    return container.querySelector(focusableSelector);
  };

  const screenRegistry = {
    'login-screen': {
      element: loginScreen,
      getDefaultFocus: () => aliasInput || findFirstFocusable(loginScreen),
    },
    'start-screen': {
      element: startScreen,
      getDefaultFocus: () =>
        (startScreen && startScreen.querySelector('.duration-btn')) || findFirstFocusable(startScreen),
    },
    'test-screen': {
      element: testScreen,
      getDefaultFocus: () => typingInput || findFirstFocusable(testScreen),
    },
    'results-screen': {
      element: resultsScreen,
      getDefaultFocus: () => resultsRetry || findFirstFocusable(resultsScreen),
    },
  };

  const setScreen = (screenId, options = {}) => {
    const config = screenRegistry[screenId];
    if (!config || !config.element) {
      return;
    }

    Object.values(screenRegistry).forEach(({ element }) => {
      if (!element) return;
      const isActive = element === config.element;
      element.classList.toggle('hidden', !isActive);
      element.setAttribute('aria-hidden', isActive ? 'false' : 'true');
    });

    if (typeof options.onShow === 'function') {
      options.onShow(config.element);
    }

    if (options.focus === false) {
      return;
    }

    requestAnimationFrame(() => {
      let target = null;
      if (typeof options.focusTarget === 'function') {
        target = options.focusTarget();
      } else if (options.focusTarget) {
        target = options.focusTarget;
      }

      if (!target && typeof config.getDefaultFocus === 'function') {
        target = config.getDefaultFocus();
      }

      if (!target) {
        target = findFirstFocusable(config.element);
      }

      if (target && typeof target.focus === 'function') {
        target.focus();
      }
    });
  };

  const isScreenActive = (screen) => {
    if (!screen) return false;
    const isHidden = screen.classList.contains('hidden');
    const ariaHidden = screen.getAttribute('aria-hidden');
    return !isHidden && ariaHidden !== 'true';
  };

  const scheduleNextFrame = (callback) => {
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(callback);
    } else {
      setTimeout(callback, 0);
    }
  };

  const focusTypingInput = ({ selectEnd = true } = {}) => {
    if (!typingInput || !isScreenActive(testScreen)) {
      return;
    }

    scheduleNextFrame(() => {
      if (!typingInput || typingInput.disabled || !isScreenActive(testScreen)) {
        return;
      }

      if (typeof typingInput.focus === 'function') {
        try {
          typingInput.focus({ preventScroll: true });
        } catch (error) {
          typingInput.focus();
        }
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

  const focusStartScreenControl = () => {
    if (!isScreenActive(startScreen)) {
      return;
    }

    const aliasTarget = !isLoggedIn && aliasInput && !aliasInput.disabled ? aliasInput : null;
    if (aliasTarget) {
      if (typeof aliasTarget.focus === 'function') {
        aliasTarget.focus({ preventScroll: true });
      }
      return;
    }

    const desiredDuration = Number.isFinite(testDuration) && testDuration > 0 ? testDuration : null;
    const activeButton = durationButtons.find((button) => {
      if (!button || button.disabled || desiredDuration === null) {
        return false;
      }
      const value = Number(button.dataset.duration);
      return Number.isFinite(value) && value === desiredDuration;
    });

    const fallbackButton = activeButton || durationButtons.find((button) => button && !button.disabled);

    if (fallbackButton && typeof fallbackButton.focus === 'function') {
      fallbackButton.focus({ preventScroll: true });
      return;
    }

    if (aliasInput && typeof aliasInput.focus === 'function' && !aliasInput.disabled) {
      aliasInput.focus({ preventScroll: true });
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

    setScreen('results-screen', { focusTarget: resultsRetry });
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
      focusTypingInput();
      scheduleNextFrame(() => {
        applyInputWidth();
      });

      startTimestamp = performance.now();
      setupTimer();
      timerEl.textContent = formatTime(countdownSeconds);
    } catch (error) {
      resetTestState();
      setScreen(startScreen);
      focusStartScreenControl();

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
      const duration = Number(button.dataset.duration);
      if (!Number.isFinite(duration) || duration <= 0) return;
      countdownSeconds = duration;
      beginTest(duration);
    });
  });

  restartBtn.addEventListener('click', () => {
    if (testDuration > 0 && targetText) {
      beginTest(testDuration);
    } else {
      setScreen(startScreen);
      focusStartScreenControl();

    }
  });

  backBtn.addEventListener('click', () => {
    resetTestState();
    setScreen(startScreen);
    focusStartScreenControl();

  });

  typingInput.addEventListener('input', handleInput);

  resultsRetry.addEventListener('click', () => {
    if (!targetText) {
      setScreen(startScreen);
      focusStartScreenControl();

      return;
    }
    beginTest(testDuration || 15);
  });

  resultsMenu.addEventListener('click', () => {
    resetTestState();
    setScreen(startScreen);
    focusStartScreenControl();

  });

  observeTextPanel();

  const storedSettings = loadStoredSettings();

  if (aliasInput && storedSettings.alias) {
    aliasInput.value = storedSettings.alias;
  }

  const sharedSettings = readSharedGistSettings();
  const sessionToken = getSessionToken();

  gistId = sharedSettings.gistId;
  gistToken = sharedSettings.gistToken;

  if (!gistToken && sessionToken) {
    setSessionToken('');
  }

  updateAliasBadge();
  setLoginState(false);
  renderScoreHistory();
  setLoginStatus('Enter your alias and use the global settings to connect GitHub before syncing scores.');

  const aliasForAutoLogin = aliasInput ? aliasInput.value.trim() : '';
  if (aliasForAutoLogin && gistId && gistToken) {
    handleLogin(true);
  }

  setScreen(startScreen);
  focusStartScreenControl();
  scheduleNextFrame(() => {
    focusTypingInput();
  });


  window.addEventListener('beforeunload', () => {
    stopTimer();
  });
})();
