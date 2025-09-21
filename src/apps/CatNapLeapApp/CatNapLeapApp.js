import React, { useEffect, useRef, useState } from 'react';
import './CatNapLeapApp.css';

const LOCAL_STORAGE_KEY = 'catnap-leap-highscore';

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

const createInitialState = (width, height, highScore) => ({
  phase: 'ready',
  canvasWidth: width,
  canvasHeight: height,
  time: 0,
  idleTime: 0,
  cat: {
    x: width * 0.28,
    y: height * 0.5,
    radius: Math.max(14, width * 0.035),
    vy: 0,
  },
  pillows: [],
  powerups: [],
  pillowTimer: 0,
  pillowInterval: 1500,
  powerupTimer: 0,
  nextPowerupAt: 8500,
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
});

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

  const [phase, setPhase] = useState('ready');
  const [stats, setStats] = useState({ score: 0, perfects: 0, best: 0 });
  const [drowsiness, setDrowsiness] = useState(0);
  const [message, setMessage] = useState('Tap or press space to wake Noodle the cat.');
  const [effects, setEffects] = useState([]);

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
      stateRef.current = createInitialState(adjustedWidth, height, storedHigh);
      statsSnapshotRef.current = {
        score: 0,
        perfects: 0,
        best: storedHigh,
      };
      setStats({ score: 0, perfects: 0, best: storedHigh });
      setDrowsiness(0);
      setPhase('ready');
      setMessage('Tap or press space to wake Noodle the cat.');
    } else {
      const state = stateRef.current;
      state.canvasWidth = adjustedWidth;
      state.canvasHeight = height;
      state.cat.x = adjustedWidth * 0.28;
      state.cat.y = height * 0.5;
      state.cat.radius = Math.max(14, adjustedWidth * 0.035);
    }
  };

  const resetGameState = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const state = stateRef.current;
    const highScore = state?.highScore || 0;
    stateRef.current = createInitialState(canvas.width, canvas.height, highScore);
    statsSnapshotRef.current = { score: 0, perfects: 0, best: highScore };
    effectsSnapshotRef.current = [];
    drowsinessRef.current = 0;
    setStats({ score: 0, perfects: 0, best: highScore });
    setEffects([]);
    setDrowsiness(0);
    setPhase('ready');
    setMessage('Tap or press space to wake Noodle the cat.');
  };

  const startPlaying = () => {
    const state = stateRef.current;
    if (!state || state.phase === 'playing') return;
    state.phase = 'playing';
    state.time = 0;
    state.stats.score = 0;
    state.stats.perfects = 0;
    state.drowsiness = 8;
    state.lastReason = '';
    state.effects.yarnUntil = 0;
    state.effects.catnipUntil = 0;
    publishStats(0, 0, state.highScore);
    publishDrowsiness(state.drowsiness);
    publishEffects([]);
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
    setMessage(`${reason} Tap or press space to try again.`);
  };

  const applyJump = () => {
    const state = stateRef.current;
    if (!state || state.phase !== 'playing') return;

    state.cat.vy = -340;
    playMeow();
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

      state.cat.vy += gravity * delta;
      state.cat.y += state.cat.vy * delta;

      const drowsinessRate = 5.5 + state.stats.score * 0.03;
      state.drowsiness = clamp(state.drowsiness + drowsinessRate * delta, 0, 100);

      state.pillowTimer += deltaMs;
      const minGap = Math.max(height * 0.22, height * 0.35 - state.stats.score * 1.5);
      const gapHeight = clamp(minGap, height * 0.22, height * 0.38);
      const pillowInterval = clamp(1500 - state.stats.score * 12, 950, 1500);
      if (state.pillowTimer >= pillowInterval) {
        state.pillowTimer = 0;
        const gapCenter = clamp(
          Math.random() * (height - gapHeight - 120) + (gapHeight / 2) + 60,
          gapHeight / 2 + 40,
          height - gapHeight / 2 - 40,
        );
        state.pillows.push({
          x: width + 40,
          width: Math.max(80, width * 0.18),
          gapCenter,
          gapHeight,
          scored: false,
        });
      }

      state.powerupTimer += deltaMs;
      if (state.powerupTimer >= state.nextPowerupAt) {
        state.powerupTimer = 0;
        state.nextPowerupAt = 7000 + Math.random() * 3000;
        const available = ['coffee', 'yarn', 'catnip'];
        const selection = available[Math.floor(Math.random() * available.length)];
        const radius = Math.max(12, width * 0.025);
        state.powerups.push({
          type: selection,
          x: width + 40,
          y: clamp(Math.random() * (height - 160) + 80, 80, height - 80),
          radius,
        });
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
      drawPillow(ctx, pillow, width, height);
    });

    state.powerups.forEach((powerup) => {
      drawPowerup(ctx, powerup);
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
    const { x, width, gapCenter, gapHeight } = pillow;
    const topHeight = gapCenter - gapHeight / 2;
    const bottomY = gapCenter + gapHeight / 2;
    const pillowColor = '#fef6fb';
    const outline = '#d2c3f1';

    ctx.fillStyle = pillowColor;
    ctx.strokeStyle = outline;
    ctx.lineWidth = 3;

    // Top pillow
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + width, 0);
    ctx.lineTo(x + width, Math.max(0, topHeight - 20));
    ctx.quadraticCurveTo(x + width * 0.5, topHeight + 20, x, Math.max(0, topHeight - 20));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Bottom pillow
    const bottomHeight = ctx.canvas.height - bottomY;
    ctx.beginPath();
    ctx.moveTo(x, ctx.canvas.height);
    ctx.lineTo(x + width, ctx.canvas.height);
    ctx.lineTo(x + width, Math.min(ctx.canvas.height, bottomY + 20));
    ctx.quadraticCurveTo(x + width * 0.5, bottomY - 20, x, Math.min(ctx.canvas.height, bottomY + 20));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.beginPath();
    ctx.ellipse(x + width * 0.5, topHeight * 0.6, width * 0.25, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + width * 0.5, bottomY + (bottomHeight * 0.4), width * 0.25, 14, 0, 0, Math.PI * 2);
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

  const drawCat = (ctx, state) => {
    const { x, y, radius, vy } = state.cat;
    const droop = clamp(state.drowsiness / 100, 0, 1);
    const tilt = clamp(vy / 400, -0.5, 0.5);

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tilt * 0.3);

    ctx.fillStyle = '#f9d6d0';
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    // Ears
    ctx.fillStyle = '#f6b5b0';
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

    // Eyes
    const eyeOffsetX = radius * 0.45;
    const eyeOffsetY = -radius * 0.1;
    const eyeRadius = radius * 0.25;

    ctx.fillStyle = '#2f2a45';
    ctx.beginPath();
    ctx.ellipse(-eyeOffsetX, eyeOffsetY, eyeRadius, eyeRadius * (0.75 - droop * 0.35), 0, 0, Math.PI * 2);
    ctx.ellipse(eyeOffsetX, eyeOffsetY, eyeRadius, eyeRadius * (0.75 - droop * 0.35), 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(-eyeOffsetX - eyeRadius * 0.1, eyeOffsetY - eyeRadius * 0.1, eyeRadius * 0.35, 0, Math.PI * 2);
    ctx.arc(eyeOffsetX - eyeRadius * 0.1, eyeOffsetY - eyeRadius * 0.1, eyeRadius * 0.35, 0, Math.PI * 2);
    ctx.fill();

    const eyelidHeight = eyeRadius * droop * 0.9;
    if (eyelidHeight > 0.5) {
      ctx.fillStyle = '#f9d6d0';
      ctx.fillRect(-eyeOffsetX - eyeRadius, eyeOffsetY - eyeRadius, eyeRadius * 2, eyelidHeight);
      ctx.fillRect(eyeOffsetX - eyeRadius, eyeOffsetY - eyeRadius, eyeRadius * 2, eyelidHeight);
    }

    // Nose
    ctx.fillStyle = '#f46f94';
    ctx.beginPath();
    ctx.moveTo(0, radius * 0.05);
    ctx.lineTo(-radius * 0.12, radius * 0.2);
    ctx.lineTo(radius * 0.12, radius * 0.2);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#f59fb7';
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
    if (phase === 'ready') {
      startPlaying();
      applyJump();
    } else if (phase === 'playing') {
      applyJump();
    } else if (phase === 'gameover') {
      resetGameState();
    }
  };

  useEffect(() => {
    resizeCanvas();
    const handleResize = () => {
      resizeCanvas();
    };
    window.addEventListener('resize', handleResize);

    const handleKeyDown = (event) => {
      if (event.code === 'Space') {
        event.preventDefault();
        handlePrimaryAction();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('pointerdown', handlePrimaryAction);
    }

    animationRef.current = requestAnimationFrame(updateGame);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('keydown', handleKeyDown);
      if (canvas) {
        canvas.removeEventListener('pointerdown', handlePrimaryAction);
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    if (!animationRef.current) {
      animationRef.current = requestAnimationFrame(updateGame);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="catnap-app" ref={containerRef}>
      <div className="catnap-hud">
        <div className="scoreboard" aria-live="polite">
          <div className="score-item">
            <span className="label">Score</span>
            <span className="value">{stats.score}</span>
          </div>
          <div className="score-item">
            <span className="label">Perfect Leaps</span>
            <span className="value">{stats.perfects}</span>
          </div>
          <div className="score-item">
            <span className="label">Best</span>
            <span className="value">{stats.best}</span>
          </div>
        </div>

        <div className="drowsiness-meter" aria-label="Drowsiness meter">
          <div className="meter-header">
            <span>Drowsiness</span>
            <span>{Math.round(drowsiness)}%</span>
          </div>
          <div className="meter-track" role="progressbar" aria-valuenow={Math.round(drowsiness)} aria-valuemin="0" aria-valuemax="100">
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

      <div className="catnap-canvas-wrapper">
        <canvas ref={canvasRef} className="catnap-canvas" />
        {phase !== 'playing' && (
          <div className={`catnap-overlay ${phase}`}>
            <div className="overlay-card">
              <h2>
                {phase === 'ready' && 'CatNap Leap'}
                {phase === 'gameover' && 'Dream Over'}
              </h2>
              <p>{message}</p>
              {phase === 'ready' && (
                <ul className="overlay-list">
                  <li>Space, click, or tap to leap.</li>
                  <li>Thread pillows, avoid the ground and ceiling.</li>
                  <li>Collect coffee to reset drowsiness.</li>
                  <li>Yarn speeds time, catnip slows it.</li>
                </ul>
              )}
              {phase === 'gameover' && (
                <button type="button" className="overlay-button" onClick={resetGameState}>
                  Restart Dream
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="catnap-footer">
        <div className="controls">
          <span>Controls:</span> <kbd>Space</kbd> / Tap / Click
        </div>
        <div className="tips">
          Perfect leaps earn bonus points when centered on pillows.
        </div>
      </div>
    </div>
  );
};

export default CatNapLeapApp;
