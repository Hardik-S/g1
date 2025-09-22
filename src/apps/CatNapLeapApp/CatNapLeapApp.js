import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import './CatNapLeapApp.css';
import { createBirdSpawn, createPowerupSpawn, summarizeLoadout } from './spawnLogic';

const LOCAL_STORAGE_KEY = 'catnap-leap-highscore';

const CAT_VARIATIONS = [
  {
    id: 'blossom',
    name: 'Blossom Peach',
    colors: {
      body: '#f9d6d0',
      earOuter: '#f6b5b0',
      earInner: '#ffe1df',
      eye: '#2f2a45',
      highlight: '#ffffff',
      nose: '#f46f94',
      mouth: '#f59fb7',
      cheek: '#ffbfd4',
    },
    pattern: null,
  },
  {
    id: 'ember',
    name: 'Ember Tabby',
    colors: {
      body: '#f8b77a',
      earOuter: '#f2915a',
      earInner: '#ffd3b0',
      eye: '#2f1f17',
      highlight: '#ffffff',
      nose: '#f46f6f',
      mouth: '#f48a66',
      cheek: '#ffcf9f',
    },
    pattern: { type: 'tabby', color: '#e48a49' },
  },
  {
    id: 'midnight',
    name: 'Midnight Tux',
    colors: {
      body: '#3e3a63',
      earOuter: '#2c284a',
      earInner: '#f0b5d2',
      eye: '#f5f6ff',
      highlight: '#d7dcff',
      nose: '#ff8cab',
      mouth: '#ffb6d2',
      cheek: '#ff9cc3',
    },
    pattern: { type: 'tuxedo', color: '#f9f6fd' },
  },
  {
    id: 'mist',
    name: 'Misty Cloud',
    colors: {
      body: '#e5edff',
      earOuter: '#c0cbf6',
      earInner: '#ffffff',
      eye: '#2f2a45',
      highlight: '#ffffff',
      nose: '#ff87ab',
      mouth: '#d4a4ff',
      cheek: '#d8e3ff',
    },
    pattern: { type: 'mask', color: '#f6f9ff' },
  },
  {
    id: 'mint',
    name: 'Mint Whisker',
    colors: {
      body: '#bff5d3',
      earOuter: '#87d9af',
      earInner: '#f2fff8',
      eye: '#1f3b34',
      highlight: '#ffffff',
      nose: '#ff8eb8',
      mouth: '#ffb4d0',
      cheek: '#ffe0ef',
    },
    pattern: { type: 'patch', color: '#9ae4bd' },
  },
  {
    id: 'violet',
    name: 'Violet Dream',
    colors: {
      body: '#d7c2ff',
      earOuter: '#bca1ff',
      earInner: '#f8ebff',
      eye: '#2e1a3f',
      highlight: '#ffffff',
      nose: '#ff9ccf',
      mouth: '#ffb7e1',
      cheek: '#ffd8f1',
    },
    pattern: { type: 'star', color: '#f4e7ff' },
  },
];

const SHOP_ITEMS = [
  {
    id: 'coffee',
    name: 'Morning Brew',
    cost: 2,
    description: 'Shake off drowsiness at the start of your next run.',
  },
  {
    id: 'yarn',
    name: 'Bundle of Yarn',
    cost: 3,
    description: 'Extend the opening speed boost. Each bundle adds more pep.',
  },
  {
    id: 'catnip',
    name: 'Fresh Catnip',
    cost: 4,
    description: 'Begin with soothing slow motion. Stacks for longer calm.',
  },
];


const COMPACT_HUD_HEIGHT = 44;
const HUD_SAFE_ZONE = COMPACT_HUD_HEIGHT + 16;
const SHOP_ITEM_LABELS = SHOP_ITEMS.reduce((acc, item) => {
  acc[item.id] = item.name;
  return acc;
}, {});


const CatSpritePreview = ({ appearance }) => {
  const { colors, pattern } = appearance;
  const { body, earOuter, earInner, eye, highlight, nose, mouth } = colors;

  const renderPattern = () => {
    if (!pattern) return null;
    switch (pattern.type) {
      case 'tabby':
        return (
          <g fill={pattern.color} opacity="0.65">
            <path d="M45 6 L55 -18 L35 -18 Z" />
            <path d="M0 -4 L10 -28 L-10 -28 Z" />
            <path d="M-45 6 L-35 -18 L-55 -18 Z" />
          </g>
        );
      case 'mask':
        return <ellipse cx="0" cy="-6" rx="50" ry="38" fill={pattern.color} opacity="0.85" />;
      case 'patch':
        return <ellipse cx="-24" cy="-4" rx="30" ry="24" fill={pattern.color} opacity="0.85" />;
      case 'tuxedo':
        return <ellipse cx="0" cy="28" rx="42" ry="34" fill={pattern.color} opacity="0.85" />;
      case 'star':
        return (
          <path
            d="M0 -42 L5 -28 L20 -28 L8 -18 L12 -4 L0 -12 L-12 -4 L-8 -18 L-20 -28 L-5 -28 Z"
            fill={pattern.color}
            opacity="0.9"
          />
        );
      default:
        return null;
    }
  };

  return (
    <svg className="cat-sprite-svg" viewBox="0 0 120 120" role="img" aria-hidden="true" focusable="false">
      <g transform="translate(60 70)">
        <path d="M-34 -14 L-12 -58 L16 -16 Z" fill={earOuter} />
        <path d="M14 -16 L36 -58 L52 -14 Z" fill={earOuter} />
        <path d="M-28 -18 L-12 -50 L6 -20 Z" fill={earInner} />
        <path d="M18 -20 L34 -50 L46 -18 Z" fill={earInner} />
        <circle cx="0" cy="0" r="46" fill={body} />
        {renderPattern()}
        <ellipse cx="-20" cy="-6" rx="12" ry="16" fill={eye} />
        <ellipse cx="20" cy="-6" rx="12" ry="16" fill={eye} />
        <circle cx="-25" cy="-12" r="6" fill={highlight} />
        <circle cx="15" cy="-12" r="6" fill={highlight} />
        <path d="M0 0 L-10 12 L10 12 Z" fill={nose} />
        <path d="M-20 18 L20 18" stroke={mouth} strokeWidth="5" strokeLinecap="round" />
      </g>
    </svg>
  );
};

const mixColor = (startHex, endHex, t) => {
  const clampT = Math.max(0, Math.min(1, t));
  const parse = (hex) => {
    const value = parseInt(hex.replace('#', ''), 16);
    return {
      r: (value >> 16) & 255,
      g: (value >> 8) & 255,
      b: value & 255,
    };
  };
  const colorA = parse(startHex);
  const colorB = parse(endHex);
  const red = Math.round(colorA.r + (colorB.r - colorA.r) * clampT);
  const green = Math.round(colorA.g + (colorB.g - colorA.g) * clampT);
  const blue = Math.round(colorA.b + (colorB.b - colorA.b) * clampT);
  return `rgb(${red}, ${green}, ${blue})`;
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const createInitialState = (width, height, highScore, catAppearance, kittenMode = false) => {
  const baseRadius = Math.max(14, width * 0.035);
  return {
    phase: 'ready',
    canvasWidth: width,
    canvasHeight: height,
    hudSafeZone: HUD_SAFE_ZONE,
    time: 0,
    idleTime: 0,
    cat: {
      x: width * 0.28,
      y: height * 0.5,
      baseRadius,
      radius: baseRadius,
      scale: 1,
      scaleTarget: 1,
      vy: 0,
      blinkCountdown: 1.2 + Math.random() * 2.6,
      blinkDuration: 0,
      blinkTime: 0,
      tailPhase: Math.random() * Math.PI * 2,
    },
    pillows: [],
    powerups: [],
    birds: [],
    pillowTimer: 0,
    pillowInterval: 1500,
    powerupTimer: 0,
    nextPowerupAt: 8500,
    birdTimer: 0,
    nextBirdAt: 10500,
    stats: {
      score: 0,
      perfects: 0,
    },
    drowsiness: 0,
    lastReason: 'Tap or press space to wake Noodle the cat.',
    highScore,
    effects: {
      yarnUntil: 0,
      catnipUntil: 0,
    },
    catAppearance: catAppearance || CAT_VARIATIONS[0],
    kittenMode,
  };
};

const CatNapLeapApp = () => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const animationRef = useRef();
  const stateRef = useRef(null);
  const lastFrameRef = useRef(null);
  const statsSnapshotRef = useRef({ score: 0, perfects: 0, best: 0 });
  const effectsSnapshotRef = useRef([]);
  const drowsinessRef = useRef(0);
  const audioContextRef = useRef(null);
  const spaceHoldTimeoutRef = useRef(null);
  const spaceHoldStartRef = useRef(null);
  const isSpaceHeldRef = useRef(false);

  const [phase, setPhase] = useState('start');
  const [stats, setStats] = useState({ score: 0, perfects: 0, best: 0 });
  const [drowsiness, setDrowsiness] = useState(0);
  const [message, setMessage] = useState('Tap or press space to wake Noodle the cat.');
  const [effects, setEffects] = useState([]);
  const [kittenMode, setKittenMode] = useState(false);
  const [selectedCatId, setSelectedCatId] = useState(CAT_VARIATIONS[0].id);
  const [hasSelectedCat, setHasSelectedCat] = useState(true);
  const [treats, setTreats] = useState(0);
  const treatsRef = useRef(0);
  const [pendingLoadout, setPendingLoadout] = useState({ coffee: 0, yarn: 0, catnip: 0 });
  const pendingLoadoutRef = useRef(pendingLoadout);
  const [startBoostIndicators, setStartBoostIndicators] = useState([]);
  const [shopFeedback, setShopFeedback] = useState('');
  const [focusedShopIndex, setFocusedShopIndex] = useState(0);
  const shopFocusRef = useRef(0);
  const [catFocusIndex, setCatFocusIndex] = useState(0);
  const catFocusRef = useRef(0);
  const drowsinessLabelId = useId();
  const drowsinessValueId = useId();

  const selectedAppearance = useMemo(
    () => CAT_VARIATIONS.find((cat) => cat.id === selectedCatId) || CAT_VARIATIONS[0],
    [selectedCatId],
  );
  const queuedBoosts = useMemo(() => summarizeLoadout(pendingLoadout), [pendingLoadout]);

  useEffect(() => {
    const index = Math.max(0, CAT_VARIATIONS.findIndex((cat) => cat.id === selectedCatId));
    setCatFocusIndex(index);
    catFocusRef.current = index;
  }, [selectedCatId]);

  useEffect(() => {
    pendingLoadoutRef.current = pendingLoadout;
  }, [pendingLoadout]);

  useEffect(() => {
    shopFocusRef.current = focusedShopIndex;
  }, [focusedShopIndex]);

  useEffect(() => {
    if (!shopFeedback) return undefined;
    const timeout = setTimeout(() => {
      setShopFeedback('');
    }, 2400);
    return () => clearTimeout(timeout);
  }, [shopFeedback]);

  useEffect(() => {
    if (startBoostIndicators.length === 0) return undefined;
    const timeout = setTimeout(() => {
      setStartBoostIndicators([]);
    }, 5200);
    return () => clearTimeout(timeout);
  }, [startBoostIndicators]);

  const ensureAudioContext = () => {
    if (audioContextRef.current) {
      return audioContextRef.current;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
      return null;
    }
    const ctx = new AudioCtx();
    audioContextRef.current = ctx;
    return ctx;
  };

  const playMeow = () => {
    const ctx = ensureAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(420, now);
    oscillator.frequency.exponentialRampToValueAtTime(620, now + 0.12);
    oscillator.frequency.exponentialRampToValueAtTime(340, now + 0.32);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.25, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.5);
  };

  const playChime = () => {
    const ctx = ensureAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(660, now);
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.2);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.4);

    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);
  };

  const publishStats = (score, perfects, best) => {
    const snapshot = statsSnapshotRef.current;
    if (snapshot.score !== score || snapshot.perfects !== perfects || snapshot.best !== best) {
      statsSnapshotRef.current = { score, perfects, best };
      setStats({ score, perfects, best });
    }
  };

  const publishDrowsiness = (value) => {
    if (Math.abs(drowsinessRef.current - value) >= 0.5 || value === 0 || value >= 100) {
      drowsinessRef.current = value;
      setDrowsiness(value);
    }
  };

  const publishEffects = (list) => {
    const prev = effectsSnapshotRef.current;
    if (prev.length === list.length && prev.every((entry, index) => entry === list[index])) {
      return;
    }
    effectsSnapshotRef.current = list;
    setEffects(list);
  };

  const resizeCanvas = () => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const width = Math.min(container.clientWidth - 24, 520);
    const adjustedWidth = Math.max(320, width);
    const height = Math.max(420, Math.round(adjustedWidth * 1.5));

    canvas.width = adjustedWidth;
    canvas.height = height;
    canvas.style.width = `${adjustedWidth}px`;
    canvas.style.height = `${height}px`;

    if (!stateRef.current) {
      const storedHigh = Number.parseInt(localStorage.getItem(LOCAL_STORAGE_KEY) || '0', 10) || 0;
      stateRef.current = createInitialState(adjustedWidth, height, storedHigh, selectedAppearance, kittenMode);
      statsSnapshotRef.current = {
        score: 0,
        perfects: 0,
        best: storedHigh,
      };
      setStats({ score: 0, perfects: 0, best: storedHigh });
      setDrowsiness(0);
      setPhase('start');
      setMessage('Tap or press space to wake Noodle the cat.');
    } else {
      const state = stateRef.current;
      state.canvasWidth = adjustedWidth;
      state.canvasHeight = height;
      state.hudSafeZone = HUD_SAFE_ZONE;
      state.cat.x = adjustedWidth * 0.28;
      state.cat.y = height * 0.5;
      const resizedBaseRadius = Math.max(14, adjustedWidth * 0.035);
      state.cat.baseRadius = resizedBaseRadius;
      if (typeof state.cat.scale !== 'number') {
        state.cat.scale = 1;
      }
      if (typeof state.cat.scaleTarget !== 'number') {
        state.cat.scaleTarget = state.cat.scale;
      }
      state.cat.radius = resizedBaseRadius * state.cat.scale;
      state.catAppearance = selectedAppearance;
      state.kittenMode = kittenMode;
    }
  };

  const resetGameState = (options = {}) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const state = stateRef.current;
    const highScore = state?.highScore || 0;
    const appearance = options.catAppearance || selectedAppearance;
    const activeKittenMode = options.kittenMode ?? kittenMode;
    stateRef.current = createInitialState(canvas.width, canvas.height, highScore, appearance, activeKittenMode);
    setKittenMode(activeKittenMode);
    statsSnapshotRef.current = { score: 0, perfects: 0, best: highScore };
    effectsSnapshotRef.current = [];
    drowsinessRef.current = 0;
    setStats({ score: 0, perfects: 0, best: highScore });
    setEffects([]);
    setStartBoostIndicators([]);
    setDrowsiness(0);
    const targetPhase = options.forcePhase || (hasSelectedCat || options.catAppearance ? 'ready' : 'start');
    setPhase(targetPhase);
    if (targetPhase === 'ready') {
      setMessage('Tap or press space to wake Noodle the cat.');
    } else if (targetPhase === 'start') {
      setMessage('Tap or press space to wake Noodle the cat.');
    }
  };

  const startPlaying = () => {
    const state = stateRef.current;
    if (!state || state.phase === 'playing') return;
    if (!hasSelectedCat) {
      setPhase('selecting');
      setMessage('Choose a dreamer to begin leaping.');
      return;
    }
    state.phase = 'playing';
    state.time = 0;
    state.stats.score = 0;
    state.stats.perfects = 0;
    state.drowsiness = 8;
    state.lastReason = '';
    state.effects.yarnUntil = 0;
    state.effects.catnipUntil = 0;
    state.powerups = [];
    state.birds = [];
    state.powerupTimer = 0;
    state.nextPowerupAt = 7500 + Math.random() * 2800;
    state.birdTimer = 0;
    state.nextBirdAt = 9000 + Math.random() * 4200;
    state.kittenMode = kittenMode;
    state.catAppearance = selectedAppearance;
    if (state.cat) {
      state.cat.vy = 0;
      state.cat.scale = 1;
      state.cat.scaleTarget = 1;
      state.cat.radius = state.cat.baseRadius;
      state.cat.blinkCountdown = 0.8 + Math.random() * 1.8;
      state.cat.blinkDuration = 0;
      state.cat.blinkTime = 0;
      state.cat.tailPhase = Math.random() * Math.PI * 2;
    }

    const loadout = pendingLoadoutRef.current;
    const loadoutSummary = summarizeLoadout(loadout);
    const now = performance.now();
    if (loadoutSummary.length > 0) {
      const indicatorLabels = [];
      loadoutSummary.forEach(({ type, count }) => {
        switch (type) {
          case 'coffee':
            state.drowsiness = 0;
            indicatorLabels.push(`Morning Brew ×${count}`);
            break;
          case 'yarn':
            state.effects.yarnUntil = now + 4000 * count;
            indicatorLabels.push(`Yarn Boost ×${count}`);
            break;
          case 'catnip':
            state.effects.catnipUntil = now + 3000 * count;
            indicatorLabels.push(`Catnip Calm ×${count}`);
            break;
          default:
            break;
        }
      });
      setStartBoostIndicators(indicatorLabels);
      pendingLoadoutRef.current = { coffee: 0, yarn: 0, catnip: 0 };
      setPendingLoadout({ coffee: 0, yarn: 0, catnip: 0 });
    } else {
      setStartBoostIndicators([]);
    }

    publishStats(0, 0, state.highScore);
    publishDrowsiness(state.drowsiness);
    publishEffects(getActiveEffectLabels(state.effects, now));
    setPhase('playing');
    setMessage('Leap between pillows and sip coffee before sleep wins!');
  };

  const triggerGameOver = (reason) => {
    const state = stateRef.current;
    if (!state || state.phase === 'gameover') return;

    state.phase = 'gameover';
    state.lastReason = reason;

    if (state.stats.score > state.highScore) {
      state.highScore = state.stats.score;
      localStorage.setItem(LOCAL_STORAGE_KEY, String(state.stats.score));
    }

    publishStats(state.stats.score, state.stats.perfects, state.highScore);
    publishDrowsiness(state.drowsiness);
    publishEffects([]);

    setPhase('gameover');

    setMessage(`${reason} Hold space for 2 seconds to leap again, or choose a different dream.`);

  };

  const applyJump = () => {
    const state = stateRef.current;
    if (!state || state.phase !== 'playing') return;

    state.cat.vy = -340;
    playMeow();
  };

  const toggleKittenMode = () => {
    const state = stateRef.current;
    if (!state) return;
    const next = !state.kittenMode;
    state.kittenMode = next;
    setKittenMode(next);
    if (state.phase !== 'playing') {
      setMessage(next ? 'Kitten Mode engaged. Leap when you are ready!' : 'Cat Mode ready for action.');
    }
  };

  const activatePowerup = (powerup, now) => {
    const state = stateRef.current;
    if (!state) return;

    switch (powerup.type) {
      case 'coffee':
        state.drowsiness = 0;
        break;
      case 'yarn':
        state.effects.yarnUntil = now + 4000;
        break;
      case 'catnip':
        state.effects.catnipUntil = now + 3000;
        break;
      default:
        break;
    }
    publishEffects(getActiveEffectLabels(state.effects, now));
    playChime();
  };

  const getActiveEffectLabels = (effects, now) => {
    const labels = [];
    if (effects.yarnUntil > now) {
      labels.push('Yarn Speed Boost');
    }
    if (effects.catnipUntil > now) {
      labels.push('Catnip Slow Motion');
    }
    return labels;
  };

  const handleSelectCat = (variation) => {
    setSelectedCatId(variation.id);
    setHasSelectedCat(true);
    const state = stateRef.current;
    if (state) {
      state.catAppearance = variation;
    }
    resetGameState({ catAppearance: variation, forcePhase: phase === 'start' ? 'start' : 'ready' });
  };

  const handlePurchase = (item) => {
    if (!item) return;
    if (treatsRef.current < item.cost) {
      setShopFeedback('Not enough treats yet. Catch more birds!');
      return;
    }
    treatsRef.current -= item.cost;
    setTreats(treatsRef.current);
    const next = {
      ...pendingLoadoutRef.current,
      [item.id]: (pendingLoadoutRef.current[item.id] || 0) + 1,
    };
    pendingLoadoutRef.current = next;
    setPendingLoadout(next);
    setShopFeedback(`${item.name} queued for your next dream!`);
  };

  const updateGame = (timestamp) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const state = stateRef.current;
    if (!state) return;

    if (!lastFrameRef.current) {
      lastFrameRef.current = timestamp;
    }
    const deltaMs = timestamp - lastFrameRef.current;
    lastFrameRef.current = timestamp;
    const delta = clamp(deltaMs / 1000, 0, 0.033);

    const { canvasWidth: width, canvasHeight: height } = state;

    state.time += deltaMs;

    const cat = state.cat;
    if (cat) {
      const baseRadius = Math.max(14, width * 0.035);
      cat.baseRadius = baseRadius;
      if (typeof cat.scale !== 'number') {
        cat.scale = 1;
      }
      if (typeof cat.scaleTarget !== 'number') {
        cat.scaleTarget = cat.scale;
      }
      const easeRate = 6;
      const easeT = 1 - Math.exp(-easeRate * delta);
      cat.scale += (cat.scaleTarget - cat.scale) * easeT;
      cat.radius = cat.baseRadius * cat.scale;

      const tailSpeed = state.phase === 'playing' ? 3.6 : 2.4;
      cat.tailPhase = (cat.tailPhase + delta * tailSpeed) % (Math.PI * 2);

      if (cat.blinkDuration > 0) {
        cat.blinkTime += delta;
        if (cat.blinkTime >= cat.blinkDuration) {
          cat.blinkDuration = 0;
          cat.blinkTime = 0;
          cat.blinkCountdown = 1.8 + Math.random() * 2.6;
        }
      } else {
        cat.blinkCountdown -= delta;
        if (cat.blinkCountdown <= 0) {
          cat.blinkDuration = 0.12 + Math.random() * 0.06;
          cat.blinkTime = 0;
        }
      }
    }

    if (state.phase === 'ready') {
      state.idleTime += delta;
      const idleOffset = Math.sin(state.idleTime * 2) * 10;
      state.cat.y = height * 0.5 + idleOffset;
      state.cat.vy = 0;
    }

    if (state.phase === 'playing') {
      const now = performance.now();
      const gravity = 820;
      const baseSpeed = 170 + state.stats.score * 2.2;
      let speedMultiplier = 1;
      if (state.effects.yarnUntil > now) {
        speedMultiplier += 0.35;
      }
      if (state.effects.catnipUntil > now) {
        speedMultiplier -= 0.35;
      }
      speedMultiplier = clamp(speedMultiplier, 0.55, 1.6);
      const horizontalSpeed = baseSpeed * speedMultiplier;
      const hudSafeZone = state.hudSafeZone ?? HUD_SAFE_ZONE;

      state.cat.vy += gravity * delta;
      state.cat.y += state.cat.vy * delta;

      const drowsinessRate = (5.5 + state.stats.score * 0.03) * (state.kittenMode ? 0.2 : 1);
      state.drowsiness = clamp(state.drowsiness + drowsinessRate * delta, 0, 100);

      state.pillowTimer += deltaMs;
      const minGap = Math.max(height * 0.22, height * 0.35 - state.stats.score * 1.5);
      const gapHeight = clamp(minGap, height * 0.22, height * 0.38);
      const pillowInterval = clamp(1500 - state.stats.score * 12, 950, 1500);
      if (state.pillowTimer >= pillowInterval) {
        state.pillowTimer = 0;
        const gapRange = Math.max(0, height - gapHeight - hudSafeZone * 2);
        const gapCenter = clamp(
          Math.random() * gapRange + gapHeight / 2 + hudSafeZone,
          gapHeight / 2 + 40,
          height - gapHeight / 2 - 40,
        );
        state.pillows.push({
          x: width + 40,
          width: Math.max(80, width * 0.18),
          gapCenter,
          gapHeight,
          variant: Math.random() < 0.5 ? 'cluster' : 'column',
          scored: false,
        });
      }

      state.powerupTimer += deltaMs;
      if (state.powerupTimer >= state.nextPowerupAt) {
        state.powerupTimer = 0;
        state.nextPowerupAt = 7000 + Math.random() * 3200;
        const spawned = createPowerupSpawn(state, undefined, { hudSafeZone });
        if (spawned) {
          state.powerups.push(spawned);
        }
      }

      state.birdTimer += deltaMs;
      if (state.birdTimer >= state.nextBirdAt) {
        state.birdTimer = 0;
        state.nextBirdAt = 10000 + Math.random() * 4500;
        const bird = createBirdSpawn(state, { hudSafeZone });
        if (bird) {
          state.birds.push(bird);
        }
      }

      state.pillows = state.pillows.filter((pillow) => {
        pillow.x -= horizontalSpeed * delta;

        const gapTop = pillow.gapCenter - pillow.gapHeight / 2;
        const gapBottom = pillow.gapCenter + pillow.gapHeight / 2;

        if (!pillow.scored && pillow.x + pillow.width < state.cat.x - state.cat.radius) {
          pillow.scored = true;
          state.stats.score += 1;
          const centerDistance = Math.abs(state.cat.y - pillow.gapCenter);
          if (centerDistance <= pillow.gapHeight * 0.18) {
            state.stats.perfects += 1;
            state.drowsiness = clamp(state.drowsiness - 7, 0, 100);
          }
        }

        const withinHorizontal =
          state.cat.x + state.cat.radius > pillow.x &&
          state.cat.x - state.cat.radius < pillow.x + pillow.width;
        if (withinHorizontal) {
          if (state.cat.y - state.cat.radius < gapTop || state.cat.y + state.cat.radius > gapBottom) {
            triggerGameOver('Noodle bonked a pillow.');
          }
        }

        return pillow.x + pillow.width > -80;
      });

      state.powerups = state.powerups.filter((powerup) => {
        powerup.x -= horizontalSpeed * delta;
        const dx = powerup.x - state.cat.x;
        const dy = powerup.y - state.cat.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < powerup.radius + state.cat.radius * 0.8) {
          activatePowerup(powerup, now);
          return false;
        }
        return powerup.x + powerup.radius > -40;
      });

      state.birds = state.birds.filter((bird) => {
        bird.x += bird.speed * delta * bird.direction;

        const dx = bird.x - state.cat.x;
        const dy = bird.y - state.cat.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < bird.radius + state.cat.radius * 0.75) {
          treatsRef.current += 1;
          setTreats(treatsRef.current);
          playChime();
          if (state.cat) {
            const nextTarget = (state.cat.scaleTarget || 1) + 0.05;
            state.cat.scaleTarget = clamp(nextTarget, 1, 1.25);
          }
          return false;
        }

        const offRight = bird.direction === 1 && bird.x - bird.radius > width + 80;
        const offLeft = bird.direction === -1 && bird.x + bird.radius < -80;
        return !(offRight || offLeft);
      });

      if (state.cat.y + state.cat.radius >= height - 4) {
        triggerGameOver('Noodle dozed off on the ground.');
      } else if (state.cat.y - state.cat.radius <= 4) {
        triggerGameOver('Noodle bumped the ceiling.');
      } else if (state.drowsiness >= 100) {
        triggerGameOver('Drowsiness took over!');
      }

      publishStats(state.stats.score, state.stats.perfects, Math.max(state.highScore, state.stats.score));
      publishDrowsiness(state.drowsiness);
      publishEffects(getActiveEffectLabels(state.effects, performance.now()));
    }

    drawScene(ctx, state);

    animationRef.current = requestAnimationFrame(updateGame);
  };

  const drawScene = (ctx, state) => {
    const { canvasWidth: width, canvasHeight: height } = state;

    ctx.clearRect(0, 0, width, height);

    const timeOfDay = clamp((state.stats.score + state.drowsiness * 0.25) / 35, 0, 1);
    const dayTop = '#aee3ff';
    const dayBottom = '#fef6d7';
    const sunsetTop = '#f7b1ff';
    const sunsetBottom = '#ffd2a0';
    const nightTop = '#1c1b4b';
    const nightBottom = '#2d3e73';

    let topColor;
    let bottomColor;
    if (timeOfDay < 0.5) {
      const t = timeOfDay / 0.5;
      topColor = mixColor(dayTop, sunsetTop, t);
      bottomColor = mixColor(dayBottom, sunsetBottom, t);
    } else {
      const t = (timeOfDay - 0.5) / 0.5;
      topColor = mixColor(sunsetTop, nightTop, t);
      bottomColor = mixColor(sunsetBottom, nightBottom, t);
    }

    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, topColor);
    gradient.addColorStop(1, bottomColor);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    drawBackgroundDetails(ctx, state);

    state.pillows.forEach((pillow) => {
      drawPillow(ctx, pillow);
    });

    state.powerups.forEach((powerup) => {
      drawPowerup(ctx, powerup);
    });

    state.birds.forEach((bird) => {
      drawBird(ctx, bird, state.time);
    });

    drawCat(ctx, state);

    drawForeground(ctx, state);
  };

  const drawBackgroundDetails = (ctx, state) => {
    const width = state.canvasWidth;
    const height = state.canvasHeight;
    const twinkleCount = 12;
    const time = state.time * 0.001;

    for (let i = 0; i < twinkleCount; i += 1) {
      const x = ((i * 83.5) % width) + ((time * 10 + i * 20) % width);
      const y = (Math.sin(time * 0.5 + i) * 0.5 + 0.5) * (height * 0.4) + 30;
      const alpha = 0.3 + (Math.sin(time * 2 + i) + 1) * 0.25;
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(2)})`;
      ctx.beginPath();
      ctx.arc((x % width), y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    const cloudCount = 4;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    for (let i = 0; i < cloudCount; i += 1) {
      const x = ((time * 30 + i * 180) % (width + 160)) - 80;
      const y = 80 + i * 60;
      ctx.beginPath();
      ctx.ellipse(x, y, 70, 26, 0, 0, Math.PI * 2);
      ctx.ellipse(x + 50, y + 6, 60, 22, 0, 0, Math.PI * 2);
      ctx.ellipse(x - 45, y + 8, 55, 20, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const drawPillow = (ctx, pillow) => {
    const { x, width, gapCenter, gapHeight, variant = 'cluster' } = pillow;
    const topHeight = gapCenter - gapHeight / 2;
    const bottomY = gapCenter + gapHeight / 2;
    const canvasHeight = ctx.canvas.height;
    const pillowColor = variant === 'column' ? '#f1edff' : '#fef7ff';
    const outline = variant === 'column' ? '#c7bff0' : '#d8c9f5';
    const shadowColor = 'rgba(40, 32, 78, 0.18)';

    ctx.save();
    ctx.shadowColor = shadowColor;
    ctx.shadowBlur = 18;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 8;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    if (variant === 'column') {
      drawColumnSection(ctx, {
        x,
        width,
        top: 0,
        bottom: topHeight,
        color: pillowColor,
        outline,
        isTop: true,
      });

      drawColumnSection(ctx, {
        x,
        width,
        top: bottomY,
        bottom: canvasHeight,
        color: pillowColor,
        outline,
        isTop: false,
      });
    } else {
      drawCloudSection(ctx, {
        x,
        width,
        baseY: topHeight,
        canvasHeight,
        color: pillowColor,
        outline,
        isTop: true,
      });

      drawCloudSection(ctx, {
        x,
        width,
        baseY: bottomY,
        canvasHeight,
        color: pillowColor,
        outline,
        isTop: false,
      });
    }

    ctx.restore();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  };

  const drawCloudSection = (ctx, { x, width, baseY, canvasHeight, color, outline, isTop }) => {
    const lumps = Math.max(3, Math.round(width / 55));
    const step = width / lumps;
    const depth = Math.min(52, Math.max(24, step * 1.1));
    const arcY = clamp(baseY, 0, canvasHeight);
    const support = depth * 0.65;

    ctx.fillStyle = color;

    if (isTop) {
      const rectBottom = Math.max(0, arcY - support);
      if (rectBottom > 0) {
        ctx.beginPath();
        ctx.rect(x, 0, width, rectBottom);
        ctx.fill();
      }
    } else {
      const rectTop = Math.min(canvasHeight, arcY + support);
      if (rectTop < canvasHeight) {
        ctx.beginPath();
        ctx.rect(x, rectTop, width, canvasHeight - rectTop);
        ctx.fill();
      }
    }

    ctx.beginPath();
    if (isTop) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x + width, 0);
      ctx.lineTo(x + width, Math.max(0, arcY - support * 0.5));
    } else {
      ctx.moveTo(x, canvasHeight);
      ctx.lineTo(x + width, canvasHeight);
      ctx.lineTo(x + width, Math.min(canvasHeight, arcY + support * 0.5));
    }

    for (let i = lumps - 1; i >= 0; i -= 1) {
      const centerX = x + (i + 0.5) * step;
      const radiusX = step * 0.65;
      const radiusY = Math.min(depth, isTop ? arcY + depth : canvasHeight - arcY + depth);
      const startX = centerX + radiusX;
      ctx.lineTo(startX, arcY);
      ctx.ellipse(centerX, arcY, radiusX, radiusY, 0, 0, Math.PI, isTop ? false : true);
    }

    if (isTop) {
      ctx.lineTo(x, Math.max(0, arcY - support * 0.5));
    } else {
      ctx.lineTo(x, Math.min(canvasHeight, arcY + support * 0.5));
    }
    ctx.closePath();

    ctx.fill();
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2.3;
    ctx.stroke();

    const sheen = ctx.createLinearGradient(0, arcY - depth, 0, arcY + depth);
    if (isTop) {
      sheen.addColorStop(0, 'rgba(255, 255, 255, 0)');
      sheen.addColorStop(0.75, 'rgba(255, 255, 255, 0.32)');
      sheen.addColorStop(1, 'rgba(255, 255, 255, 0)');
    } else {
      sheen.addColorStop(0, 'rgba(255, 255, 255, 0)');
      sheen.addColorStop(0.25, 'rgba(255, 255, 255, 0.32)');
      sheen.addColorStop(1, 'rgba(255, 255, 255, 0)');
    }
    ctx.fillStyle = sheen;
    ctx.beginPath();
    for (let i = 0; i < lumps; i += 1) {
      const centerX = x + (i + 0.5) * step;
      const radiusX = step * 0.5;
      const radiusY = depth * 0.6;
      const offsetY = depth * 0.25;
      const ellipseY = isTop ? arcY - offsetY : arcY + offsetY;
      ctx.ellipse(centerX, ellipseY, radiusX, radiusY, 0, 0, Math.PI * 2);
    }
    ctx.fill();
  };

  const drawColumnSection = (ctx, { x, width, top, bottom, color, outline, isTop }) => {
    const height = bottom - top;
    if (height <= 0) return;

    const bodyInset = Math.min(width * 0.28, 38);
    const curveDepth = Math.min(height * 0.45, 42);
    const innerInset = Math.min(bodyInset * 0.65, width * 0.2);

    ctx.fillStyle = color;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 2.3;

    ctx.beginPath();
    if (isTop) {
      ctx.moveTo(x, top);
      ctx.lineTo(x + width, top);
      ctx.lineTo(x + width - bodyInset, bottom - curveDepth * 0.25);
      ctx.quadraticCurveTo(
        x + width * 0.5,
        bottom + curveDepth * 0.6,
        x + bodyInset,
        bottom - curveDepth * 0.25,
      );
    } else {
      ctx.moveTo(x + bodyInset, top + curveDepth * 0.25);
      ctx.quadraticCurveTo(
        x + width * 0.5,
        top - curveDepth * 0.6,
        x + width - bodyInset,
        top + curveDepth * 0.25,
      );
      ctx.lineTo(x + width, bottom);
      ctx.lineTo(x, bottom);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    const highlight = ctx.createLinearGradient(0, top, 0, bottom);
    highlight.addColorStop(isTop ? 0.05 : 0.4, 'rgba(255, 255, 255, 0.3)');
    highlight.addColorStop(isTop ? 0.8 : 0.95, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = highlight;
    ctx.beginPath();
    if (isTop) {
      ctx.moveTo(x + innerInset, top + height * 0.1);
      ctx.lineTo(x + width - innerInset, top + height * 0.1);
      ctx.lineTo(x + width - bodyInset * 0.85, bottom - curveDepth * 0.45);
      ctx.lineTo(x + bodyInset * 0.85, bottom - curveDepth * 0.45);
    } else {
      ctx.moveTo(x + bodyInset * 0.85, top + curveDepth * 0.45);
      ctx.lineTo(x + width - bodyInset * 0.85, top + curveDepth * 0.45);
      ctx.lineTo(x + width - innerInset, bottom - height * 0.1);
      ctx.lineTo(x + innerInset, bottom - height * 0.1);
    }
    ctx.closePath();
    ctx.fill();
  };

  const drawPowerup = (ctx, powerup) => {
    ctx.save();
    ctx.translate(powerup.x, powerup.y);

    switch (powerup.type) {
      case 'coffee':
        ctx.fillStyle = '#6b4f2d';
        ctx.beginPath();
        ctx.arc(0, 0, powerup.radius, Math.PI * 0.15, Math.PI * 1.85, false);
        ctx.lineTo(0, powerup.radius);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = '#f9efe0';
        ctx.beginPath();
        ctx.arc(0, -powerup.radius * 0.3, powerup.radius * 0.65, 0, Math.PI * 2);
        ctx.fill();
        break;
      case 'yarn':
        ctx.fillStyle = '#f77bbf';
        ctx.beginPath();
        ctx.arc(0, 0, powerup.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ff9cd3';
        ctx.lineWidth = 2;
        for (let i = -1; i <= 1; i += 1) {
          ctx.beginPath();
          ctx.arc(0, 0, powerup.radius * (0.3 + i * 0.1), 0, Math.PI * 2);
          ctx.stroke();
        }
        break;
      case 'catnip':
      default:
        ctx.fillStyle = '#70e2a0';
        ctx.beginPath();
        ctx.ellipse(0, 0, powerup.radius * 0.8, powerup.radius * 1.2, Math.PI / 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#97f0c1';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-powerup.radius * 0.2, -powerup.radius * 0.6);
        ctx.lineTo(powerup.radius * 0.3, powerup.radius * 0.7);
        ctx.stroke();
        break;
    }
    ctx.restore();
  };

  const drawBird = (ctx, bird, time) => {
    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.scale(bird.direction, 1);

    const flap = Math.sin(time * 0.012 + bird.flapOffset) * 0.8;

    ctx.fillStyle = '#ffe5a4';
    ctx.beginPath();
    ctx.ellipse(0, 0, bird.radius * 1.05, bird.radius * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fbd276';
    ctx.beginPath();
    ctx.ellipse(-bird.radius * 0.2, -bird.radius * 0.15, bird.radius * 0.7, bird.radius * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(-bird.radius * 0.15, -bird.radius * 0.1);
    ctx.rotate(flap * 0.6);
    ctx.fillStyle = '#f7b45a';
    ctx.beginPath();
    ctx.ellipse(0, 0, bird.radius * 0.9, bird.radius * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = '#ff9c5f';
    ctx.beginPath();
    ctx.moveTo(bird.radius * 0.95, -bird.radius * 0.1);
    ctx.lineTo(bird.radius * 1.35, 0);
    ctx.lineTo(bird.radius * 0.95, bird.radius * 0.1);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#2f2a45';
    ctx.beginPath();
    ctx.arc(bird.radius * 0.4, -bird.radius * 0.15, bird.radius * 0.16, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  };

  const drawCat = (ctx, state) => {
    const { x, y, radius, vy, tailPhase = 0, blinkDuration = 0, blinkTime = 0 } = state.cat;
    const droop = clamp(state.drowsiness / 100, 0, 1);
    const tilt = clamp(vy / 400, -0.5, 0.5);
    const appearance = state.catAppearance || CAT_VARIATIONS[0];
    const { colors, pattern } = appearance;
    const {
      body,
      earOuter,
      earInner,
      eye,
      highlight,
      nose,
      mouth,
      cheek,
    } = colors;

    const blinkProgress = blinkDuration > 0 ? Math.min(1, blinkTime / blinkDuration) : 0;
    const blinkEase = blinkDuration > 0 ? Math.sin(blinkProgress * Math.PI) : 0;
    const eyeOpenFactor = 1 - blinkEase;
    const tailAngle = -Math.PI / 6 - droop * 0.5 + Math.sin(tailPhase) * 0.3 + tilt * 0.25;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt * 0.3);

    ctx.save();
    ctx.shadowColor = 'rgba(34, 18, 58, 0.35)';
    ctx.shadowBlur = radius * 0.55;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = radius * 0.2;

    ctx.save();
    ctx.translate(-radius * 0.75, radius * 0.25);
    ctx.rotate(tailAngle);
    const tailLength = radius * 1.45;
    const tailWidth = radius * 0.45;
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(-tailLength * 0.25, -tailWidth * 0.7, -tailLength * 0.7, -tailWidth * 0.2);
    ctx.quadraticCurveTo(-tailLength * 1.05, tailWidth * 0.1, -tailLength * 0.65, tailWidth * 0.36);
    ctx.quadraticCurveTo(-tailLength * 0.2, tailWidth * 0.56, 0, tailWidth * 0.28);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.globalAlpha = 0.6;
    ctx.lineWidth = Math.max(1.5, radius * 0.12);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.03, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.restore();

    if (pattern) {
      ctx.save();
      ctx.fillStyle = pattern.color;
      ctx.globalAlpha = pattern.type === 'tabby' ? 0.65 : 0.9;
      switch (pattern.type) {
        case 'tabby':
          for (let i = -1; i <= 1; i += 1) {
            ctx.beginPath();
            ctx.moveTo(i * radius * 0.28, -radius * 0.35);
            ctx.lineTo(i * radius * 0.18 + radius * 0.05, -radius * 0.05);
            ctx.lineTo(i * radius * 0.18 - radius * 0.05, -radius * 0.05);
            ctx.closePath();
            ctx.fill();
          }
          break;
        case 'mask':
          ctx.beginPath();
          ctx.ellipse(0, -radius * 0.05, radius * 0.95, radius * 0.75, 0, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'patch':
          ctx.beginPath();
          ctx.ellipse(-radius * 0.35, -radius * 0.1, radius * 0.55, radius * 0.45, Math.PI / 10, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'tuxedo':
          ctx.beginPath();
          ctx.ellipse(0, radius * 0.35, radius * 0.7, radius * 0.6, 0, 0, Math.PI * 2);
          ctx.fill();
          break;
        case 'star':
          ctx.beginPath();
          for (let i = 0; i < 10; i += 1) {
            const angle = (Math.PI / 5) * i - Math.PI / 2;
            const r = i % 2 === 0 ? radius * 0.32 : radius * 0.15;
            const px = Math.cos(angle) * r;
            const py = Math.sin(angle) * r - radius * 0.35;
            if (i === 0) {
              ctx.moveTo(px, py);
            } else {
              ctx.lineTo(px, py);
            }
          }
          ctx.closePath();
          ctx.fill();
          break;
        default:
          break;
      }
      ctx.restore();
    }

    // Ears
    ctx.fillStyle = earOuter;
    ctx.beginPath();
    ctx.moveTo(-radius * 0.4, -radius * 0.6);
    ctx.lineTo(-radius * 0.05, -radius * 1.1);
    ctx.lineTo(radius * 0.3, -radius * 0.6);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(radius * 0.1, -radius * 0.6);
    ctx.lineTo(radius * 0.45, -radius * 1.05);
    ctx.lineTo(radius * 0.7, -radius * 0.45);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = earInner;
    ctx.beginPath();
    ctx.moveTo(-radius * 0.32, -radius * 0.55);
    ctx.lineTo(-radius * 0.08, -radius * 0.98);
    ctx.lineTo(radius * 0.18, -radius * 0.58);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(radius * 0.18, -radius * 0.55);
    ctx.lineTo(radius * 0.4, -radius * 0.95);
    ctx.lineTo(radius * 0.6, -radius * 0.48);
    ctx.closePath();
    ctx.fill();

    // Eyes
    const eyeOffsetX = radius * 0.45;
    const eyeOffsetY = -radius * 0.1;
    const eyeRadius = radius * 0.25;
    const baseEyeHeight = eyeRadius * (0.75 - droop * 0.35);
    const verticalRadius = baseEyeHeight * eyeOpenFactor;
    const isEyeOpen = verticalRadius > radius * 0.02;

    if (isEyeOpen) {
      ctx.fillStyle = eye;
      ctx.beginPath();
      ctx.ellipse(-eyeOffsetX, eyeOffsetY, eyeRadius, verticalRadius, 0, 0, Math.PI * 2);
      ctx.ellipse(eyeOffsetX, eyeOffsetY, eyeRadius, verticalRadius, 0, 0, Math.PI * 2);
      ctx.fill();

      if (eyeOpenFactor > 0.3) {
        ctx.fillStyle = highlight;
        ctx.beginPath();
        ctx.arc(
          -eyeOffsetX - eyeRadius * 0.1,
          eyeOffsetY - eyeRadius * 0.1,
          eyeRadius * 0.35,
          0,
          Math.PI * 2,
        );
        ctx.arc(
          eyeOffsetX - eyeRadius * 0.1,
          eyeOffsetY - eyeRadius * 0.1,
          eyeRadius * 0.35,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }

      const eyelidHeight = eyeRadius * droop * 0.9 * Math.max(0.3, eyeOpenFactor);
      if (eyelidHeight > 0.5) {
        ctx.fillStyle = body;
        ctx.fillRect(
          -eyeOffsetX - eyeRadius,
          eyeOffsetY - eyeRadius,
          eyeRadius * 2,
          eyelidHeight,
        );
        ctx.fillRect(
          eyeOffsetX - eyeRadius,
          eyeOffsetY - eyeRadius,
          eyeRadius * 2,
          eyelidHeight,
        );
      }
    } else {
      ctx.save();
      ctx.strokeStyle = eye;
      ctx.lineWidth = Math.max(2, radius * 0.12);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-eyeOffsetX - eyeRadius * 0.55, eyeOffsetY);
      ctx.lineTo(-eyeOffsetX + eyeRadius * 0.55, eyeOffsetY);
      ctx.moveTo(eyeOffsetX - eyeRadius * 0.55, eyeOffsetY);
      ctx.lineTo(eyeOffsetX + eyeRadius * 0.55, eyeOffsetY);
      ctx.stroke();
      ctx.restore();
    }

    if (cheek) {
      ctx.fillStyle = cheek;
      ctx.globalAlpha = 0.7;
      ctx.beginPath();
      ctx.ellipse(-radius * 0.45, radius * 0.28, radius * 0.3, radius * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(radius * 0.45, radius * 0.28, radius * 0.3, radius * 0.2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Nose
    ctx.fillStyle = nose;
    ctx.beginPath();
    ctx.moveTo(0, radius * 0.05);
    ctx.lineTo(-radius * 0.12, radius * 0.2);
    ctx.lineTo(radius * 0.12, radius * 0.2);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = mouth;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-radius * 0.25, radius * 0.25);
    ctx.lineTo(radius * 0.25, radius * 0.25);
    ctx.stroke();

    ctx.restore();
  };

  const drawForeground = (ctx, state) => {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.fillRect(0, ctx.canvas.height - 24, ctx.canvas.width, 24);
  };

  const handlePrimaryAction = () => {
    const state = stateRef.current;
    if (!state) return;
    ensureAudioContext();
    if (phase === 'start') {
      if (!hasSelectedCat) {
        setPhase('selecting');
        return;
      }
      startPlaying();
      applyJump();
    } else if (phase === 'ready') {
      startPlaying();
      applyJump();
    } else if (phase === 'playing') {
      applyJump();
    }
  };

  useEffect(() => {
    resizeCanvas();
    const handleResize = () => {
      resizeCanvas();
    };
    window.addEventListener('resize', handleResize);

    const handleKeyDown = (event) => {
      if (phase === 'shop') {
        if (event.key === 'ArrowRight') {
          event.preventDefault();
          const next = (shopFocusRef.current + 1) % SHOP_ITEMS.length;
          setFocusedShopIndex(next);
          return;
        }
        if (event.key === 'ArrowLeft') {
          event.preventDefault();
          const next = (shopFocusRef.current - 1 + SHOP_ITEMS.length) % SHOP_ITEMS.length;
          setFocusedShopIndex(next);
          return;
        }
        if (event.key === 'Enter' || event.code === 'Space') {
          event.preventDefault();
          handlePurchase(SHOP_ITEMS[shopFocusRef.current]);
          return;
        }
      } else if (phase === 'selecting') {
        const columns = 3;
        const index = catFocusRef.current;
        let nextIndex = index;
        if (event.key === 'ArrowRight') {
          nextIndex = Math.min(index + 1, CAT_VARIATIONS.length - 1);
        } else if (event.key === 'ArrowLeft') {
          nextIndex = Math.max(index - 1, 0);
        } else if (event.key === 'ArrowDown') {
          nextIndex = Math.min(index + columns, CAT_VARIATIONS.length - 1);
        } else if (event.key === 'ArrowUp') {
          nextIndex = Math.max(index - columns, 0);
        }
        if (nextIndex !== index) {
          event.preventDefault();
          const nextCat = CAT_VARIATIONS[nextIndex];
          if (nextCat) {
            handleSelectCat(nextCat);
          }
          return;
        }
      }

      if (event.code === 'Space') {
        event.preventDefault();
        if (phase === 'gameover') {
          if (!isSpaceHeldRef.current) {
            isSpaceHeldRef.current = true;
            spaceHoldStartRef.current = performance.now();
            spaceHoldTimeoutRef.current = window.setTimeout(() => {
              spaceHoldTimeoutRef.current = null;
              spaceHoldStartRef.current = null;
              isSpaceHeldRef.current = false;
              const state = stateRef.current;
              if (state?.phase === 'gameover') {
                resetGameState({ forcePhase: 'ready' });
              }
            }, 2000);
          }
        } else {
          handlePrimaryAction();
        }
      } else if (event.code === 'KeyK') {
        event.preventDefault();
        toggleKittenMode();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    const handleKeyUp = (event) => {
      if (event.code === 'Space') {
        if (isSpaceHeldRef.current) {
          isSpaceHeldRef.current = false;
          spaceHoldStartRef.current = null;
          if (spaceHoldTimeoutRef.current) {
            clearTimeout(spaceHoldTimeoutRef.current);
            spaceHoldTimeoutRef.current = null;
          }
        }
      }
    };
    window.addEventListener('keyup', handleKeyUp);

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('pointerdown', handlePrimaryAction);
    }

    animationRef.current = requestAnimationFrame(updateGame);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (canvas) {
        canvas.removeEventListener('pointerdown', handlePrimaryAction);
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (spaceHoldTimeoutRef.current) {
        clearTimeout(spaceHoldTimeoutRef.current);
        spaceHoldTimeoutRef.current = null;
      }
      spaceHoldStartRef.current = null;
      isSpaceHeldRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    if (!animationRef.current) {
      animationRef.current = requestAnimationFrame(updateGame);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const drowsinessPercent = Math.round(drowsiness);

  return (
    <div className="catnap-app" ref={containerRef}>
      <div className="catnap-canvas-wrapper">
        <canvas ref={canvasRef} className="catnap-canvas" />
        <div className="catnap-hud-overlay">
          <div className="catnap-hud">
            <div className="catnap-hud-panel">
              <div className="hud-metrics" aria-live="polite">
                <div className="hud-metric primary">
                  <span className="hud-metric-label">Score</span>
                  <span className="hud-metric-value">{stats.score}</span>
                </div>
                <div className="hud-metric secondary">
                  <span className="hud-metric-label">Best</span>
                  <span className="hud-metric-value">{stats.best}</span>
                </div>
                <div className="hud-metric-group" role="group" aria-label="Bonus stats">
                  <div className="hud-metric treats">
                    <span className="hud-metric-label">Treats</span>
                    <span className="hud-metric-value">{treats}</span>
                  </div>
                  <div className="hud-metric perfects">
                    <span className="hud-metric-label">Perfect Leaps</span>
                    <span className="hud-metric-value">{stats.perfects}</span>
                  </div>
                </div>
              </div>

              <div className="hud-meter">
                <div className="hud-meter-header">
                  <div className="hud-meter-title" id={drowsinessLabelId}>
                    <span className="hud-sleepy-icon" aria-hidden="true">😴</span>
                    <span className="hud-meter-label">Drowsiness</span>
                  </div>
                  <span className="hud-meter-value" id={drowsinessValueId} aria-live="polite">
                    {drowsinessPercent}%
                  </span>
                </div>
                <div className={`mode-indicator ${kittenMode ? 'active' : ''}`} aria-live="polite">
                  {kittenMode ? 'Kitten Mode · Cozy pacing' : 'Cat Mode · Classic challenge'}
                </div>
                <div
                  className="meter-track"
                  role="progressbar"
                  aria-labelledby={drowsinessLabelId}
                  aria-describedby={drowsinessValueId}
                  aria-valuenow={drowsinessPercent}
                  aria-valuemin="0"
                  aria-valuemax="100"
                >
                  <div className="meter-fill" style={{ width: `${clamp(drowsiness, 0, 100)}%` }} />
                </div>
                {effects.length > 0 && (
                  <ul className="active-effects">
                    {effects.map((effect) => (
                      <li key={effect}>{effect}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {startBoostIndicators.length > 0 && (
              <div className="start-boost-banner" aria-live="polite">
                <span className="boost-label">Shop Boosts Active</span>
                <ul>
                  {startBoostIndicators.map((boost) => (
                    <li key={boost}>{boost}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
        {phase !== 'playing' && (
          <div className={`catnap-overlay ${phase}`}>
            <div
              className={`overlay-card ${phase === 'selecting' ? 'selecting' : ''} ${phase === 'shop' ? 'shop' : ''} ${phase === 'start' ? 'start' : ''} ${phase === 'gameover' ? 'gameover' : ''}`}
            >
              {phase === 'start' && (
                <>
                  <h2>CatNap Leap</h2>
                  <p>Spend treats on boosts, pick your dreamer, then leap for the high score.</p>
                  <div className="start-overview">
                    <div className="start-preview">
                      <CatSpritePreview appearance={selectedAppearance} />
                      <div className="start-preview-copy">
                        <span className="cat-name">{selectedAppearance.name}</span>
                        <span className="start-stats">Best: {stats.best} · Treats: {treats}</span>
                        <span className="start-tip">Use arrow keys or tap buttons to explore.</span>
                      </div>
                    </div>
                    <div className="queued-boosts">
                      <span className="queued-title">Queued Boosts</span>
                      {queuedBoosts.length > 0 ? (
                        <ul>
                          {queuedBoosts.map(({ type, count }) => (
                            <li key={type}>
                              {type === 'coffee' ? 'Morning Brew' : type === 'yarn' ? 'Yarn Boost' : 'Catnip Calm'} ×{count}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p>Catch flying birds to earn treats and stack bonuses.</p>
                      )}
                    </div>
                  </div>
                  <div className="start-actions">
                    <button
                      type="button"
                      className="overlay-button"
                      onClick={() => {
                        setPhase('ready');
                        setMessage('Tap or press space to wake Noodle the cat.');
                      }}
                    >
                      Begin Run
                    </button>
                    <button type="button" className="overlay-button secondary" onClick={() => setPhase('selecting')}>
                      Customize Cat
                    </button>
                    <button
                      type="button"
                      className="overlay-button secondary"
                      onClick={() => {
                        setPhase('shop');
                        setShopFeedback('');
                        setFocusedShopIndex(0);
                        shopFocusRef.current = 0;
                      }}
                    >
                      Visit Shop
                    </button>
                  </div>
                </>
              )}
              {phase === 'selecting' && (
                <>
                  <h2>Choose Your Dreamer</h2>
                  <p>Tap a sprite or use arrow keys to highlight your leaping companion.</p>
                  <div className="cat-selection-grid">
                    {CAT_VARIATIONS.map((variation) => (
                      <button
                        type="button"
                        key={variation.id}
                        className={`cat-choice ${selectedCatId === variation.id ? 'is-active' : ''}`}
                        onClick={() => handleSelectCat(variation)}
                        aria-label={`Select ${variation.name}`}
                      >
                        <CatSpritePreview appearance={variation} />
                        <span className="cat-choice-name">{variation.name}</span>
                      </button>
                    ))}
                  </div>
                  <div className="overlay-actions">
                    <button
                      type="button"
                      className="overlay-button secondary"
                      onClick={() => {
                        setPhase('start');
                        setMessage('Tap or press space to wake Noodle the cat.');
                      }}
                    >
                      Back to Lobby
                    </button>
                  </div>
                </>
              )}
              {phase === 'shop' && (
                <>
                  <h2>Dream Treat Shop</h2>
                  <p>Spend treats on starting boosts. Arrow keys or taps select an item.</p>
                  <div className="shop-inventory">
                    {SHOP_ITEMS.map((item, index) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`shop-item ${focusedShopIndex === index ? 'is-focused' : ''}`}
                        onClick={() => handlePurchase(item)}
                        aria-label={`${item.name} costs ${item.cost} treats`}
                      >
                        <div className="shop-item-header">
                          <span className="shop-name">{item.name}</span>
                          <span className="shop-cost">{item.cost} treats</span>
                        </div>
                        <p>{item.description}</p>
                        <span className="queued-count">Queued: {pendingLoadout[item.id] || 0}</span>
                      </button>
                    ))}
                  </div>
                  <div className="shop-footer">
                    <span className="shop-treats">Treats: {treats}</span>
                    {shopFeedback && <span className="shop-feedback">{shopFeedback}</span>}
                  </div>
                  <div className="overlay-actions">
                    <button type="button" className="overlay-button secondary" onClick={() => setPhase('start')}>
                      Back to Lobby
                    </button>
                  </div>
                </>
              )}
              {phase === 'ready' && (
                <>
                  <h2>Ready to Leap</h2>
                  <p>{message}</p>
                  <ul className="overlay-list">
                    <li>Space, click, or tap to leap.</li>
                    <li>Thread pillows, avoid the ground and ceiling.</li>
                    <li>Collect coffee to reset drowsiness.</li>
                    <li>Catch flying birds for treats and shop boosts.</li>
                    <li>Press <kbd>K</kbd> anytime for Kitten Mode.</li>
                  </ul>
                  <div className="overlay-actions">
                    <button type="button" className="overlay-button" onClick={() => startPlaying()}>
                      Begin Dream
                    </button>
                    <button
                      type="button"
                      className="overlay-button secondary"
                      onClick={() => {
                        setPhase('start');
                        setMessage('Tap or press space to wake Noodle the cat.');
                      }}
                    >
                      Back to Lobby
                    </button>
                    <button type="button" className="overlay-button secondary" onClick={() => setPhase('selecting')}>
                      Choose Another Cat
                    </button>
                  </div>
                </>
              )}
              {phase === 'gameover' && (
                <>
                  <h2>Dream Over</h2>
                  <p>{message}</p>
                  <div className="gameover-summary">
                    <div className="gameover-stats">
                      <div className="gameover-stat-row">
                        <span className="gameover-stat-label">Run Score</span>
                        <span className="gameover-stat-value">{stats.score}</span>
                      </div>
                      <div className="gameover-stat-row">
                        <span className="gameover-stat-label">High Score</span>
                        <span className="gameover-stat-value">{stats.best}</span>
                      </div>
                    </div>
                    <div className="gameover-treat-summary">
                      <div className="gameover-treat-header">
                        <span className="gameover-stat-label">Treats Collected</span>
                        <span className="gameover-stat-value">{treats}</span>
                      </div>
                      {queuedBoosts.length > 0 ? (
                        <ul className="gameover-treat-list">
                          {queuedBoosts.map(({ type, count }) => (
                            <li key={type}>
                              {SHOP_ITEM_LABELS[type] || type} ×{count}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="gameover-treat-note">No boosts queued yet. Visit the shop to spend treats.</p>
                      )}
                    </div>
                  </div>
                  <div className="overlay-actions gameover-actions">
                    <button
                      type="button"
                      className="overlay-button"
                      onClick={() => resetGameState({ forcePhase: 'ready' })}
                    >
                      Play Again
                    </button>
                    <button type="button" className="overlay-button secondary" onClick={() => setPhase('selecting')}>
                      Customize
                    </button>
                    <button
                      type="button"
                      className="overlay-button secondary"
                      onClick={() => {
                        setPhase('shop');
                        setShopFeedback('');
                        setFocusedShopIndex(0);
                        shopFocusRef.current = 0;
                      }}
                    >
                      Shop
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="catnap-footer">
        <div className="controls">
          <span>Controls:</span> <kbd>Space</kbd> / Tap / Click <span className="dot">·</span>{' '}
          <span>Kitten Mode: <kbd>K</kbd></span>
        </div>
        <div className="tips">
          Perfect leaps perk Noodle up and catching birds earns treats for lobby boosts.
        </div>
      </div>
    </div>
  );
};

export default CatNapLeapApp;
