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
  const aliasInput = document.getElementById('alias-input');

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
      getDefaultFocus: () => aliasInput || resultsRetry,
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

  observeTextPanel();
  beginTest(DEFAULT_DURATION);

  window.addEventListener('beforeunload', () => {
    stopTimer();
  });
})();
