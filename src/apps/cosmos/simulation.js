import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.162/build/three.module.js';

export const SCALE = 1e-9;
const G = 6.6743e-11;
const MIN_DISTANCE_SQ = 1e6; // prevent singularities when bodies get too close
const DEG2RAD = Math.PI / 180;

const X_AXIS = new THREE.Vector3(1, 0, 0);
const Z_AXIS = new THREE.Vector3(0, 0, 1);

function toVector3(source, label) {
  if (source instanceof THREE.Vector3) {
    return source.clone();
  }
  if (Array.isArray(source) && source.length === 3) {
    return new THREE.Vector3().fromArray(source);
  }
  throw new Error(`Invalid ${label} vector supplied`);
}

function instantiateBody(definition, {
  parentName = null,
  parentIndex = null,
  positionOverride,
  velocityOverride,
} = {}) {
  const positionSource = positionOverride ?? definition.position;
  const velocitySource = velocityOverride ?? definition.velocity;

  if (!positionSource || !velocitySource) {
    throw new Error(`Missing initial state for ${definition.name}`);
  }

  return {
    name: definition.name,
    mass: definition.mass,
    radius: definition.radius,
    color: definition.color ?? '#ffffff',
    ring: definition.ring ? { ...definition.ring } : undefined, // ✅ keep ring support
    position: toVector3(positionSource, `${definition.name} position`),
    velocity: toVector3(velocitySource, `${definition.name} velocity`),
    acceleration: new THREE.Vector3(),
    history: [],
    parentName,
    parentIndex,
    isMoon: Boolean(parentName),
  };
}

function computeMoonInitialState(moonDefinition, parentBody) {
  const orbit = moonDefinition.orbit;
  if (!orbit) {
    throw new Error(`Moon ${moonDefinition.name} is missing orbit parameters`);
  }

  const { semiMajorAxis, period } = orbit;
  if (!semiMajorAxis || !period) {
    throw new Error(`Moon ${moonDefinition.name} requires orbit.semiMajorAxis and orbit.period`);
  }

  const inclination = (orbit.inclination ?? 0) * DEG2RAD;
  const ascendingNode = (orbit.ascendingNode ?? 0) * DEG2RAD;
  const argumentOfPeriapsis = (orbit.argumentOfPeriapsis ?? 0) * DEG2RAD;
  const phase = (orbit.phase ?? 0) * DEG2RAD;

  const distance = semiMajorAxis;
  const speed = (2 * Math.PI * distance) / period;

  const position = new THREE.Vector3(distance, 0, 0);
  const velocity = new THREE.Vector3(0, speed, 0);

  if (phase !== 0) {
    position.applyAxisAngle(Z_AXIS, phase);
    velocity.applyAxisAngle(Z_AXIS, phase);
  }
  if (argumentOfPeriapsis !== 0) {
    position.applyAxisAngle(Z_AXIS, argumentOfPeriapsis);
    velocity.applyAxisAngle(Z_AXIS, argumentOfPeriapsis);
  }
  if (inclination !== 0) {
    position.applyAxisAngle(X_AXIS, inclination);
    velocity.applyAxisAngle(X_AXIS, inclination);
  }
  if (ascendingNode !== 0) {
    position.applyAxisAngle(Z_AXIS, ascendingNode);
    velocity.applyAxisAngle(Z_AXIS, ascendingNode);
  }

  position.add(parentBody.position);
  velocity.add(parentBody.velocity);

  return { position, velocity };
}

export class SolarSystemSimulation {
  constructor(bodyDefinitions, options = {}) {
    this.scale = options.scale ?? SCALE;
    this.gravityMultiplier = options.gravityMultiplier ?? 1;
    this.historyLimit = options.historyLimit ?? 720;
    this.bodies = [];

    bodyDefinitions.forEach((definition) => {
      const planetIndex = this.bodies.length;
      const planet = instantiateBody(definition, { parentName: null, parentIndex: null });
      this.bodies.push(planet);

      if (Array.isArray(definition.moons)) {
        definition.moons.forEach((moonDefinition) => {
          const { position, velocity } = computeMoonInitialState(moonDefinition, planet);
          const moon = instantiateBody(moonDefinition, {
            parentName: planet.name,
            parentIndex: planetIndex,
            positionOverride: position,
            velocityOverride: velocity,
          });
          this.bodies.push(moon);
        });
      }
    });

    // Resolve parent indices
    const indexByName = new Map(this.bodies.map((body, index) => [body.name, index]));
    this.bodies.forEach((body) => {
      if (body.parentName) {
        body.parentIndex = indexByName.get(body.parentName) ?? null;
      }
    });

    this._accelerations = this.bodies.map(() => new THREE.Vector3());
    this.updateAccelerations(this.gravityMultiplier);
  }

  setHistoryLimit(limit) {
    this.historyLimit = limit;
    this.bodies.forEach((body) => {
      if (body.history.length > limit) {
        body.history.splice(0, body.history.length - limit);
      }
    });
  }

  updateAccelerations(gravityMultiplier = this.gravityMultiplier) {
    const factor = gravityMultiplier * G;
    const diff = new THREE.Vector3();

    for (let i = 0; i < this._accelerations.length; i += 1) {
      this._accelerations[i].set(0, 0, 0);
    }

    for (let i = 0; i < this.bodies.length; i += 1) {
      const body = this.bodies[i];
      for (let j = i + 1; j < this.bodies.length; j += 1) {
        const other = this.bodies[j];
        diff.subVectors(other.position, body.position);
        const distanceSq = Math.max(diff.lengthSq(), MIN_DISTANCE_SQ);
        const distance = Math.sqrt(distanceSq);
        const accelMagnitudeI = factor * other.mass / distanceSq;
        const accelMagnitudeJ = factor * body.mass / distanceSq;
        const directionScale = 1 / distance;

        this._accelerations[i].addScaledVector(diff, accelMagnitudeI * directionScale);
        this._accelerations[j].addScaledVector(diff, -accelMagnitudeJ * directionScale);
      }
    }

    for (let i = 0; i < this.bodies.length; i += 1) {
      this.bodies[i].acceleration.copy(this._accelerations[i]);
    }

    this.gravityMultiplier = gravityMultiplier;
  }

  step(deltaSeconds, { timeScale = 1, gravityMultiplier = this.gravityMultiplier } = {}) {
    const dt = deltaSeconds * timeScale;
    if (!Number.isFinite(dt) || dt <= 0) return;

    const previousAccelerations = this._accelerations.map((accel) => accel.clone());

    this.bodies.forEach((body, index) => {
      body.position
        .addScaledVector(body.velocity, dt)
        .addScaledVector(previousAccelerations[index], 0.5 * dt * dt);
    });

    this.updateAccelerations(gravityMultiplier);

    this.bodies.forEach((body, index) => {
      const newAcceleration = this._accelerations[index];
      body.velocity.addScaledVector(previousAccelerations[index].add(newAcceleration), 0.5 * dt);
      this._recordHistory(body);
    });
  }

  getBodyByName(name) {
    return this.bodies.find((body) => body.name === name) ?? null;
  }

  _recordHistory(body) {
    if (this.historyLimit <= 0) return;
    body.history.push(body.position.clone());
    if (body.history.length > this.historyLimit) {
      body.history.shift();
    }
  }
}
