import { useCallback, useMemo, useState } from 'react';

const readFavoriteIds = () => {
  try {
    const stored = localStorage.getItem('favoriteAppIds');
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    return [];
  }
};

const useFavorites = (allApps, selectedCategory, searchQuery) => {
  const [favoriteIds, setFavoriteIds] = useState(readFavoriteIds);

  const toggleFavorite = useCallback((appId) => {
    setFavoriteIds((previous) => {
      const next = previous.includes(appId)
        ? previous.filter((id) => id !== appId)
        : [...previous, appId];

      try {
        localStorage.setItem('favoriteAppIds', JSON.stringify(next));
      } catch (error) {
        // Ignore write failures (e.g., private mode restrictions)
      }

      return next;
    });
  }, []);

  const isFavorited = useCallback((appId) => favoriteIds.includes(appId), [favoriteIds]);

  const favoriteApps = useMemo(() => allApps
    .filter((app) => favoriteIds.includes(app.id) && !app.disabled)
    .filter((app) => {
      const searchLower = searchQuery.toLowerCase();
      const matchesCategory = selectedCategory === 'All' || app.category === selectedCategory;
      const matchesSearch = app.title.toLowerCase().includes(searchLower) ||
        app.description.toLowerCase().includes(searchLower) ||
        app.tags.some((tag) => tag.toLowerCase().includes(searchLower));

      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => a.title.localeCompare(b.title)), [
    allApps,
    favoriteIds,
    searchQuery,
    selectedCategory,
  ]);

  const hasHiddenFavoritesInCategory = useMemo(() => {
    if (selectedCategory === 'All' || favoriteIds.length === 0) {
      return false;
    }

    const searchLower = searchQuery.toLowerCase();

    return favoriteIds.some((favoriteId) => {
      const app = allApps.find((candidate) => candidate.id === favoriteId);

      if (!app || app.disabled) {
        return false;
      }

      const matchesSearch = app.title.toLowerCase().includes(searchLower) ||
        app.description.toLowerCase().includes(searchLower) ||
        app.tags.some((tag) => tag.toLowerCase().includes(searchLower));

      if (!matchesSearch) {
        return false;
      }

      return app.category !== selectedCategory;
    });
  }, [allApps, favoriteIds, searchQuery, selectedCategory]);

  return {
    favoriteIds,
    favoriteApps,
    hasHiddenFavoritesInCategory,
    isFavorited,
    toggleFavorite,
  };
};

export default useFavorites;
