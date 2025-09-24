import { createStableId } from '../utils/identity.js';
import { nowIso } from '../utils/dates.js';

export const createEmptyRoom = (title = 'Untitled Room') => {
  const stamp = nowIso();
  return {
    id: createStableId('room', title),
    title,
    notes: '',
    createdAt: stamp,
    updatedAt: stamp,
    names: [],
    scenarios: [],
    evaluations: [],
  };
};

export const addCandidateName = (room, payload) => {
  const candidate = {
    id: createStableId('name', payload.label || 'candidate'),
    label: payload.label?.trim() || 'New Candidate',
    meaning: payload.meaning?.trim() || '',
    phonetics: payload.phonetics?.trim() || '',
    tags: payload.tags || [],
  };
  return {
    ...room,
    names: [...room.names, candidate],
    updatedAt: nowIso(),
  };
};

export const updateCandidateName = (room, id, patch) => {
  return {
    ...room,
    names: room.names.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)),
    updatedAt: nowIso(),
  };
};

export const removeCandidateName = (room, id) => {
  return {
    ...room,
    names: room.names.filter((entry) => entry.id !== id),
    updatedAt: nowIso(),
  };
};

export const addScenario = (room, payload) => {
  const scenario = {
    id: createStableId('scenario', payload.title || 'scenario'),
    title: payload.title?.trim() || 'Scenario',
    goal: payload.goal?.trim() || '',
    stressTest: payload.stressTest?.trim() || '',
    riskNotes: payload.riskNotes?.trim() || '',
  };
  return {
    ...room,
    scenarios: [...room.scenarios, scenario],
    updatedAt: nowIso(),
  };
};

export const updateScenario = (room, id, patch) => {
  return {
    ...room,
    scenarios: room.scenarios.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)),
    updatedAt: nowIso(),
  };
};

export const removeScenario = (room, id) => {
  return {
    ...room,
    scenarios: room.scenarios.filter((entry) => entry.id !== id),
    updatedAt: nowIso(),
  };
};

export const stampEvaluations = (room, evaluations) => ({
  ...room,
  evaluations,
  updatedAt: nowIso(),
});
