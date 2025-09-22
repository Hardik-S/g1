import GUI from 'https://cdn.jsdelivr.net/npm/lil-gui@0.19/+esm';

const DEFAULTS = {
  timeSpeed: 4000,
  gravityMultiplier: 1,
  showTrails: true,
};

export function setupControlPanel(bodies, handlers = {}, overrides = {}) {
  const settings = {
    ...DEFAULTS,
    ...overrides,
  };

  const gui = new GUI({ title: 'Cosmos Controls' });
  gui.domElement.classList.add('cosmos-gui');

  gui
    .add(settings, 'timeSpeed', 100, 20000, 100)
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

  const cameraFolder = gui.addFolder('Camera');
  bodies.forEach((body) => {
    const action = { [`teleport${body.name}`]: () => handlers.onTeleport?.(body.name) };
    cameraFolder.add(action, `teleport${body.name}`).name(body.name);
  });
  cameraFolder
    .add({ reset: () => handlers.onReset?.() }, 'reset')
    .name('Reset view');

  handlers.onTimeSpeedChange?.(settings.timeSpeed);
  handlers.onGravityChange?.(settings.gravityMultiplier);
  handlers.onTrailsToggle?.(settings.showTrails);

  return { gui, settings };
}
