const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const POWERUP_TYPES = ['coffee', 'yarn', 'catnip'];

const uniqueLanes = (lanes, minGap) => {
  const sorted = [...lanes]
    .filter((lane) => Number.isFinite(lane))
    .sort((a, b) => a - b);
  const result = [];
  sorted.forEach((lane) => {
    if (result.every((existing) => Math.abs(existing - lane) >= minGap)) {
      result.push(lane);
    }
  });
  return result;
};

const computeCandidateLanes = (state) => {
  const { canvasHeight, pillows = [] } = state;
  const lanes = [];

  if (!pillows.length) {
    lanes.push(canvasHeight * 0.5);
  } else {
    const recent = pillows.slice(-4);
    recent.forEach((pillow) => {
      const { gapCenter, gapHeight } = pillow;
      const top = gapCenter - gapHeight / 2;
      const bottom = gapCenter + gapHeight / 2;
      const band = gapHeight * 0.22;
      lanes.push(gapCenter);
      lanes.push(clamp(gapCenter + band, top + band * 0.5, bottom - band * 0.5));
      lanes.push(clamp(gapCenter - band, top + band * 0.5, bottom - band * 0.5));
    });
  }

  // add gentle fallback lanes to keep variety
  lanes.push(canvasHeight * 0.35, canvasHeight * 0.65);

  return uniqueLanes(lanes, canvasHeight * 0.08);
};

const laneIsClear = (lane, radius, state, options = {}) => {
  const { pillows = [], powerups = [], birds = [], canvasHeight, cat } = state;
  const margin = options.margin ?? 18;
  const catStartY = options.catStartY ?? (state.canvasHeight * 0.5);
  const time = options.time ?? 0;

  if (lane < radius + 60 || lane > canvasHeight - radius - 60) {
    return false;
  }

  for (let i = 0; i < pillows.length; i += 1) {
    const pillow = pillows[i];
    const gapTop = pillow.gapCenter - pillow.gapHeight / 2;
    const gapBottom = pillow.gapCenter + pillow.gapHeight / 2;
    if (lane < gapTop + radius + margin || lane > gapBottom - radius - margin) {
      return false;
    }
  }

  for (let i = 0; i < powerups.length; i += 1) {
    const other = powerups[i];
    if (Math.abs(other.y - lane) < other.radius + radius + margin) {
      return false;
    }
  }

  for (let i = 0; i < birds.length; i += 1) {
    const bird = birds[i];
    if (Math.abs(bird.y - lane) < (bird.radius || 0) + radius + margin) {
      return false;
    }
  }

  if (time < 2600) {
    const catRadius = cat?.radius ?? 0;
    if (Math.abs(lane - catStartY) < catRadius * 1.6 + radius) {
      return false;
    }
  }

  return true;
};

export const getNextPowerupType = () => {
  const index = Math.floor(Math.random() * POWERUP_TYPES.length);
  return POWERUP_TYPES[index];
};

export const createPowerupSpawn = (state, preferredType) => {
  const radius = Math.max(12, state.canvasWidth * 0.025);
  const spawnXBase = state.canvasWidth + radius * 3;
  let spawnX = spawnXBase;

  if (state.pillows?.length) {
    const last = state.pillows[state.pillows.length - 1];
    if (last) {
      spawnX = Math.max(spawnX, last.x + last.width + radius * 4);
    }
  }

  const lanes = computeCandidateLanes(state);
  const shuffled = [...lanes].sort(() => Math.random() - 0.5);
  const type = preferredType || getNextPowerupType();

  for (let i = 0; i < shuffled.length; i += 1) {
    const lane = shuffled[i];
    if (laneIsClear(lane, radius, state, { catStartY: state.canvasHeight * 0.5, time: state.time })) {
      return {
        type,
        x: spawnX,
        y: lane,
        radius,
      };
    }
  }

  return null;
};

export const createBirdSpawn = (state) => {
  const radius = Math.max(14, state.canvasWidth * 0.03);
  const lanes = computeCandidateLanes(state);
  const shuffled = [...lanes].sort(() => Math.random() - 0.5);

  for (let i = 0; i < shuffled.length; i += 1) {
    const lane = shuffled[i];
    if (!laneIsClear(lane, radius, state, { margin: 22, catStartY: state.canvasHeight * 0.5, time: state.time })) {
      // lane isn't safe for a bird; try next option
      // eslint-disable-next-line no-continue
      continue;
    }

    const direction = Math.random() > 0.5 ? 1 : -1;
    const x = direction === 1 ? -radius * 2 - 40 : state.canvasWidth + radius * 2 + 40;
    const speed = 110 + Math.random() * 60;
    return {
      x,
      y: lane,
      radius,
      direction,
      speed,
      flapOffset: Math.random() * Math.PI * 2,
    };
  }

  return null;
};

export const summarizeLoadout = (loadout) =>
  Object.entries(loadout)
    .filter(([, count]) => count > 0)
    .map(([type, count]) => ({ type, count }));

