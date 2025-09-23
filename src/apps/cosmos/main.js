import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { loadBodyData, createBodyMeshes, createSunLight, updateBodyMeshes } from './bodies.js';
import { SolarSystemSimulation, SCALE } from './simulation.js';
import { setupControlPanel } from './controls.js';

const viewport = document.querySelector('.cosmos-viewport');
const statusEl = document.querySelector('.cosmos-loader');
const legendEl = document.querySelector('.cosmos-legend');
const legendToggle = legendEl?.querySelector('.cosmos-legend__toggle');
const legendPanel = legendEl?.querySelector('.cosmos-legend__panel');

const LEGEND_STORAGE_KEY = 'cosmos.legend.collapsed';

let renderer;
let camera;
let controls;
let sunLight;
let simulation;
let visuals;
let showTrails = true;
let timeSpeed = 4000;
let gravityMultiplier = 1;

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
    simulation = new SolarSystemSimulation(bodies, { historyLimit: 720 });
    const { group, visuals: createdVisuals } = createBodyMeshes(simulation.bodies, { scale: SCALE });
    visuals = createdVisuals;

    sunLight = createSunLight();
    scene.add(group);
    scene.add(sunLight);

    setupControlPanel(simulation.bodies, {
      onTimeSpeedChange: (value) => { timeSpeed = value; },
      onGravityChange: (value) => { gravityMultiplier = value; },
      onTrailsToggle: (value) => { showTrails = value; },
      onTeleport: teleportCameraTo,
      onReset: resetCamera,
    });

    clearStatus();

    const clock = new THREE.Clock();

    function animate() {
      requestAnimationFrame(animate);
      const deltaSeconds = clock.getDelta();
      simulation.step(deltaSeconds, { timeScale: timeSpeed, gravityMultiplier });
      updateBodyMeshes(visuals, simulation.bodies, { scale: SCALE, showTrails });
      const sunVisual = visuals.find((item) => item.name === 'Sun');
      if (sunVisual && sunLight) {
        sunLight.position.copy(sunVisual.mesh.position);
      }
      controls.update();
      renderer.render(scene, camera);
    }

    animate();
  } catch (error) {
    console.error(error);
    setStatus('Failed to load solar system data.', true);
  }
}

setupLegend();
init();
