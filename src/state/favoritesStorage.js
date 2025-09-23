import { createContext, useContext } from 'react';

const STORAGE_KEY = 'favoriteAppIds';

const getLocalStorage = (storageHost) => {
  if (!storageHost || !storageHost.localStorage) {
    return null;
  }

  return storageHost.localStorage;
};

export const readFavorites = (storageHost = typeof window !== 'undefined' ? window : undefined) => {
  const storage = getLocalStorage(storageHost);

  if (!storage) {
    return [];
  }

  try {
    const raw = storage.getItem(STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

export const writeFavorites = (favorites, storageHost = typeof window !== 'undefined' ? window : undefined) => {
  const storage = getLocalStorage(storageHost);

  if (!storage) {
    return false;
  }

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(favorites));
    return true;
  } catch (error) {
    return false;
  }
};

export const defaultFavoritesStorage = {
  readFavorites: () => readFavorites(),
  writeFavorites: (favorites) => writeFavorites(favorites),
};

export const FavoritesStorageContext = createContext(defaultFavoritesStorage);

export const useFavoritesStorage = () => useContext(FavoritesStorageContext);

export default defaultFavoritesStorage;
