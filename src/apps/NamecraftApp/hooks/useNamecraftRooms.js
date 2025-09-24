import { useCallback, useEffect, useMemo, useState } from 'react';
import { createDemoRoom } from '../data/demoRoom.js';
import { evaluateRoom } from '../engine/heuristics.js';
import {
  loadRoomsFromStorage,
  saveRoomsToStorage,
  getStorageKey,
} from '../utils/storage.js';
import { decodeSharedRoom } from '../utils/share.js';
import {
  addCandidateName,
  addScenario,
  createEmptyRoom,
  removeCandidateName,
  removeScenario,
  stampEvaluations,
  updateCandidateName,
  updateScenario,
} from '../state/roomFactory.js';

const ensureRoomArray = (rooms) => (Array.isArray(rooms) ? rooms : []);

const parseShareToken = () => {
  if (typeof window === 'undefined') return null;
  const hash = window.location.hash || '';
  const [, query] = hash.split('?');
  if (!query) return null;
  const params = new URLSearchParams(query);
  const token = params.get('share');
  if (!token) return null;
  const room = decodeSharedRoom(token);
  if (!room) return null;
  // Clear the share token to avoid loops
  window.location.hash = hash.split('?')[0];
  return room;
};

export const useNamecraftRooms = () => {
  const [rooms, setRooms] = useState(() => {
    const stored = ensureRoomArray(loadRoomsFromStorage());
    if (stored.length) return stored;
    return [createDemoRoom()];
  });
  const [selectedId, setSelectedId] = useState(() => rooms[0]?.id || null);
  const [pendingShareRoom, setPendingShareRoom] = useState(null);

  useEffect(() => {
    const shared = parseShareToken();
    if (shared) {
      setPendingShareRoom(shared);
    }
  }, []);

  useEffect(() => {
    saveRoomsToStorage(rooms);
  }, [rooms]);

  const selectedRoom = useMemo(
    () => rooms.find((room) => room.id === selectedId) || rooms[0] || null,
    [rooms, selectedId]
  );

  const updateRooms = useCallback((nextRooms) => {
    setRooms(nextRooms);
    if (!nextRooms.length) {
      setSelectedId(null);
      return;
    }
    if (!nextRooms.find((room) => room.id === selectedId)) {
      setSelectedId(nextRooms[0].id);
    }
  }, [selectedId]);

  const createRoom = useCallback((title) => {
    const room = createEmptyRoom(title);
    updateRooms([...rooms, room]);
    setSelectedId(room.id);
    return room;
  }, [rooms, updateRooms]);

  const deleteRoom = useCallback((id) => {
    const filtered = rooms.filter((room) => room.id !== id);
    updateRooms(filtered);
  }, [rooms, updateRooms]);

  const replaceRoom = useCallback((room) => {
    updateRooms(rooms.map((entry) => (entry.id === room.id ? room : entry)));
    setSelectedId(room.id);
  }, [rooms, updateRooms]);

  const upsertRoom = useCallback((room) => {
    const exists = rooms.some((entry) => entry.id === room.id);
    if (exists) {
      replaceRoom(room);
    } else {
      updateRooms([...rooms, room]);
      setSelectedId(room.id);
    }
  }, [rooms, replaceRoom, updateRooms]);

  const updateSelectedRoom = useCallback((recipe) => {
    if (!selectedRoom) return;
    const patched = recipe(selectedRoom);
    replaceRoom(patched);
  }, [replaceRoom, selectedRoom]);

  const runEvaluation = useCallback(() => {
    if (!selectedRoom) return;
    const evaluations = evaluateRoom(selectedRoom);
    replaceRoom(stampEvaluations(selectedRoom, evaluations));
    return evaluations;
  }, [replaceRoom, selectedRoom]);

  const applyShareRoom = useCallback((room) => {
    setPendingShareRoom(null);
    upsertRoom(room);
  }, [upsertRoom]);

  const dismissShareRoom = useCallback(() => {
    setPendingShareRoom(null);
  }, []);

  return {
    rooms,
    selectedRoom,
    selectedId,
    setSelectedId,
    createRoom,
    deleteRoom,
    replaceRoom,
    upsertRoom,
    updateSelectedRoom,
    runEvaluation,
    pendingShareRoom,
    applyShareRoom,
    dismissShareRoom,
    helpers: {
      addCandidateName,
      updateCandidateName,
      removeCandidateName,
      addScenario,
      updateScenario,
      removeScenario,
      storageKey: getStorageKey(),
    },
  };
};
