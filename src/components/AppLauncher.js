import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { APP_CATEGORIES, getAllApps } from '../apps/registry';
import matchesAppQuery from '../apps/filtering';
import AppLauncherHeader from './AppLauncher/AppLauncherHeader';
import CategoryNav from './AppLauncher/CategoryNav';
import FavoritesSection from './AppLauncher/FavoritesSection';
import GistSettingsModal from './AppLauncher/GistSettingsModal';
import AdminLandingThemeCard from './AppLauncher/admin/AdminLandingThemeCard';
import useClock from './AppLauncher/hooks/useClock';
import useFavorites from './AppLauncher/hooks/useFavorites';
import useGistSettingsModal from './AppLauncher/hooks/useGistSettingsModal';
import './AppLauncher.css';

const AppLauncher = () => {
  const navigate = useNavigate();
  const hiddenAppsStorageKey = 'g1.hiddenApps';
  const hiddenFeaturedStorageKey = 'g1.hiddenFeaturedApps';
  const landingThemeStorageKey = 'g1.landingTheme';

  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [isFeaturedCollapsed, setIsFeaturedCollapsed] = useState(false);
  const [isAdminView, setIsAdminView] = useState(false);
  const [landingTheme, setLandingTheme] = useState(() => {
    if (typeof window === 'undefined' || !window.localStorage) {
      return 'dark';
    }

    const stored = window.localStorage.getItem(landingThemeStorageKey);
    return stored === 'light' ? 'light' : 'dark';
  });

  const readStoredIds = useCallback((storageKey) => {
    if (typeof window === 'undefined' || !window.localStorage) {
      return [];
    }

    try {
      const stored = window.localStorage.getItem(storageKey);
      if (!stored) {
        return [];
      }

      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.warn(`Unable to parse stored data for ${storageKey}`, error);
      return [];
    }
  }, []);

  const [hiddenAppIds, setHiddenAppIds] = useState(() => readStoredIds(hiddenAppsStorageKey));
  const [hiddenFeaturedAppIds, setHiddenFeaturedAppIds] = useState(
    () => readStoredIds(hiddenFeaturedStorageKey)
  );

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

  useEffect(() => {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    window.localStorage.setItem(hiddenAppsStorageKey, JSON.stringify(hiddenAppIds));
  }, [hiddenAppIds, hiddenAppsStorageKey]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    window.localStorage.setItem(
      hiddenFeaturedStorageKey,
      JSON.stringify(hiddenFeaturedAppIds)
    );
  }, [hiddenFeaturedAppIds, hiddenFeaturedStorageKey]);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }

    window.localStorage.setItem(landingThemeStorageKey, landingTheme);
  }, [landingTheme, landingThemeStorageKey]);

  const hiddenAppIdSet = useMemo(() => new Set(hiddenAppIds), [hiddenAppIds]);
  const hiddenFeaturedIdSet = useMemo(
    () => new Set(hiddenFeaturedAppIds),
    [hiddenFeaturedAppIds]
  );

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

  const filterOptions = useMemo(() => ({
    category: selectedCategory,
    searchTerm: searchQuery.toLowerCase(),
  }), [searchQuery, selectedCategory]);

  const filteredApps = useMemo(() => {
    const favoriteSet = new Set(favoriteIds);

    return allApps
      .filter((app) => matchesAppQuery(app, filterOptions))
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
      })
      .filter((app) => (isAdminView ? true : !hiddenAppIdSet.has(app.id)));
  }, [
    allApps,
    favoriteIds,
    filterOptions,
    hiddenAppIdSet,
    isAdminView,
  ]);

  const featuredApps = useMemo(() => {
    const baseFeatured = allApps
      .filter((app) => app.featured && !app.disabled)
      .sort((a, b) => a.title.localeCompare(b.title));

    if (isAdminView) {
      return baseFeatured;
    }

    return baseFeatured.filter(
      (app) => !hiddenAppIdSet.has(app.id) && !hiddenFeaturedIdSet.has(app.id)
    );
  }, [
    allApps,
    hiddenAppIdSet,
    hiddenFeaturedIdSet,
    isAdminView,
  ]);

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

  const handleToggleHiddenApp = useCallback((appId) => {
    setHiddenAppIds((previous) => (
      previous.includes(appId)
        ? previous.filter((id) => id !== appId)
        : [...previous, appId]
    ));
  }, []);

  const handleToggleHiddenFeaturedApp = useCallback((appId) => {
    setHiddenFeaturedAppIds((previous) => (
      previous.includes(appId)
        ? previous.filter((id) => id !== appId)
        : [...previous, appId]
    ));
  }, []);

  const favoriteAppsForView = useMemo(() => (
    isAdminView
      ? favoriteApps
      : favoriteApps.filter((app) => !hiddenAppIdSet.has(app.id))
  ), [favoriteApps, hiddenAppIdSet, isAdminView]);

  const adminHiddenFavoritesCount = useMemo(() => {
    if (isAdminView) {
      return 0;
    }

    return favoriteApps.filter((app) => hiddenAppIdSet.has(app.id)).length;
  }, [favoriteApps, hiddenAppIdSet, isAdminView]);

  const handleSelectLandingTheme = useCallback((nextTheme) => {
    setLandingTheme(nextTheme === 'light' ? 'light' : 'dark');
  }, []);

  const toggleLandingTheme = useCallback(() => {
    setLandingTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  }, []);

  const renderAdminPanel = () => (
    <div className="launcher-content admin-content">
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

      <section className="admin-panel">
        <div className="admin-panel-header">
          <h2>Admin Controls</h2>
          <p>Manage visibility and integrations for the public launcher.</p>
        </div>

        <div className="admin-panel-grid">
          <div className="admin-panel-card">
            <h3>App Visibility</h3>
            <p className="admin-panel-description">
              Toggle whether each app appears in the regular mechanical launcher view or the featured belt.
            </p>
            <div className="admin-app-list">
              {allApps.map((app) => {
                const hiddenFromLauncher = hiddenAppIdSet.has(app.id);
                const hiddenFromFeatured = hiddenFeaturedIdSet.has(app.id);

                return (
                  <div key={app.id} className="admin-app-row">
                    <div className="admin-app-summary">
                      <span className="admin-app-icon" aria-hidden="true">{app.icon}</span>
                      <div>
                        <h4>{app.title}</h4>
                        <p>{app.description}</p>
                      </div>
                    </div>
                    <div className="admin-app-toggles">
                      <label className="admin-toggle-option">
                        <input
                          type="checkbox"
                          checked={hiddenFromLauncher}
                          onChange={() => handleToggleHiddenApp(app.id)}
                        />
                        Hide from launcher
                      </label>
                      <label className="admin-toggle-option">
                        <input
                          type="checkbox"
                          checked={hiddenFromFeatured}
                          onChange={() => handleToggleHiddenFeaturedApp(app.id)}
                        />
                        Hide from featured
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <AdminLandingThemeCard
            landingTheme={landingTheme}
            onSelectTheme={handleSelectLandingTheme}
            onToggleTheme={toggleLandingTheme}
          />

          <div className="admin-panel-card">
            <h3>Gist Sync</h3>
            <p className="admin-panel-description">
              Configure the shared GitHub Gist connection that certain apps rely on for state.
            </p>
            <button
              type="button"
              className="admin-action-btn"
              onClick={openSettingsModal}
              ref={settingsButtonRef}
            >
              Configure gist settings
            </button>
          </div>
        </div>
      </section>

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

  const renderMechanicalView = () => (
    <div className="launcher-content mechanical-content">
      <div className="mechanical-housing">
        <div className="mechanical-frame" aria-hidden="true" />
        <div className="mechanical-frame mechanical-frame-bottom" aria-hidden="true" />
        <div className="mechanical-core">
          <CategoryNav
            categories={categories}
            onSelectCategory={setSelectedCategory}
            selectedCategory={selectedCategory}
          />

          <FavoritesSection
            adminHiddenFavoritesCount={adminHiddenFavoritesCount}
            favoriteApps={favoriteAppsForView}
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
      </div>
    </div>
  );

  const launcherModeClass = isAdminView ? 'admin-view' : 'mechanical-view';
  const landingThemeClass = !isAdminView ? `landing-theme-${landingTheme}` : '';

  return (
    <div className={`app-launcher ${launcherModeClass} ${landingThemeClass}`.trim()}>
      <AppLauncherHeader
        appCount={allApps.length}
        isAdminView={isAdminView}
        onRandomLaunch={handleRandomLaunch}
        onSearchChange={(event) => setSearchQuery(event.target.value)}
        onToggleAdminView={() => setIsAdminView((previous) => !previous)}
        onViewModeChange={setViewMode}
        searchQuery={searchQuery}
        torontoTime={torontoTime}
        viewMode={viewMode}
      />

      {isAdminView ? renderAdminPanel() : renderMechanicalView()}
    </div>
  );
};

export default AppLauncher;
