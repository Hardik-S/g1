import { useCallback, useState } from 'react';

const FAVORITES_STORAGE_KEY = 'favoriteAppIds';

const canUseStorage = () => typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const readStoredFavorites = () => {
  if (!canUseStorage()) {
    return [];
  }

  try {
    const stored = window.localStorage.getItem(FAVORITES_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    return [];
  }
};

const useFavoriteApps = () => {
  const [favoriteIds, setFavoriteIds] = useState(() => readStoredFavorites());

  const persistFavorites = useCallback((nextFavorites) => {
    if (!canUseStorage()) {
      return;
    }

    try {
      window.localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(nextFavorites));
    } catch (error) {
      // ignore storage write failures
    }
  }, []);

  const toggleFavorite = useCallback((appId) => {
    setFavoriteIds((prev) => {
      const next = prev.includes(appId)
        ? prev.filter((id) => id !== appId)
        : [...prev, appId];

      persistFavorites(next);
      return next;
    });
  }, [persistFavorites]);

  const isFavorited = useCallback((appId) => favoriteIds.includes(appId), [favoriteIds]);

  return {
    favoriteIds,
    isFavorited,
    toggleFavorite,
  };
};

export default useFavoriteApps;
