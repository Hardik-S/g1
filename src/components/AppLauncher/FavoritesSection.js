import React from 'react';

const FavoritesSection = ({
  favoriteApps,
  adminHiddenFavoritesCount = 0,
  hasFavoriteIds,
  hasHiddenFavoritesInCategory,
  renderAppCard,
  viewMode,
}) => {
  if (favoriteApps.length === 0) {
    if (adminHiddenFavoritesCount > 0) {
      return (
        <div className="favorites-empty-message">
          Favorites are hidden by admin controls. Toggle Admin View to adjust visibility.
        </div>
      );
    }

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
