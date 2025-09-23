import React, { useCallback, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { APP_CATEGORIES, getAllApps } from '../apps/registry';
import AppLauncherHeader from './AppLauncher/AppLauncherHeader';
import CategoryNav from './AppLauncher/CategoryNav';
import FavoritesSection from './AppLauncher/FavoritesSection';
import GistSettingsModal from './AppLauncher/GistSettingsModal';
import useClock from './AppLauncher/hooks/useClock';
import useFavorites from './AppLauncher/hooks/useFavorites';
import useGistSettingsModal from './AppLauncher/hooks/useGistSettingsModal';
import './AppLauncher.css';

const AppLauncher = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [isFeaturedCollapsed, setIsFeaturedCollapsed] = useState(false);

  const torontoTime = useClock();
  const {
    cancelButtonRef,
    gistIdInputRef,
    gistSettingsForm,
    gistSettingsStatus,
    gistTokenInputRef,
    handleCloseWithoutSaving,
    handleGistInputChange,
    handleSaveSettings,
    isSettingsOpen,
    openSettingsModal,
    saveButtonRef,
    settingsButtonRef,
  } = useGistSettingsModal();

  const allApps = useMemo(() => getAllApps(), []);

  const categories = useMemo(() => {
    const categoriesFromApps = [];

    allApps.forEach((app) => {
      if (!app || !app.category) {
        return;
      }

      if (!categoriesFromApps.includes(app.category)) {
        categoriesFromApps.push(app.category);
      }
    });

    const knownCategories = categoriesFromApps.filter((category) => APP_CATEGORIES[category]);
    const customCategories = categoriesFromApps.filter((category) => !APP_CATEGORIES[category]);

    return ['All', ...knownCategories, ...customCategories];
  }, [allApps]);

  const {
    favoriteApps,
    favoriteIds,
    hasHiddenFavoritesInCategory,
    isFavorited,
    toggleFavorite,
  } = useFavorites(allApps, selectedCategory, searchQuery);

  const filteredApps = useMemo(() => {
    const favoriteSet = new Set(favoriteIds);
    const searchLower = searchQuery.toLowerCase();

    return allApps
      .filter((app) => {
        const matchesCategory = selectedCategory === 'All' || app.category === selectedCategory;
        const matchesSearch = app.title.toLowerCase().includes(searchLower) ||
          app.description.toLowerCase().includes(searchLower) ||
          app.tags.some((tag) => tag.toLowerCase().includes(searchLower));
        return matchesCategory && matchesSearch && !app.disabled;
      })
      .sort((a, b) => {
        const aFavorited = favoriteSet.has(a.id);
        const bFavorited = favoriteSet.has(b.id);
        if (aFavorited && !bFavorited) {
          return -1;
        }
        if (!aFavorited && bFavorited) {
          return 1;
        }
        return a.title.localeCompare(b.title);
      });
  }, [allApps, favoriteIds, searchQuery, selectedCategory]);

  const featuredApps = useMemo(() => allApps
    .filter((app) => app.featured && !app.disabled)
    .sort((a, b) => a.title.localeCompare(b.title)), [allApps]);

  const handleAppClick = useCallback((app) => {
    if (!app || app.disabled) {
      return;
    }
    navigate(app.path);
  }, [navigate]);

  const handleRandomLaunch = useCallback(() => {
    const candidatesSource = filteredApps.length > 0 ? filteredApps : allApps;
    const launchableApps = candidatesSource.filter((app) => !app.disabled);

    if (launchableApps.length === 0) {
      return;
    }

    const randomIndex = Math.floor(Math.random() * launchableApps.length);
    const randomApp = launchableApps[randomIndex];

    if (!randomApp) {
      return;
    }

    if (handleAppClick) {
      handleAppClick(randomApp);
    } else {
      navigate(randomApp.path);
    }
  }, [allApps, filteredApps, handleAppClick, navigate]);

  const toggleFeaturedSection = useCallback(() => {
    setIsFeaturedCollapsed((prev) => !prev);
  }, []);

  const renderAppCard = useCallback((app) => {
    const favorited = isFavorited(app.id);
    return (
      <div
        key={app.id}
        className={`app-card ${app.disabled ? 'disabled' : ''} ${viewMode}`}
        onClick={() => handleAppClick(app)}
      >
        <button
          type="button"
          className={`favorite-toggle ${favorited ? 'favorited' : ''}`}
          aria-label={favorited ? 'Unfavorite app' : 'Favorite app'}
          onClick={(event) => {
            event.stopPropagation();
            toggleFavorite(app.id);
          }}
        >
          {favorited ? '★' : '☆'}
        </button>
        {favorited && <span className="favorited-badge">★ Favorited</span>}
        <div className="app-icon">{app.icon}</div>
        <div className="app-info">
          <h3 className="app-title">{app.title}</h3>
          <p className="app-description">{app.description}</p>
          <div className="app-meta">
            <span className="app-category">{app.category}</span>
            <span className="app-version">v{app.version}</span>
          </div>
        </div>
      </div>
    );
  }, [handleAppClick, isFavorited, toggleFavorite, viewMode]);

  return (
    <div className="app-launcher">
      <AppLauncherHeader
        appCount={allApps.length}
        onOpenSettings={openSettingsModal}
        onRandomLaunch={handleRandomLaunch}
        onSearchChange={(event) => setSearchQuery(event.target.value)}
        onViewModeChange={setViewMode}
        searchQuery={searchQuery}
        settingsButtonRef={settingsButtonRef}
        torontoTime={torontoTime}
        viewMode={viewMode}
      />

      {gistSettingsStatus.type && (
        <div
          className={`gist-status-banner ${gistSettingsStatus.type}`}
          aria-live="polite"
          role="status"
        >
          <span className="gist-status-icon" aria-hidden="true">
            {gistSettingsStatus.type === 'success' ? '✅' : '⚠️'}
          </span>
          <span className="gist-status-message">{gistSettingsStatus.message}</span>
        </div>
      )}

      <div className="launcher-content">
        <CategoryNav
          categories={categories}
          onSelectCategory={setSelectedCategory}
          selectedCategory={selectedCategory}
        />

        <FavoritesSection
          favoriteApps={favoriteApps}
          hasFavoriteIds={favoriteIds.length > 0}
          hasHiddenFavoritesInCategory={hasHiddenFavoritesInCategory}
          renderAppCard={renderAppCard}
          viewMode={viewMode}
        />

        {selectedCategory === 'All' && featuredApps.length > 0 && (
          <section
            className={`featured-section${isFeaturedCollapsed ? ' collapsed' : ''}`}
          >
            <div className="section-header">
              <h2 className="section-title">⭐ Featured Apps</h2>
              <button
                type="button"
                className="section-toggle"
                aria-expanded={!isFeaturedCollapsed}
                onClick={toggleFeaturedSection}
              >
                {isFeaturedCollapsed ? 'Show' : 'Hide'}
              </button>
            </div>
            <div className={`apps-container ${viewMode}`}>
              {!isFeaturedCollapsed && featuredApps.map(renderAppCard)}
            </div>
          </section>
        )}

        <section className="apps-section">
          <h2 className="section-title">
            {selectedCategory === 'All' ? 'All Apps' : `${selectedCategory} Apps`}
            <span className="app-count">({filteredApps.length})</span>
          </h2>

          {filteredApps.length === 0 ? (
            <div className="no-apps">
              <div className="no-apps-icon">🔍</div>
              <h3>No apps found</h3>
              <p>Try adjusting your search or category filter</p>
            </div>
          ) : (
            <div className={`apps-container ${viewMode}`}>
              {filteredApps.map(renderAppCard)}
            </div>
          )}
        </section>
      </div>

      <GistSettingsModal
        cancelButtonRef={cancelButtonRef}
        gistIdInputRef={gistIdInputRef}
        gistSettingsForm={gistSettingsForm}
        gistTokenInputRef={gistTokenInputRef}
        isOpen={isSettingsOpen}
        onCancel={handleCloseWithoutSaving}
        onChange={handleGistInputChange}
        onSubmit={handleSaveSettings}
        saveButtonRef={saveButtonRef}
      />
    </div>
  );
};

export default AppLauncher;
