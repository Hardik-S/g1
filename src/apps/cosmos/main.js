import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { loadBodyData, createBodyMeshes, createSunLight, updateBodyMeshes } from './bodies.js';
import { SolarSystemSimulation, SCALE } from './simulation.js';
import {
  setupControlPanel,
  TIME_SPEED_RANGE,
  DEFAULT_TRAIL_LENGTH,
  DEFAULT_TIME_SPEED,
} from './controls.js';

const viewport = document.querySelector('.cosmos-viewport');
const statusEl = document.querySelector('.cosmos-loader');
const legendEl = document.querySelector('.cosmos-legend');
const legendToggle = legendEl?.querySelector('.cosmos-legend__toggle');
const legendPanel = legendEl?.querySelector('.cosmos-legend__panel');
const timerEl = viewport?.querySelector('.cosmos-timer');
const timerValueEl = timerEl?.querySelector('.cosmos-timer__value');

const LEGEND_STORAGE_KEY = 'cosmos.legend.collapsed';

const SECONDS_PER_YEAR = 60 * 60 * 24 * 365.25;
const SECONDS_PER_MEGAYEAR = SECONDS_PER_YEAR * 1e6;
const slowSpeedColor = new THREE.Color('#0f4f33');
const fastSpeedColor = new THREE.Color('#6dffb7');
const timerColor = new THREE.Color();
const NARROW_NBSP = String.fromCharCode(0x202f);
const TIMER_UNIT = `${NARROW_NBSP}Myr`;

let renderer;
let camera;
let controls;
let sunLight;
let simulation;
let visuals;
let moonGroups = new Map();
let showTrails = true;
let timeSpeed = DEFAULT_TIME_SPEED;
let gravityMultiplier = 1;
let trailLength = DEFAULT_TRAIL_LENGTH;
let accumulatedSimSeconds = 0;
let lastTimerColorHex = null;
let originalBodyDefinitions = null;

const keyboardState = {
  orbitLeft: false,
  orbitRight: false,
  orbitUp: false,
  orbitDown: false,
  panLeft: false,
  panRight: false,
  panUp: false,
  panDown: false,
  dollyIn: false,
  dollyOut: false,
};

const keyActionMap = {
  ArrowLeft: 'orbitLeft',
  ArrowRight: 'orbitRight',
  ArrowUp: 'orbitUp',
  ArrowDown: 'orbitDown',
  KeyA: 'panLeft',
  KeyD: 'panRight',
  KeyW: 'panUp',
  KeyS: 'panDown',
  KeyQ: 'dollyIn',
  KeyE: 'dollyOut',
  Equal: 'dollyIn',
  NumpadAdd: 'dollyIn',
  Minus: 'dollyOut',
  NumpadSubtract: 'dollyOut',
};

function clearKeyboardState() {
  Object.keys(keyboardState).forEach((key) => {
    keyboardState[key] = false;
  });
}

function setKeyState(event, isPressed) {
  const action = keyActionMap[event.code];
  if (!action) {
    return;
  }
  if (keyboardState[action] === isPressed) {
    event.preventDefault();
    return;
  }
  keyboardState[action] = isPressed;
  event.preventDefault();
}

function clamp01(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(Math.max(value, 0), 1);
}

function cloneBodyDefinitions(definitions) {
  if (!definitions) {
    return null;
  }

  return JSON.parse(JSON.stringify(definitions));
}

function updateTimerDisplay() {
  if (!timerValueEl) {
    return;
  }
  const megaYears = accumulatedSimSeconds / SECONDS_PER_MEGAYEAR;
  timerValueEl.textContent = `${megaYears.toFixed(4)}${TIMER_UNIT}`;
}

function updateTimerColor(speed) {
  if (!timerEl) {
    return;
  }

  const { min, max } = TIME_SPEED_RANGE;
  const span = max - min;
  const normalized = span <= 0 ? 0 : clamp01((speed - min) / span);
  timerColor.copy(slowSpeedColor).lerp(fastSpeedColor, normalized);
  const hex = `#${timerColor.getHexString()}`;

  if (hex !== lastTimerColorHex) {
    timerEl.style.setProperty('--timer-color', hex);
    lastTimerColorHex = hex;
  }
}

function setupKeyboardShortcuts() {
  window.addEventListener('keydown', (event) => {
    if (!event.repeat) {
      setKeyState(event, true);
    } else if (keyActionMap[event.code]) {
      event.preventDefault();
    }
  });
  window.addEventListener('keyup', (event) => {
    setKeyState(event, false);
  });
  window.addEventListener('blur', clearKeyboardState);
}

function applyKeyboardNavigation(deltaSeconds) {
  if (!controls) {
    return;
  }

  const orbitSpeed = 1.6 * deltaSeconds;
  const orbitVerticalSpeed = 1.2 * deltaSeconds;
  if (keyboardState.orbitLeft) {
    controls.rotateLeft(orbitSpeed);
  }
  if (keyboardState.orbitRight) {
    controls.rotateLeft(-orbitSpeed);
  }
  if (keyboardState.orbitUp) {
    controls.rotateUp(orbitVerticalSpeed);
  }
  if (keyboardState.orbitDown) {
    controls.rotateUp(-orbitVerticalSpeed);
  }

  const panDistance = 420 * deltaSeconds;
  let panX = 0;
  let panY = 0;
  if (keyboardState.panLeft) {
    panX -= panDistance;
  }
  if (keyboardState.panRight) {
    panX += panDistance;
  }
  if (keyboardState.panUp) {
    panY -= panDistance;
  }
  if (keyboardState.panDown) {
    panY += panDistance;
  }
  if (panX !== 0 || panY !== 0) {
    controls.pan(panX, panY);
  }

  const dollyFactor = Math.pow(0.95, deltaSeconds * 10);
  if (keyboardState.dollyIn) {
    controls.dollyIn(dollyFactor);
  }
  if (keyboardState.dollyOut) {
    controls.dollyOut(dollyFactor);
  }
}

const initialCameraPosition = new THREE.Vector3(0, 1200, 3200);
const initialTarget = new THREE.Vector3();

function setStatus(message, isError = false) {
  if (!statusEl) {
    return;
  }
  statusEl.textContent = message;
  statusEl.classList.toggle('cosmos-loader--error', isError);
}

function clearStatus() {
  if (statusEl) {
    statusEl.remove();
  }
}

function createRenderer() {
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  if ('outputColorSpace' in renderer) {
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  } else {
    renderer.outputEncoding = THREE.sRGBEncoding;
  }
  renderer.shadowMap.enabled = false;
  viewport.appendChild(renderer.domElement);
}

function createCamera() {
  const { clientWidth, clientHeight } = viewport;
  camera = new THREE.PerspectiveCamera(50, clientWidth / clientHeight, 0.1, 12000);
  camera.position.copy(initialCameraPosition);
}

function createControls() {
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.maxDistance = 7000;
  controls.minDistance = 0.5;
  controls.target.copy(initialTarget);
  controls.update();
}

function addStars(scene) {
  const starCount = 1500;
  const positions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i += 1) {
    const index = i * 3;
    positions[index] = (Math.random() - 0.5) * 10000;
    positions[index + 1] = (Math.random() - 0.5) * 10000;
    positions[index + 2] = (Math.random() - 0.5) * 10000;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: '#ffffff',
    size: 1.2,
    sizeAttenuation: true,
    transparent: true,
    opacity: 0.6,
  });
  const stars = new THREE.Points(geometry, material);
  scene.add(stars);
}

function resizeRenderer() {
  if (!renderer || !camera) return;
  const { clientWidth, clientHeight } = viewport;
  renderer.setSize(clientWidth, clientHeight);
  camera.aspect = clientWidth / clientHeight;
  camera.updateProjectionMatrix();
}

function resetCamera() {
  camera.position.copy(initialCameraPosition);
  controls.target.copy(initialTarget);
  controls.update();
}

function resetSimulation() {
  if (!originalBodyDefinitions) {
    return;
  }

  const clonedDefinitions = cloneBodyDefinitions(originalBodyDefinitions);
  if (!clonedDefinitions) {
    return;
  }

  simulation = new SolarSystemSimulation(clonedDefinitions, { historyLimit: trailLength });
  simulation.setHistoryLimit(trailLength);
  accumulatedSimSeconds = 0;

  if (Array.isArray(visuals)) {
    visuals.forEach((visual) => {
      visual.trailGeometry.setDrawRange(0, 0);
      visual.trail.visible = false;
      if (visual.trailGeometry.attributes?.position) {
        visual.trailGeometry.attributes.position.needsUpdate = true;
      }
    });
  }

  if (Array.isArray(visuals) && simulation) {
    updateBodyMeshes(visuals, simulation.bodies, { scale: SCALE, showTrails });
    const sunVisual = visuals.find((item) => item.name === 'Sun');
    if (sunVisual && sunLight) {
      sunLight.position.copy(sunVisual.mesh.position);
    }
  }
}

function teleportCameraTo(name) {
  const targetBody = simulation?.getBodyByName(name);
  if (!targetBody) {
    return;
  }

  const targetPosition = targetBody.position.clone().multiplyScalar(SCALE);
  const offsetDirection = targetPosition.lengthSq() > 0
    ? targetPosition.clone().normalize()
    : new THREE.Vector3(0, 0.4, 1).normalize();
  const focusOffset = Math.max(targetBody.radius * SCALE * 18, 6);
  const elevated = targetPosition.clone().addScaledVector(offsetDirection, focusOffset);
  elevated.y += focusOffset * 0.3;

  camera.position.copy(elevated);
  controls.target.copy(targetPosition);
  controls.update();
}

function setupLegend() {
  if (!legendEl || !legendToggle || !legendPanel) {
    return;
  }

  const readStoredPreference = () => {
    try {
      return localStorage.getItem(LEGEND_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  };

  const setLegendCollapsed = (collapsed, { persist = true } = {}) => {
    legendEl.classList.toggle('cosmos-legend--collapsed', collapsed);
    legendToggle.setAttribute('aria-expanded', String(!collapsed));
    legendPanel.setAttribute('aria-hidden', String(collapsed));

    if (persist) {
      try {
        localStorage.setItem(LEGEND_STORAGE_KEY, collapsed ? '1' : '0');
      } catch {
        // Ignore persistence errors (e.g., storage disabled).
      }
    }
  };

  const initialCollapsed = readStoredPreference();
  setLegendCollapsed(initialCollapsed, { persist: false });
  legendEl.classList.add('cosmos-legend--ready');

  legendToggle.addEventListener('click', () => {
    const nextState = !legendEl.classList.contains('cosmos-legend--collapsed');
    setLegendCollapsed(nextState);
  });
}

async function init() {
  if (!viewport) {
    return;
  }

  createRenderer();
  createCamera();
  createControls();

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#020614');
  addStars(scene);

  scene.add(new THREE.AmbientLight('#0e111f', 0.18));

  resizeRenderer();

  window.addEventListener('resize', resizeRenderer);
  setupKeyboardShortcuts();
  window.addEventListener('keydown', (event) => {
    if (event.defaultPrevented) {
      return;
    }

    const target = event.target;
    if (target instanceof HTMLElement) {
      if (target.isContentEditable) {
        return;
      }

      const focusable = target.closest('input, textarea, select, button');
      if (focusable) {
        return;
      }
    }

    if (event.key === 'r' || event.key === 'R') {
      resetCamera();
    }
  });

  try {
    const bodies = await loadBodyData('./data/bodies.json');
    originalBodyDefinitions = cloneBodyDefinitions(bodies);
    simulation = new SolarSystemSimulation(bodies, { historyLimit: trailLength });
    const { group, visuals: createdVisuals, moonGroups: createdMoonGroups } = createBodyMeshes(
      simulation.bodies,
      { scale: SCALE },
    );
    visuals = createdVisuals;
    moonGroups = createdMoonGroups;

    sunLight = createSunLight();
    scene.add(group);
    scene.add(sunLight);

    setupControlPanel(simulation.bodies, {
      onTimeSpeedChange: (value) => {
        if (!Number.isFinite(value)) {
          return;
        }
        const clamped = Math.min(Math.max(value, TIME_SPEED_RANGE.min), TIME_SPEED_RANGE.max);
        timeSpeed = clamped;
        updateTimerColor(timeSpeed);
      },
      onGravityChange: (value) => { gravityMultiplier = value; },
      onTrailsToggle: (value) => { showTrails = value; },
      onTrailLengthChange: (value) => {
        const numericValue = Number(value);
        if (!Number.isFinite(numericValue)) {
          return;
        }
        trailLength = Math.max(0, Math.round(numericValue));
        if (simulation) {
          simulation.setHistoryLimit(trailLength);
        }
      },
      onMoonsToggle: (planetName, visible) => {
        const groupRef = moonGroups.get(planetName);
        if (groupRef) {
          groupRef.visible = visible;
        }
      },
      onTeleport: teleportCameraTo,
      onReset: resetCamera,
      onSimulationReset: () => {
        resetSimulation();
        updateTimerDisplay();
      },
    });

    clearStatus();

    const clock = new THREE.Clock();

    function animate() {
      requestAnimationFrame(animate);
      const deltaSeconds = clock.getDelta();
      const simulatedDeltaSeconds = deltaSeconds * timeSpeed;
      simulation.step(deltaSeconds, { timeScale: timeSpeed, gravityMultiplier });
      if (Number.isFinite(simulatedDeltaSeconds) && simulatedDeltaSeconds > 0) {
        accumulatedSimSeconds += simulatedDeltaSeconds;
        updateTimerDisplay();
      }
      updateBodyMeshes(visuals, simulation.bodies, { scale: SCALE, showTrails });
      const sunVisual = visuals.find((item) => item.name === 'Sun');
      if (sunVisual && sunLight) {
        sunLight.position.copy(sunVisual.mesh.position);
      }
      applyKeyboardNavigation(deltaSeconds);
      controls.update();
      renderer.render(scene, camera);
    }

    animate();
  } catch (error) {
    console.error(error);
    setStatus('Failed to load solar system data.', true);
  }
}

updateTimerDisplay();
updateTimerColor(timeSpeed);

setupLegend();
init();
