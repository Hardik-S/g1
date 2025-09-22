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
import { verifyGistConnection } from '../global/verifyGistConnection';
import './AppLauncher.css';

const AppLauncher = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [isFeaturedCollapsed, setIsFeaturedCollapsed] = useState(false);
  const [torontoTime, setTorontoTime] = useState('--:--:--');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [gistSettingsForm, setGistSettingsForm] = useState({
    gistId: '',
    gistToken: '',
  });
  const [gistSettingsStatus, setGistSettingsStatus] = useState({
    type: null,
    message: '',
  });
  const [favoriteIds, setFavoriteIds] = useState(() => {
    try {
      const stored = localStorage.getItem('favoriteAppIds');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  });

  const settingsButtonRef = useRef(null);
  const gistIdInputRef = useRef(null);
  const gistTokenInputRef = useRef(null);
  const cancelButtonRef = useRef(null);
  const saveButtonRef = useRef(null);
  const gistStatusTimerRef = useRef(null);

  const clearGistStatus = useCallback(() => {
    if (gistStatusTimerRef.current) {
      clearTimeout(gistStatusTimerRef.current);
      gistStatusTimerRef.current = null;
    }
    setGistSettingsStatus({ type: null, message: '' });
  }, []);

  const scheduleGistStatusDismissal = useCallback(() => {
    if (gistStatusTimerRef.current) {
      clearTimeout(gistStatusTimerRef.current);
    }

    gistStatusTimerRef.current = setTimeout(() => {
      setGistSettingsStatus({ type: null, message: '' });
      gistStatusTimerRef.current = null;
    }, 6000);
  }, []);

  useEffect(() => {
    return () => {
      if (gistStatusTimerRef.current) {
        clearTimeout(gistStatusTimerRef.current);
      }
    };
  }, []);

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

  useEffect(() => {
    if (isSettingsOpen) {
      clearGistStatus();
    }
  }, [clearGistStatus, isSettingsOpen]);

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

  useEffect(() => {
    if (!isSettingsOpen || typeof document === 'undefined') {
      return undefined;
    }

    const focusableElements = () => [
      gistIdInputRef.current,
      gistTokenInputRef.current,
      cancelButtonRef.current,
      saveButtonRef.current,
    ].filter(Boolean);

    const firstElement = focusableElements()[0];
    if (firstElement) {
      setTimeout(() => {
        firstElement.focus();
      }, 0);
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        handleCloseWithoutSaving();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const elements = focusableElements();
      if (elements.length === 0) {
        return;
      }

      const first = elements[0];
      const last = elements[elements.length - 1];
      const active = document.activeElement;

      if (event.shiftKey) {
        if (active === first || !elements.includes(active)) {
          event.preventDefault();
          last.focus();
        }
        return;
      }

      if (active === last || !elements.includes(active)) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleCloseWithoutSaving, isSettingsOpen]);

  const categories = ['All', ...Object.keys(APP_CATEGORIES)];

  const allApps = useMemo(() => getAllApps(), []);

  const filteredApps = useMemo(() => {
    const favoriteSet = new Set(favoriteIds);
    return allApps
      .filter((app) => {
        const matchesCategory = selectedCategory === 'All' || app.category === selectedCategory;
        const matchesSearch = app.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           app.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           app.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
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

  const favoriteApps = useMemo(() => allApps
    .filter((app) => favoriteIds.includes(app.id) && !app.disabled)
    .filter((app) => {
      const matchesCategory = selectedCategory === 'All' || app.category === selectedCategory;
      const matchesSearch = app.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         app.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         app.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => a.title.localeCompare(b.title)), [allApps, favoriteIds, searchQuery, selectedCategory]);

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

  const isFavorited = (appId) => favoriteIds.includes(appId);

  const toggleFavorite = (appId) => {
    setFavoriteIds((prev) => {
      const next = prev.includes(appId)
        ? prev.filter((id) => id !== appId)
        : [...prev, appId];
      try {
        localStorage.setItem('favoriteAppIds', JSON.stringify(next));
      } catch (e) {}
      return next;
    });
  };

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

  const handleSaveSettings = useCallback(async (event) => {
    event.preventDefault();
    clearGistStatus();

    try {
      const savedSettings = writeGlobalGistSettings({
        gistId: gistSettingsForm.gistId,
        gistToken: gistSettingsForm.gistToken,
      });

      if (savedSettings.gistId) {
        await verifyGistConnection({
          gistId: savedSettings.gistId,
          gistToken: savedSettings.gistToken,
        });
      }

      setGistSettingsStatus({
        type: 'success',
        message: savedSettings.gistId
          ? 'Gist connection verified successfully.'
          : 'Gist settings saved.',
      });
      closeSettingsModal();
      scheduleGistStatusDismissal();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setGistSettingsStatus({
        type: 'error',
        message: `Failed to verify gist settings: ${errorMessage}`,
      });
      scheduleGistStatusDismissal();
    }
  }, [
    clearGistStatus,
    closeSettingsModal,
    gistSettingsForm,
    scheduleGistStatusDismissal,
  ]);

  const toggleFeaturedSection = useCallback(() => {
    setIsFeaturedCollapsed((prev) => !prev);
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
      <header className="launcher-header">
        <div className="launcher-header-top">
          <h1 className="launcher-title">
            <span className="title-icon">📱</span>
            64 Apps
            <span className="app-count">({allApps.length} apps)</span>
          </h1>

          <div className="toronto-clock" aria-label="Current time">
            <span className="clock-time">{torontoTime}</span>
          </div>
        </div>

        <div className="launcher-controls">
          <div className="search-container">
            <input
              type="text"
              placeholder="Search apps..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            <span className="search-icon">🔍</span>
          </div>

          <div className="view-controls">
            <div className="view-toggle-group">
              <button
                type="button"
                className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
              >
                ⊞
              </button>
              <button
                type="button"
                className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
              >
                ☰
              </button>
            </div>
            <button
              type="button"
              className="settings-btn"
              onClick={() => setIsSettingsOpen(true)}
              ref={settingsButtonRef}
            >
              <span aria-hidden="true">⚙️</span>
              <span className="settings-btn-label">Settings</span>
            </button>
          </div>
        </div>
      </header>

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

        {favoriteApps.length > 0 && (
          <section className="favorites-section">
            <h2 className="section-title">★ Favorite Apps</h2>
            <div className={`apps-container ${viewMode}`}>
              {favoriteApps.map(renderAppCard)}
            </div>
          </section>
        )}

        {favoriteApps.length === 0 && favoriteIds.length > 0 && hasHiddenFavoritesInCategory && (
          <div className="favorites-empty-message">Mark apps as ★ to see them here</div>
        )}

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

      {isSettingsOpen && (
        <div
          className="settings-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              handleCloseWithoutSaving();
            }
          }}
        >
          <div
            className="settings-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="gist-settings-title"
          >
            <form onSubmit={handleSaveSettings}>
              <h2 id="gist-settings-title" className="settings-modal-title">
                GitHub Gist Sync
              </h2>

              <div className="settings-field">
                <label htmlFor="gist-id-input">Gist ID</label>
                <input
                  id="gist-id-input"
                  ref={gistIdInputRef}
                  type="text"
                  value={gistSettingsForm.gistId}
                  onChange={handleGistInputChange('gistId')}
                  placeholder="e.g. a1b2c3d4e5"
                  autoComplete="off"
                />
              </div>

              <div className="settings-field">
                <label htmlFor="gist-token-input">Personal Access Token</label>
                <input
                  id="gist-token-input"
                  ref={gistTokenInputRef}
                  type="password"
                  value={gistSettingsForm.gistToken}
                  onChange={handleGistInputChange('gistToken')}
                  placeholder="ghp_..."
                  autoComplete="off"
                />
              </div>

              <div className="settings-modal-actions">
                <button
                  type="button"
                  className="settings-secondary-btn"
                  onClick={handleCloseWithoutSaving}
                  ref={cancelButtonRef}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="settings-primary-btn"
                  ref={saveButtonRef}
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppLauncher;
