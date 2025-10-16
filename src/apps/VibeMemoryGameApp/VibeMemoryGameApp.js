import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Brain, RotateCcw, Sparkles, Star, Volume2, VolumeX, Zap } from 'lucide-react';
import './VibeMemoryGameApp.css';

const THEMES = {
  sunset: {
    name: '🌅 Sunset',
    colors: ['#FF6B6B', '#4ECDC4', '#FFE66D', '#A8E6CF', '#FF8B94', '#C7CEEA'],
    gradient: 'linear-gradient(135deg, #a855f7, #ec4899, #fb923c)'
  },
  ocean: {
    name: '🌊 Ocean',
    colors: ['#006994', '#00A8CC', '#5DADE2', '#85C1E2', '#48C9B0', '#1ABC9C'],
    gradient: 'linear-gradient(135deg, #2563eb, #22d3ee, #14b8a6)'
  },
  forest: {
    name: '🌲 Forest',
    colors: ['#27AE60', '#52BE80', '#82E0AA', '#229954', '#7DCEA0', '#ABEBC6'],
    gradient: 'linear-gradient(135deg, #047857, #10b981, #84cc16)'
  },
  neon: {
    name: '⚡ Neon',
    colors: ['#FF00FF', '#00FFFF', '#FFFF00', '#FF1493', '#00FF00', '#FF4500'],
    gradient: 'linear-gradient(135deg, #6d28d9, #ec4899, #312e81)'
  }
};

const DIFFICULTIES = {
  easy: { pairs: 6, columns: 4 },
  medium: { pairs: 8, columns: 4 },
  hard: { pairs: 10, columns: 5 }
};

const createAudioTone = (context, frequency, duration, gainValue, startTime = 0) => {
  const oscillator = context.createOscillator();
  const gainNode = context.createGain();
  oscillator.frequency.value = frequency;
  gainNode.gain.value = gainValue;
  oscillator.connect(gainNode);
  gainNode.connect(context.destination);
  oscillator.start(context.currentTime + startTime);
  oscillator.stop(context.currentTime + startTime + duration);
};

const VibeMemoryGameApp = () => {
  const [theme, setTheme] = useState('sunset');
  const [difficulty, setDifficulty] = useState('easy');
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [moves, setMoves] = useState(0);
  const [gameWon, setGameWon] = useState(false);
  const [soundOn, setSoundOn] = useState(true);
  const [bestScore, setBestScore] = useState({});

  const themeDetails = THEMES[theme];
  const difficultyDetails = DIFFICULTIES[difficulty];

  const playSound = useCallback((type) => {
    if (!soundOn || typeof window === 'undefined') {
      return;
    }

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      return;
    }

    const audioContext = new AudioContext();

    if (type === 'flip') {
      createAudioTone(audioContext, 400, 0.1, 0.1);
    } else if (type === 'match') {
      createAudioTone(audioContext, 600, 0.2, 0.15);
    } else if (type === 'win') {
      [523, 659, 784, 1047].forEach((frequency, index) => {
        createAudioTone(audioContext, frequency, 0.2, 0.1, index * 0.15);
      });
    }
  }, [soundOn]);

  const initGame = useCallback(() => {
    const numPairs = difficultyDetails.pairs;
    const colors = themeDetails.colors.slice(0, numPairs);
    const shuffledCards = [...colors, ...colors]
      .map((color, index) => ({ id: index, color }))
      .sort(() => Math.random() - 0.5);

    setCards(shuffledCards);
    setFlipped([]);
    setMatched([]);
    setMoves(0);
    setGameWon(false);
  }, [difficultyDetails.pairs, themeDetails.colors]);

  useEffect(() => {
    initGame();
  }, [initGame]);

  useEffect(() => {
    if (flipped.length !== 2 || !cards.length) {
      return;
    }

    const [firstIndex, secondIndex] = flipped;
    const firstCard = cards[firstIndex];
    const secondCard = cards[secondIndex];

    if (!firstCard || !secondCard) {
      return;
    }

    const nextMoveCount = moves + 1;
    setMoves((prev) => prev + 1);

    if (firstCard.color === secondCard.color) {
      playSound('match');
      setMatched((prev) => [...prev, firstIndex, secondIndex]);
      setFlipped([]);

      const totalMatched = matched.length + 2;
      if (totalMatched === cards.length) {
        const completionDelay = setTimeout(() => {
          setGameWon(true);
          playSound('win');
          const key = `${theme}-${difficulty}`;
          setBestScore((prev) => {
            const existingBest = prev[key];
            if (!existingBest || nextMoveCount < existingBest) {
              return { ...prev, [key]: nextMoveCount };
            }
            return prev;
          });
        }, 500);

        return () => clearTimeout(completionDelay);
      }
    } else {
      const resetDelay = setTimeout(() => {
        setFlipped([]);
      }, 800);
      return () => clearTimeout(resetDelay);
    }
  }, [flipped, cards, matched.length, difficulty, theme, moves, playSound]);

  const handleCardClick = useCallback((index) => {
    if (flipped.length === 2 || flipped.includes(index) || matched.includes(index)) {
      return;
    }

    playSound('flip');
    setFlipped((prev) => [...prev, index]);
  }, [flipped, matched, playSound]);

  const getDifficultyIcon = useCallback((value) => {
    if (value === 'easy') {
      return <Star size={16} />;
    }
    if (value === 'medium') {
      return <Zap size={16} />;
    }
    return <Brain size={16} />;
  }, []);

  const currentBest = bestScore[`${theme}-${difficulty}`];

  const gridStyle = useMemo(() => ({
    gridTemplateColumns: `repeat(${difficultyDetails.columns}, minmax(0, 1fr))`
  }), [difficultyDetails.columns]);

  return (
    <div
      className="vibe-memory-app"
      style={{ backgroundImage: themeDetails.gradient }}
    >
      <div className="vibe-memory-shell">
        <header className="vibe-memory-header">
          <h1 className="vibe-memory-title">
            <Sparkles size={36} />
            Vibe Memory
            <Sparkles size={36} />
          </h1>
          <p className="vibe-memory-subtitle">Match the colors, feel the flow</p>
        </header>

        <div className="vibe-memory-panel">
          <div className="vibe-memory-row vibe-memory-row--stretch">
            <div className="vibe-memory-theme-buttons">
              {Object.entries(THEMES).map(([key, value]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTheme(key)}
                  className={`vibe-memory-pill-button${theme === key ? ' vibe-memory-pill-button--active' : ''}`}
                >
                  {value.name}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setSoundOn((prev) => !prev)}
              className="vibe-memory-icon-button"
              aria-label={soundOn ? 'Mute sound effects' : 'Enable sound effects'}
            >
              {soundOn ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </button>
          </div>

          <div className="vibe-memory-difficulty-buttons">
            {Object.keys(DIFFICULTIES).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setDifficulty(key)}
                className={`vibe-memory-pill-button${difficulty === key ? ' vibe-memory-pill-button--active' : ''}`}
              >
                {getDifficultyIcon(key)}
                {key.charAt(0).toUpperCase() + key.slice(1)}
              </button>
            ))}
          </div>

          <div className="vibe-memory-row">
            <div className="vibe-memory-stats">
              <div>
                Moves: <span className="vibe-memory-metric-highlight">{moves}</span>
              </div>
              {currentBest && (
                <div>
                  Best: <span className="vibe-memory-metric-best">{currentBest}</span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={initGame}
              className="vibe-memory-reset-button"
            >
              <RotateCcw size={20} />
              Reset
            </button>
          </div>

          <div className="vibe-memory-grid" style={gridStyle}>
            {cards.map((card, index) => {
              const isFlipped = flipped.includes(index) || matched.includes(index);
              const isMatched = matched.includes(index);

              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => handleCardClick(index)}
                  className={`vibe-memory-card${isFlipped ? ' vibe-memory-card--flipped' : ''}${isMatched ? ' vibe-memory-card--matched' : ''}`}
                  style={isFlipped ? { background: card.color } : undefined}
                >
                  {!isFlipped && (
                    <div className="vibe-memory-card-face">✨</div>
                  )}
                </button>
              );
            })}
          </div>

          {gameWon && (
            <div className="vibe-memory-win">
              <div className="vibe-memory-win-panel">
                <p className="vibe-memory-win-title">🎉 You did it! 🎉</p>
                <p className="vibe-memory-win-text">Completed in {moves} moves</p>
                {currentBest === moves && (
                  <p className="vibe-memory-win-badge">🏆 New Best Score! 🏆</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VibeMemoryGameApp;
