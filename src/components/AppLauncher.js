import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { APP_CATEGORIES, getAllApps } from '../apps/registry';
import {
  readGlobalGistSettings,
  subscribeToGlobalGistSettings,
  writeGlobalGistSettings,
} from '../state/globalGistSettings';
import LauncherHeader from './LauncherHeader';
import SettingsModal from './SettingsModal';
import useFavoriteApps from './useFavoriteApps';
import './AppLauncher.css';

const AppLauncher = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [torontoTime, setTorontoTime] = useState('--:--:--');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [gistSettingsForm, setGistSettingsForm] = useState({
    gistId: '',
    gistToken: '',
  });

  const { isFavorited, toggleFavorite } = useFavoriteApps();
  const settingsButtonRef = useRef(null);

  useEffect(() => {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Toronto',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });

    const updateTime = () => {
      setTorontoTime(formatter.format(new Date()));
    };

    updateTime();
    const intervalId = setInterval(updateTime, 1000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const initialSettings = readGlobalGistSettings();
    setGistSettingsForm(initialSettings);

    const unsubscribe = subscribeToGlobalGistSettings((nextSettings) => {
      setGistSettingsForm(nextSettings);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const closeSettingsModal = useCallback(() => {
    setIsSettingsOpen(false);

    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => {
        settingsButtonRef.current?.focus();
      });
    } else {
      settingsButtonRef.current?.focus();
    }
  }, []);

  const handleCloseWithoutSaving = useCallback(() => {
    setGistSettingsForm(readGlobalGistSettings());
    closeSettingsModal();
  }, [closeSettingsModal]);

  const categories = ['All', ...Object.keys(APP_CATEGORIES)];

  const allApps = useMemo(() => getAllApps(), []);

  const filteredApps = useMemo(() => allApps
    .filter((app) => {
      const matchesCategory = selectedCategory === 'All' || app.category === selectedCategory;
      const matchesSearch = app.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           app.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           app.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch && !app.disabled;
    })
    .sort((a, b) => a.title.localeCompare(b.title)), [allApps, selectedCategory, searchQuery]);

  const featuredApps = useMemo(() => allApps
    .filter((app) => app.featured && !app.disabled)
    .sort((a, b) => a.title.localeCompare(b.title)), [allApps]);

  const handleAppClick = (app) => {
    if (app.disabled) return;
    navigate(app.path);
  };

  const handleGistInputChange = (field) => (event) => {
    const { value } = event.target;
    setGistSettingsForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveSettings = (event) => {
    event.preventDefault();
    writeGlobalGistSettings({
      gistId: gistSettingsForm.gistId,
      gistToken: gistSettingsForm.gistToken,
    });
    closeSettingsModal();
  };

  const handleSearchChange = useCallback((value) => {
    setSearchQuery(value);
  }, []);

  const handleViewModeChange = useCallback((mode) => {
    setViewMode(mode);
  }, []);

  const openSettings = useCallback(() => {
    setIsSettingsOpen(true);
  }, []);

  const renderAppCard = (app) => {
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
          onClick={(e) => {
            e.stopPropagation();
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
  };

  return (
    <div className="app-launcher">
      <LauncherHeader
        appCount={allApps.length}
        torontoTime={torontoTime}
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        viewMode={viewMode}
        onChangeViewMode={handleViewModeChange}
        onOpenSettings={openSettings}
        settingsButtonRef={settingsButtonRef}
      />

      <div className="launcher-content">
        <nav className="category-nav">
          {categories.map((category) => (
            <button
              key={category}
              className={`category-btn ${selectedCategory === category ? 'active' : ''}`}
              onClick={() => setSelectedCategory(category)}
            >
              {category !== 'All' && (
                <span className="category-icon">
                  {APP_CATEGORIES[category]?.icon}
                </span>
              )}
              {category}
            </button>
          ))}
        </nav>

        {selectedCategory === 'All' && featuredApps.length > 0 && (
          <section className="featured-section">
            <h2 className="section-title">⭐ Featured Apps</h2>
            <div className={`apps-container ${viewMode}`}>
              {featuredApps.map(renderAppCard)}
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

      <SettingsModal
        isOpen={isSettingsOpen}
        gistSettingsForm={gistSettingsForm}
        onFieldChange={handleGistInputChange}
        onCancel={handleCloseWithoutSaving}
        onSubmit={handleSaveSettings}
      />
    </div>
  );
};

export default AppLauncher;
