import React, { useEffect, useMemo, useState } from 'react';
import { APP_CATEGORIES, getAllApps } from '../apps/registry';
import './AppLauncher.css';

const AppLauncher = ({ onLaunchApp, currentView, onBackToLauncher }) => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [torontoTime, setTorontoTime] = useState('--:--:--');
  const [favoriteIds, setFavoriteIds] = useState(() => {
    try {
      const stored = localStorage.getItem('favoriteAppIds');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  });

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

  const categories = ['All', ...Object.keys(APP_CATEGORIES)];

  const allApps = useMemo(() => getAllApps(), []);

  const filteredApps = useMemo(() => allApps
    .filter(app => {
      const matchesCategory = selectedCategory === 'All' || app.category === selectedCategory;
      const matchesSearch = app.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         app.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         app.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch && !app.disabled;
    })
    .sort((a, b) => a.title.localeCompare(b.title)), [allApps, selectedCategory, searchQuery]);

  const featuredApps = useMemo(() => allApps
    .filter(app => app.featured && !app.disabled)
    .sort((a, b) => a.title.localeCompare(b.title)), [allApps]);

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
    onLaunchApp(app);
  };

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

  if (currentView !== 'launcher') {
    return null;
  }

  return (
    <div className="app-launcher">
      <header className="launcher-header">
        <div className="launcher-header-top">
          <h1 className="launcher-title">
            <span className="title-icon">📱</span>
            App Container
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
            <button 
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
            >
              ⊞
            </button>
            <button 
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              ☰
            </button>
          </div>
        </div>
      </header>

      <div className="launcher-content">
        <nav className="category-nav">
          {categories.map(category => (
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
    </div>
  );
};

export default AppLauncher;
