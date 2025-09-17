import React, { useState, useEffect } from 'react';
import { APP_REGISTRY, APP_CATEGORIES, getAppsByCategory, getFeaturedApps, getAllApps } from '../apps/registry';
import './AppLauncher.css';

const AppLauncher = ({ onLaunchApp, currentView, onBackToLauncher }) => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

  const categories = ['All', ...Object.keys(APP_CATEGORIES)];
  
  const filteredApps = getAllApps().filter(app => {
    const matchesCategory = selectedCategory === 'All' || app.category === selectedCategory;
    const matchesSearch = app.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         app.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         app.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch && !app.disabled;
  });

  const featuredApps = getFeaturedApps();

  const handleAppClick = (app) => {
    if (app.disabled) return;
    onLaunchApp(app);
  };

  const renderAppCard = (app) => (
    <div 
      key={app.id} 
      className={`app-card ${app.disabled ? 'disabled' : ''} ${viewMode}`}
      onClick={() => handleAppClick(app)}
    >
      <div className="app-icon">{app.icon}</div>
      <div className="app-info">
        <h3 className="app-title">{app.title}</h3>
        <p className="app-description">{app.description}</p>
        <div className="app-meta">
          <span className="app-category">{app.category}</span>
          <span className="app-version">v{app.version}</span>
        </div>
        {app.featured && <span className="featured-badge">⭐ Featured</span>}
      </div>
    </div>
  );

  if (currentView !== 'launcher') {
    return null;
  }

  return (
    <div className="app-launcher">
      <header className="launcher-header">
        <h1 className="launcher-title">
          <span className="title-icon">📱</span>
          App Container
          <span className="app-count">({getAllApps().length} apps)</span>
        </h1>
        
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
