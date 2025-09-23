import React from 'react';

const FavoritesSection = ({
  favoriteApps,
  hasFavoriteIds,
  hasHiddenFavoritesInCategory,
  renderAppCard,
  viewMode,
}) => {
  if (favoriteApps.length === 0) {
    if (hasFavoriteIds && hasHiddenFavoritesInCategory) {
      return <div className="favorites-empty-message">Mark apps as ★ to see them here</div>;
    }

    return null;
  }

  return (
    <section className="favorites-section">
      <h2 className="section-title">★ Favorite Apps</h2>
      <div className={`apps-container ${viewMode}`}>
        {favoriteApps.map(renderAppCard)}
      </div>
    </section>
  );
};

export default FavoritesSection;
