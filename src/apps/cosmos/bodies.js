import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.162/build/three.module.js';

const TRAIL_LIMIT = 720;
const MIN_RENDER_RADIUS = 0.35;

const gradientTextureCache = new Map();
const textureLoader = new THREE.TextureLoader();
const textureCache = new Map();

function clamp01(value) {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(Math.max(value, 0), 1);
}

function normaliseStops(stops) {
  if (!Array.isArray(stops) || stops.length === 0) {
    return [];
  }

  return stops
    .map((stop) => ({
      offset: clamp01(stop?.offset ?? 0),
      color: new THREE.Color(stop?.color ?? '#ffffff'),
    }))
    .sort((a, b) => a.offset - b.offset);
}

function sampleGradient(stops, t, targetColor) {
  if (stops.length === 0) {
    targetColor.set('#ffffff');
    return targetColor;
  }

  const value = clamp01(t);

  if (value <= stops[0].offset) {
    targetColor.copy(stops[0].color);
    return targetColor;
  }

  if (value >= stops[stops.length - 1].offset) {
    targetColor.copy(stops[stops.length - 1].color);
    return targetColor;
  }

  for (let i = 0; i < stops.length - 1; i += 1) {
    const current = stops[i];
    const next = stops[i + 1];
    if (value >= current.offset && value <= next.offset) {
      const span = Math.max(next.offset - current.offset, 1e-6);
      const localT = (value - current.offset) / span;
      targetColor.copy(current.color).lerp(next.color, clamp01(localT));
      return targetColor;
    }
  }

  targetColor.copy(stops[stops.length - 1].color);
  return targetColor;
}

function createGradientTexture(gradient) {
  if (!gradient) {
    return null;
  }

  const key = JSON.stringify(gradient);
  if (gradientTextureCache.has(key)) {
    return gradientTextureCache.get(key);
  }

  const stops = normaliseStops(gradient.stops);
  if (stops.length === 0) {
    return null;
  }

  const size = 256;
  const width = size;
  const height = size;
  const orientation = gradient.orientation ?? 'vertical';
  const data = new Uint8Array(width * height * 4);
  const color = new THREE.Color();

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let t;
      if (orientation === 'horizontal') {
        t = width === 1 ? 0 : x / (width - 1);
      } else if (orientation === 'radial') {
        const nx = width === 1 ? 0 : x / (width - 1);
        const ny = height === 1 ? 0 : y / (height - 1);
        const dx = nx - 0.5;
        const dy = ny - 0.5;
        t = Math.min(Math.sqrt(dx * dx + dy * dy) / 0.5, 1);
      } else {
        t = height === 1 ? 0 : y / (height - 1);
      }

      sampleGradient(stops, t, color);
      const index = (y * width + x) * 4;
      data[index] = Math.round(color.r * 255);
      data[index + 1] = Math.round(color.g * 255);
      data[index + 2] = Math.round(color.b * 255);
      data[index + 3] = 255;
    }
  }

  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
  texture.needsUpdate = true;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;

  if ('colorSpace' in texture) {
    texture.colorSpace = THREE.SRGBColorSpace;
  } else {
    texture.encoding = THREE.sRGBEncoding;
  }

  gradientTextureCache.set(key, texture);
  return texture;
}

function loadTexture(url) {
  if (!url) {
    return null;
  }

  if (textureCache.has(url)) {
    return textureCache.get(url);
  }

  const texture = textureLoader.load(url);

  if ('colorSpace' in texture) {
    texture.colorSpace = THREE.SRGBColorSpace;
  } else {
    texture.encoding = THREE.sRGBEncoding;
  }

  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;

  textureCache.set(url, texture);
  return texture;
}

function resolveBaseColor(colorDefinition) {
  if (typeof colorDefinition === 'string') {
    return colorDefinition;
  }

  if (!colorDefinition || typeof colorDefinition !== 'object') {
    return '#ffffff';
  }

  if (typeof colorDefinition.base === 'string') {
    return colorDefinition.base;
  }

  if (colorDefinition.gradient && Array.isArray(colorDefinition.gradient.stops)) {
    const stops = colorDefinition.gradient.stops;
    if (stops.length > 0 && typeof stops[0].color === 'string') {
      return stops[0].color;
    }
  }

  if (Array.isArray(colorDefinition.stops) && colorDefinition.stops.length > 0) {
    const first = colorDefinition.stops[0];
    if (typeof first.color === 'string') {
      return first.color;
    }
  }

  if (typeof colorDefinition.color === 'string') {
    return colorDefinition.color;
  }

  return '#ffffff';
}

function extractMaterialMap(colorDefinition) {
  if (!colorDefinition || typeof colorDefinition !== 'object') {
    return null;
  }

  if (colorDefinition.texture) {
    return loadTexture(colorDefinition.texture);
  }

  if (colorDefinition.gradient) {
    return createGradientTexture(colorDefinition.gradient);
  }

  if (Array.isArray(colorDefinition.stops)) {
    return createGradientTexture({ stops: colorDefinition.stops, orientation: colorDefinition.orientation });
  }

  return null;
}

export async function loadBodyData(url = './data/bodies.json') {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to load bodies from ${url}: ${response.status}`);
  }

  return response.json();
}

function createMaterial(color, isSun) {
  const baseColor = resolveBaseColor(color);
  const materialConfig = {
    color: new THREE.Color(baseColor),
    roughness: 0.6,
    metalness: 0.1,
  };

  const map = extractMaterialMap(color);
  if (map) {
    materialConfig.map = map;
  }

  if (color && typeof color === 'object') {
    if (typeof color.roughness === 'number') {
      materialConfig.roughness = clamp01(color.roughness);
    }

    if (typeof color.metalness === 'number') {
      materialConfig.metalness = clamp01(color.metalness);
    }
  }

  if (isSun) {
    materialConfig.emissive = new THREE.Color('#fff4d3');
    materialConfig.emissiveIntensity = 1.6;
  }

  return new THREE.MeshStandardMaterial(materialConfig);
}

function createTrail(colorDefinition) {
  const baseColor = resolveBaseColor(colorDefinition);
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(TRAIL_LIMIT * 3);
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setDrawRange(0, 0);

  const tint = new THREE.Color(baseColor).lerp(new THREE.Color('#ffffff'), 0.35);

  const material = new THREE.LineBasicMaterial({
    color: tint,
    transparent: true,
    opacity: 0.45,
  });

  const line = new THREE.Line(geometry, material);
  line.visible = false;
  line.frustumCulled = false;

  return { line, positions, geometry };
}

export function createBodyMeshes(bodies, { scale }) {
  const group = new THREE.Group();
  const visuals = bodies.map((body) => {
    const renderRadius = Math.max(body.radius * scale, MIN_RENDER_RADIUS);
    const geometry = new THREE.SphereGeometry(renderRadius, 48, 32);
    const material = createMaterial(body.color, body.name === 'Sun');
    const mesh = new THREE.Mesh(geometry, material);

    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.name = body.name;

    const { line: trail, positions, geometry: trailGeometry } = createTrail(body.color);

    group.add(mesh);
    group.add(trail);

    return {
      name: body.name,
      mesh,
      trail,
      trailPositions: positions,
      trailGeometry,
    };
  });

  return { group, visuals };
}

export function createSunLight(intensity = 3.5) {
  const light = new THREE.PointLight('#fff2a3', intensity, 0, 2);
  light.castShadow = false;
  light.position.set(0, 0, 0);
  return light;
}

export function updateBodyMeshes(visuals, simulationBodies, { scale, showTrails }) {
  const temp = new THREE.Vector3();

  visuals.forEach((visual, index) => {
    const body = simulationBodies[index];
    temp.copy(body.position).multiplyScalar(scale);
    visual.mesh.position.copy(temp);

    if (visual.mesh.name === 'Sun') {
      // keep the sun trail hidden for clarity
      visual.trail.visible = false;
      visual.trailGeometry.setDrawRange(0, 0);
    } else if (showTrails) {
      const history = body.history;
      const { trailPositions, trailGeometry, trail } = visual;

      for (let i = 0; i < history.length; i += 1) {
        const entry = history[i];
        const offset = i * 3;
        trailPositions[offset] = entry.x * scale;
        trailPositions[offset + 1] = entry.y * scale;
        trailPositions[offset + 2] = entry.z * scale;
      }

      trailGeometry.attributes.position.needsUpdate = true;
      trailGeometry.setDrawRange(0, history.length);
      trailGeometry.computeBoundingSphere();
      trail.visible = history.length > 1;
    } else {
      visual.trailGeometry.setDrawRange(0, 0);
      visual.trail.visible = false;
    }
  });
}
