import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.162/build/three.module.js';

const TRAIL_LIMIT = 720;
const MIN_RENDER_RADIUS = 0.35;

export async function loadBodyData(url = './data/bodies.json') {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to load bodies from ${url}: ${response.status}`);
  }

  return response.json();
}

function createMaterial(color, isSun) {
  if (isSun) {
    return new THREE.MeshStandardMaterial({
      emissive: new THREE.Color('#fff4d3'),
      emissiveIntensity: 1.6,
      color: new THREE.Color(color),
    });
  }

  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness: 0.6,
    metalness: 0.1,
  });
}

function createTrail(color) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(TRAIL_LIMIT * 3);
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setDrawRange(0, 0);

  const tint = new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.35);

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

function createRingMesh(body, scale) {
  if (!body.ring) {
    return null;
  }

  const { innerRadius, outerRadius, opacity = 0.45, tilt = 0 } = body.ring;

  if (!innerRadius || !outerRadius || outerRadius <= innerRadius) {
    return null;
  }

  const ringGeometry = new THREE.RingGeometry(
    innerRadius * scale,
    outerRadius * scale,
    96,
  );

  const ringColor = new THREE.Color(body.color).lerp(new THREE.Color('#ffffff'), 0.45);

  const ringMaterial = new THREE.MeshBasicMaterial({
    color: ringColor,
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
  ringMesh.name = `${body.name} Ring`;
  ringMesh.rotation.x = THREE.MathUtils.degToRad(tilt);

  return ringMesh;
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

    const ring = createRingMesh(body, scale);

    const { line: trail, positions, geometry: trailGeometry } = createTrail(body.color);

    group.add(mesh);
    if (ring) {
      group.add(ring);
    }
    group.add(trail);

    return {
      name: body.name,
      mesh,
      ring,
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

    if (visual.ring) {
      visual.ring.position.copy(temp);
      visual.ring.visible = visual.mesh.visible;
    }

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
