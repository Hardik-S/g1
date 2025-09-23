import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.162/build/three.module.js';

export const SCALE = 1e-9;
const G = 6.6743e-11;
const MIN_DISTANCE_SQ = 1e6; // prevent singularities when bodies get too close

export class SolarSystemSimulation {
  constructor(bodyDefinitions, options = {}) {
    this.scale = options.scale ?? SCALE;
    this.gravityMultiplier = options.gravityMultiplier ?? 1;
    this.historyLimit = options.historyLimit ?? 720;
    this.bodies = bodyDefinitions.map((definition) => ({
      name: definition.name,
      mass: definition.mass,
      radius: definition.radius,
      color: definition.color,
      ring: definition.ring ? { ...definition.ring } : undefined,
      position: new THREE.Vector3().fromArray(definition.position),
      velocity: new THREE.Vector3().fromArray(definition.velocity),
      acceleration: new THREE.Vector3(),
      history: [],
    }));
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

    if (!Number.isFinite(dt) || dt <= 0) {
      return;
    }

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
    if (this.historyLimit <= 0) {
      return;
    }

    body.history.push(body.position.clone());
    if (body.history.length > this.historyLimit) {
      body.history.shift();
    }
  }
}
