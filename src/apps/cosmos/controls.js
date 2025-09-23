import GUI from 'https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm';

export const TIME_SPEED_RANGE = { min: 100, max: 20000, step: 100 };
export const TRAIL_LENGTH_RANGE = { min: 120, max: 720, step: 30 };
export const DEFAULT_TRAIL_LENGTH = 720;

const DEFAULTS = {
  timeSpeed: 4000,
  gravityMultiplier: 1,
  showTrails: true,
  trailLength: DEFAULT_TRAIL_LENGTH,
};

export function setupControlPanel(bodies, handlers = {}, overrides = {}) {
  const settings = {
    ...DEFAULTS,
    ...overrides,
  };

  const gui = new GUI({ title: 'Cosmos Controls' });
  gui.domElement.classList.add('cosmos-gui');

  gui
    .add(settings, 'timeSpeed', TIME_SPEED_RANGE.min, TIME_SPEED_RANGE.max, TIME_SPEED_RANGE.step)
    .name('Time speed (×)')
    .onChange((value) => handlers.onTimeSpeedChange?.(value));

  gui
    .add(settings, 'gravityMultiplier', 0, 3, 0.05)
    .name('Gravity (×)')
    .onChange((value) => handlers.onGravityChange?.(value));

  gui
    .add(settings, 'showTrails')
    .name('Show trails')
    .onChange((value) => handlers.onTrailsToggle?.(value));

  gui
    .add(
      settings,
      'trailLength',
      TRAIL_LENGTH_RANGE.min,
      TRAIL_LENGTH_RANGE.max,
      TRAIL_LENGTH_RANGE.step,
    )
    .name('Trail length')
    .onChange((value) => handlers.onTrailLengthChange?.(value));

  const cameraFolder = gui.addFolder('Camera');
  bodies.forEach((body) => {
    const action = { [`teleport${body.name}`]: () => handlers.onTeleport?.(body.name) };
    cameraFolder.add(action, `teleport${body.name}`).name(body.name);
  });
  cameraFolder
    .add({ reset: () => handlers.onReset?.() }, 'reset')
    .name('Reset view');

  const moonParentOrder = [];
  const seenParents = new Set();
  bodies.forEach((body) => {
    if (!body.parentName) {
      return;
    }

    if (!seenParents.has(body.parentName)) {
      seenParents.add(body.parentName);
      moonParentOrder.push(body.parentName);
    }
  });

  if (moonParentOrder.length > 0) {
    const moonsFolder = gui.addFolder('Moons');
    const moonVisibilityOverrides = overrides.moons ?? {};
    const moonVisibility = {};
    const toggleLookup = new Map();

    moonParentOrder.forEach((parentName) => {
      const toggleKey = `${parentName}Moons`;
      const defaultValue = moonVisibilityOverrides[parentName] ?? true;
      moonVisibility[toggleKey] = defaultValue;
      toggleLookup.set(parentName, toggleKey);

      moonsFolder
        .add(moonVisibility, toggleKey)
        .name(`${parentName} moons`)
        .onChange((value) => handlers.onMoonsToggle?.(parentName, value));
    });

    settings.moons = moonVisibility;

    moonParentOrder.forEach((parentName) => {
      const key = toggleLookup.get(parentName);
      handlers.onMoonsToggle?.(parentName, moonVisibility[key]);
    });
  }

  handlers.onTimeSpeedChange?.(settings.timeSpeed);
  handlers.onGravityChange?.(settings.gravityMultiplier);
  handlers.onTrailsToggle?.(settings.showTrails);
  handlers.onTrailLengthChange?.(settings.trailLength);

  return { gui, settings };
}
