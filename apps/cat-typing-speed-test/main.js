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
    const cpm = (correctChars / elapsedSeconds) * 60;
    const accuracy = typedChars === 0 ? 0 : (correctChars / typedChars) * 100;

    finalWpm.textContent = (words / minutes || 0).toFixed(1);
    finalCpm.textContent = (cpm || 0).toFixed(0);
    finalAccuracy.textContent = `${Math.max(0, Math.min(100, accuracy)).toFixed(1)}%`;

    const summary = reason === 'completed'
      ? 'Purrfect focus! You finished the story before the timer ran out.'
      : "Time's up! Scroll back for another lap with the cats.";
    resultsNote.textContent = summary;

    setScreen(resultsScreen);
    resultsRetry.focus();
  };

  const resetTestState = () => {
    stopTimer();
    typingInput.value = '';
    typingInput.disabled = false;
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
      typingInput.focus();

      countdownSeconds = testDuration;
      updateHighlights('');
      timerEl.textContent = formatTime(countdownSeconds);

      setScreen(testScreen);
      startTimestamp = performance.now();
      setupTimer();

      // Align timer display immediately.
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
    }
  });

  backBtn.addEventListener('click', () => {
    resetTestState();
    setScreen(startScreen);
  });

  typingInput.addEventListener('input', handleInput);

  resultsRetry.addEventListener('click', () => {
    if (!targetText) {
      setScreen(startScreen);
      return;
    }
    beginTest(testDuration || 15);
  });

  resultsMenu.addEventListener('click', () => {
    resetTestState();
    setScreen(startScreen);
  });

  setScreen(startScreen);

  window.addEventListener('beforeunload', () => {
    stopTimer();
  });
})();
