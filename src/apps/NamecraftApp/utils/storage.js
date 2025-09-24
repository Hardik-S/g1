const STORAGE_KEY = 'namecraft::rooms';

export const loadRoomsFromStorage = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed;
  } catch (error) {
    console.warn('[Namecraft] Failed to parse rooms from storage', error);
    return null;
  }
};

export const saveRoomsToStorage = (rooms) => {
  if (typeof window === 'undefined') return;
  try {
    const payload = JSON.stringify(rooms);
    window.localStorage.setItem(STORAGE_KEY, payload);
  } catch (error) {
    console.warn('[Namecraft] Failed to persist rooms', error);
  }
};

export const clearRoomsStorage = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
};

export const getStorageKey = () => STORAGE_KEY;
