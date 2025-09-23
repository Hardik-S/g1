import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFavoritesStorage } from '../../../state/favoritesStorage';
import matchesAppQuery from '../../../apps/filtering';

const useFavorites = (allApps, selectedCategory, searchQuery) => {
  const { readFavorites, writeFavorites } = useFavoritesStorage();

  const [favoriteIds, setFavoriteIds] = useState(() => readFavorites());

  useEffect(() => {
    const next = readFavorites();

    setFavoriteIds((previous) => {
      if (previous.length === next.length && previous.every((id, index) => id === next[index])) {
        return previous;
      }

      return next;
    });
  }, [readFavorites]);

  const toggleFavorite = useCallback((appId) => {
    setFavoriteIds((previous) => {
      const next = previous.includes(appId)
        ? previous.filter((id) => id !== appId)
        : [...previous, appId];

      writeFavorites(next);

      return next;
    });
  }, [writeFavorites]);

  const isFavorited = useCallback((appId) => favoriteIds.includes(appId), [favoriteIds]);

  const filterOptions = useMemo(() => ({
    category: selectedCategory,
    searchTerm: searchQuery.toLowerCase(),
  }), [searchQuery, selectedCategory]);

  const favoriteApps = useMemo(() => allApps
    .filter((app) => favoriteIds.includes(app.id))
    .filter((app) => matchesAppQuery(app, filterOptions))
    .sort((a, b) => a.title.localeCompare(b.title)), [
    allApps,
    favoriteIds,
    filterOptions,
  ]);

  const hasHiddenFavoritesInCategory = useMemo(() => {
    if (selectedCategory === 'All' || favoriteIds.length === 0) {
      return false;
    }

    return favoriteIds.some((favoriteId) => {
      const app = allApps.find((candidate) => candidate.id === favoriteId);

      if (!app || app.disabled) {
        return false;
      }

      if (!matchesAppQuery(app, { category: 'All', searchTerm: filterOptions.searchTerm })) {
        return false;
      }

      return app.category !== selectedCategory;
    });
  }, [allApps, favoriteIds, filterOptions.searchTerm, selectedCategory]);

  return {
    favoriteIds,
    favoriteApps,
    hasHiddenFavoritesInCategory,
    isFavorited,
    toggleFavorite,
  };
};

export default useFavorites;
