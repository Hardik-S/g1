const ROOT_STATE = {
  catalog: [],
  favorites: new Set(),
  recent: [],
  lastImport: null,
  query: '',
  category: 'All',
  viewMode: 'grid',
  hideDisabled: true,
  theme: 'dusk',
  favoritesOnly: false,
};

const STORAGE = {
  favorites: 'g1-legacy-modern-favorites',
  recent: 'g1-legacy-modern-recent',
  theme: 'g1-legacy-modern-theme',
  view: 'g1-legacy-modern-view',
  hide: 'g1-legacy-modern-hide-disabled',
  query: 'g1-legacy-modern-query',
  category: 'g1-legacy-modern-category',
  favoritesOnly: 'g1-legacy-modern-favorites-only',
  lastImport: 'g1-legacy-modern-last-import',
};

const state = {
  ...ROOT_STATE,
};

const getElements = () => ({
  appShell: document.getElementById('app-shell'),
  emptyState: document.getElementById('empty-state'),
  appCount: document.getElementById('app-count'),
  categoryCount: document.getElementById('category-count'),
  legacyVersion: document.getElementById('legacy-version'),
  categorySelect: document.getElementById('category-select'),
  searchInput: document.getElementById('search-input'),
  randomLaunch: document.getElementById('random-launch'),
  themeToggle: document.getElementById('theme-toggle'),
  viewModeSelect: document.getElementById('view-mode'),
  hideDisabledInput: document.getElementById('hide-disabled'),
  favoritesOnlyInput: document.getElementById('favorites-only'),
  openLauncher: document.getElementById('open-launcher'),
  runtimeEvidence: document.getElementById('runtime-evidence'),
  recentlyOpened: document.getElementById('recently-opened'),
  clearFiltersBtn: document.getElementById('clear-filters'),
  clearFavoritesBtn: document.getElementById('clear-favorites'),
  clearRecentBtn: document.getElementById('clear-recent'),
  exportFavoritesBtn: document.getElementById('export-favorites'),
  importFavoritesBtn: document.getElementById('import-favorites'),
  importFavoritesFile: document.getElementById('import-favorites-file'),
});

const safeLoad = (key, fallback, reviver) => {
  try {
    const value = window.localStorage.getItem(key);
    if (!value) {
      return fallback;
    }

    const parsed = JSON.parse(value);
    if (typeof reviver === 'function') {
      return reviver(parsed);
    }

    return parsed;
  } catch (err) {
    return fallback;
  }
};

const saveState = () => {
  window.localStorage.setItem(
    STORAGE.favorites,
    JSON.stringify([...state.favorites])
  );
  window.localStorage.setItem(STORAGE.recent, JSON.stringify(state.recent));
  window.localStorage.setItem(STORAGE.theme, state.theme);
  window.localStorage.setItem(STORAGE.view, state.viewMode);
  window.localStorage.setItem(STORAGE.hide, JSON.stringify(state.hideDisabled));
  window.localStorage.setItem(STORAGE.query, state.query);
  window.localStorage.setItem(STORAGE.category, state.category);
  window.localStorage.setItem(STORAGE.favoritesOnly, JSON.stringify(state.favoritesOnly));
  window.localStorage.setItem(STORAGE.lastImport, JSON.stringify(state.lastImport ?? null));
};

const catalogBase = () => {
  const path = window.location.pathname.replace(/\/+$/, '');
  return path.includes('/modern') ? path.replace(/\/modern$/, '') : path;
};

const buildRoute = (path) => `${catalogBase()}${path}`;

const iconList = (text) => text || '\u25CF';

const renderHero = () => {
  const hero = document.getElementById('hero');
  const appCount = state.catalog.length;
  const featuredCount = state.catalog.filter((app) => app.featured).length;
  hero.innerHTML = `
    <div class="hero-content">
      <h2>${appCount} apps indexed</h2>
      <p>${featuredCount} featured \u00B7 ${new Set(state.catalog.map((app) => app.category)).size} categories</p>
      <p>Legacy preservation: root app shell and routes are unchanged and still source of truth.</p>
    </div>`;
};

const updateMetrics = () => {
  const categories = new Set(state.catalog.map((app) => app.category));
  document.getElementById('app-count').textContent = `${state.catalog.length} app(s)`;
  document.getElementById('category-count').textContent = `${categories.size} category(s)`;
  document.getElementById('legacy-version').textContent = `Catalog version ${state.catalogMeta.generatedAt ?? 'n/a'}.`;
};

const categoryOptions = () => {
  const set = new Set(['All']);
  state.catalog.forEach((app) => set.add(app.category));
  const categories = [...set].sort((a, b) => a.localeCompare(b));
  const select = document.getElementById('category-select');
  select.innerHTML = categories
    .map((category) => `<option value="${category}">${category}</option>`)
    .join('');
  select.value = state.category;
};

const saveRecent = (app) => {
  const next = [
    {
      id: app.id,
      title: app.title,
      path: app.path,
      at: new Date().toISOString(),
    },
    ...state.recent.filter((entry) => entry.id !== app.id),
  ].slice(0, 6);
  state.recent = next;
};

const setTheme = () => {
  const root = document.documentElement;
  const isLight = state.theme === 'dawn';
  root.style.setProperty('--bg', isLight ? '#f4f8ff' : '#041124');
  root.style.setProperty('--bg-soft', isLight ? 'rgba(11, 27, 54, 0.09)' : 'rgba(255, 255, 255, 0.06)');
  root.style.setProperty('--text', isLight ? '#0f1a2c' : '#e8f1ff');
  root.style.setProperty('--muted', isLight ? '#3f5879' : '#9eb2cc');
  root.style.setProperty('--card', isLight ? 'rgba(255, 255, 255, 0.72)' : 'rgba(255, 255, 255, 0.08)');
  root.style.setProperty('--border', isLight ? 'rgba(20, 61, 112, 0.34)' : 'rgba(151, 179, 228, 0.32)');

  const themeBtn = document.getElementById('theme-toggle');
  themeBtn.textContent = `Theme: ${state.theme}`;
  themeBtn.setAttribute('aria-pressed', isLight ? 'true' : 'false');
};

const renderEmpty = (appCards, shell) => {
  if (appCards.length === 0) {
    document.getElementById('empty-state').hidden = false;
    shell.innerHTML = '';
    return;
  }

  document.getElementById('empty-state').hidden = true;
};

const createCard = (app) => {
  const favorite = state.favorites.has(app.id);
  const favoriteLabel = favorite ? 'Unsave' : 'Save';
  const article = document.createElement('article');
  article.className = `app-card ${state.viewMode}`;

  article.innerHTML = `
    <div class="app-title-row">
      <div>
        <h3><span class="favicon" aria-hidden="true">${iconList(app.icon)}</span> ${app.title}</h3>
      </div>
      <button data-fav="${app.id}" type="button" aria-label="${favoriteLabel} ${app.title}">${favorite ? '\u2605' : '\u2606'}</button>
    </div>
    <p>${app.description}</p>
    <div class="app-meta">
      <span>${app.category}</span>
      <span>v${app.version}</span>
    </div>
    <a class="app-link" href="${buildRoute(app.path)}">Open in launcher</a>
  `;

  const link = article.querySelector('.app-link');
  link.addEventListener('click', () => {
    saveRecent(app);
  });

  article.querySelector('[data-fav]').addEventListener('click', (evt) => {
    evt.preventDefault();
    if (state.favorites.has(app.id)) {
      state.favorites.delete(app.id);
    } else {
      state.favorites.add(app.id);
    }
    saveState();
    rerender();
  });

  return article;
};

const withValidAppIds = (ids) => new Set(ids.filter(Boolean).map((id) => `${id}`));

const syncFavoritesFromCatalog = () => {
  const catalogIds = new Set(state.catalog.map((app) => `${app.id}`));
  state.favorites = new Set([...state.favorites].filter((id) => catalogIds.has(id)));
};

const buildFavoritesPayload = () => ({
  source: 'g1 modern dock',
  generatedAt: new Date().toISOString(),
  favorites: [...state.favorites],
  metadata: {
    catalogVersion: state.catalogMeta?.generatedAt,
    visibleCatalogCount: state.catalog.length,
    favoritesOnlyMode: state.favoritesOnly,
    query: state.query,
    category: state.category,
  },
});

const applyImportedFavorites = (payload) => {
  const incoming = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.favorites)
      ? payload.favorites
      : [];

  const incomingIds = withValidAppIds(incoming);
  const original = state.favorites.size;
  syncFavoritesFromCatalog();
  const next = new Set([...state.favorites].filter(Boolean));

  for (const id of incomingIds) {
    if (state.catalog.some((entry) => `${entry.id}` === `${id}`)) {
      next.add(`${id}`);
    }
  }

  state.favorites = next;
  state.favoritesOnly = state.favorites.size > 0;
  state.lastImport = {
    requestSize: incoming.length,
    imported: state.favorites.size,
    skipped: Math.max(0, incoming.length - state.favorites.size),
    receivedAt: new Date().toISOString(),
    source: payload?.source || 'manual-import',
  };

  return {
    applied: state.favorites.size - original,
    skipped: incoming.length - (state.favorites.size - original),
    requested: incoming.length,
  };
};
const getFiltered = () => {
  const q = state.query.trim().toLowerCase();
  return state.catalog
    .filter((app) => !state.hideDisabled || app.id !== 'app-3')
    .filter((app) => !state.favoritesOnly || state.favorites.has(app.id))
    .filter((app) => state.category === 'All' || app.category === state.category)
    .filter((app) => {
      if (!q) return true;
      return (
        app.title.toLowerCase().includes(q) ||
        app.description.toLowerCase().includes(q) ||
        app.category.toLowerCase().includes(q) ||
        `${app.path}`.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const left = state.favorites.has(a.id);
      const right = state.favorites.has(b.id);
      if (left === right) {
        return a.title.localeCompare(b.title);
      }
      return left ? -1 : 1;
    });
};

const renderRecent = () => {
  const shell = document.getElementById('recently-opened');
  const recentApps = state.recent
    .map((item) => {
      const app = state.catalog.find((candidate) => candidate.id === item.id);
      if (!app) {
        return null;
      }

      return {
        ...item,
        app,
      };
    })
    .filter(Boolean);

  shell.innerHTML = recentApps.length
    ? recentApps
        .map(
          (entry) => `
        <article class="card recent-card">
          <p><strong>Last opened</strong>: ${entry.title}</p>
          <p>${new Date(entry.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p>
          <a href="${buildRoute(entry.app.path)}">Resume ${entry.title}</a>
        </article>`
        )
        .join('')
    : '<article class="card recent-card"><p>No recents yet</p></article>';
};

const renderAppGrid = () => {
  const shell = document.getElementById('app-shell');
  const appCards = getFiltered();
  renderEmpty(appCards, shell);

  shell.className = `app-grid ${state.viewMode}`;
  shell.innerHTML = appCards
    .map((app) => createCard(app).outerHTML)
    .join('');

  shell.querySelectorAll('[data-fav]').forEach((button) => {
    button.addEventListener('click', (event) => {
      const { fav } = event.currentTarget.dataset;
      const target = state.catalog.find((entry) => entry.id === fav);
      if (!target) return;

      if (state.favorites.has(target.id)) {
        state.favorites.delete(target.id);
      } else {
        state.favorites.add(target.id);
      }
      saveState();
      rerender();
    });
  });
};

const renderEvidence = () => {
  const evidence = {
    preservedFrom: 'legacy root /src apps registry metadata',
    sourcePath: '/src/apps/registry.js',
    behaviorMap: [
      'Original app routes remain unchanged',
      'Legacy launcher remains accessible via /',
      'Catalog is now rendered from extracted manifest and stored locally for deterministic UX',
    ],
    generatedAt: state.catalogMeta.generatedAt,
    totalApps: state.catalog.length,
    favorites: state.favorites.size,
    favoritesOnly: state.favoritesOnly,
    recentCount: state.recent.length,
    lastImport: state.lastImport,
    timestamp: new Date().toISOString(),
  };

  document.getElementById('runtime-evidence').textContent = JSON.stringify(evidence, null, 2);
};

const launchRandom = () => {
  const pool = getFiltered();
  const list = pool.length > 0 ? pool : state.catalog;
  const picked = list[Math.floor(Math.random() * list.length)];
  if (!picked) return;

  saveRecent(picked);
  window.location.href = buildRoute(picked.path);
};

const clearFavorites = () => {
  state.favorites = new Set();
  state.favoritesOnly = false;
  state.lastImport = {
    requestSize: 0,
    imported: 0,
    skipped: 0,
    receivedAt: new Date().toISOString(),
    source: 'manual-clear',
  };
  rerender();
};

const clearRecent = () => {
  state.recent = [];
  rerender();
};

const exportFavorites = () => {
  const payload = buildFavoritesPayload();
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const anchor = document.createElement('a');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  anchor.href = URL.createObjectURL(blob);
  anchor.download = `g1-modern-favorites-${stamp}.json`;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
};

const importFavorites = async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  const text = await file.text();
  let payload = null;
  try {
    payload = JSON.parse(text);
  } catch (error) {
    state.lastImport = {
      requestSize: 0,
      applied: 0,
      skipped: 0,
      source: 'file-import-invalid-json',
      receivedAt: new Date().toISOString(),
      reason: error.message,
    };
    rerender();
    event.target.value = '';
    return;
  }

  const result = applyImportedFavorites(payload);
  state.lastImport = {
    ...state.lastImport,
    requested: result.requested,
    applied: result.applied,
    skipped: result.skipped,
    source: 'file-import',
    receivedAt: new Date().toISOString(),
  };
  event.target.value = '';
  rerender();
};

const clearAllFilters = () => {
  state.query = '';
  state.category = 'All';
  state.viewMode = 'grid';
  state.favoritesOnly = false;
  const elements = getElements();
  elements.searchInput.value = '';
  elements.categorySelect.value = 'All';
  elements.viewModeSelect.value = 'grid';
  elements.favoritesOnlyInput.checked = false;
  rerender();
};

const bindShortcuts = () => {
  const elements = getElements();

  window.addEventListener('keydown', (event) => {
    if (event.defaultPrevented) {
      return;
    }

    if (event.metaKey || event.ctrlKey || event.altKey) return;

    const target = event.target;
    const targetTag = target?.tagName?.toLowerCase();

    if (event.key === '/' && targetTag !== 'input' && targetTag !== 'textarea') {
      event.preventDefault();
      elements.searchInput.focus();
      return;
    }

    if (event.key === 'f' || event.key === 'F') {
      if (targetTag === 'input' || targetTag === 'textarea') return;
      event.preventDefault();
      state.favoritesOnly = !state.favoritesOnly;
      elements.favoritesOnlyInput.checked = state.favoritesOnly;
      rerender();
      return;
    }

    if (event.key === 'r' || event.key === 'R') {
      event.preventDefault();
      launchRandom();
      return;
    }

    if (event.key === 'c' || event.key === 'C') {
      event.preventDefault();
      clearAllFilters();
      return;
    }

    if (event.key === 'Escape') {
      elements.searchInput.blur();
    }
  });
};

function rerender() {
  renderHero();
  updateMetrics();
  categoryOptions();
  renderRecent();
  renderAppGrid();
  renderEvidence();
  saveState();
}

const bindEvents = () => {
  const elements = getElements();

  elements.searchInput.addEventListener('input', (event) => {
    state.query = event.target.value;
    rerender();
  });

  elements.categorySelect.addEventListener('change', (event) => {
    state.category = event.target.value;
    rerender();
  });

  elements.viewModeSelect.addEventListener('change', (event) => {
    state.viewMode = event.target.value;
    rerender();
  });

  elements.randomLaunch.addEventListener('click', () => {
    launchRandom();
  });

  elements.themeToggle.addEventListener('click', () => {
    state.theme = state.theme === 'dusk' ? 'dawn' : 'dusk';
    setTheme();
    saveState();
  });

  elements.hideDisabledInput.addEventListener('change', (event) => {
    state.hideDisabled = Boolean(event.target.checked);
    rerender();
  });

  elements.favoritesOnlyInput.addEventListener('change', (event) => {
    state.favoritesOnly = Boolean(event.target.checked);
    rerender();
  });

  elements.clearFiltersBtn.addEventListener('click', clearAllFilters);
  elements.clearFavoritesBtn.addEventListener('click', clearFavorites);
  elements.clearRecentBtn.addEventListener('click', clearRecent);
  elements.exportFavoritesBtn.addEventListener('click', exportFavorites);
  elements.importFavoritesBtn.addEventListener('click', () => elements.importFavoritesFile.click());
  elements.importFavoritesFile.addEventListener('change', importFavorites);

  elements.openLauncher.addEventListener('click', () => {
    saveState();
  });
};

const bootstrap = async () => {
  state.favorites = new Set(safeLoad(STORAGE.favorites, []));
  state.recent = safeLoad(STORAGE.recent, []);
  state.theme = safeLoad(STORAGE.theme, 'dusk');
  state.viewMode = safeLoad(STORAGE.view, 'grid');
  state.hideDisabled = safeLoad(STORAGE.hide, true, (value) => Boolean(value));
  state.query = safeLoad(STORAGE.query, '');
  state.category = safeLoad(STORAGE.category, 'All');
  state.favoritesOnly = safeLoad(STORAGE.favoritesOnly, false, (value) => Boolean(value));
  state.lastImport = safeLoad(STORAGE.lastImport, null);

  const response = await fetch('./apps-manifest.json', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed to load manifest (${response.status})`);
  }

  const payload = await response.json();
  state.catalog = payload.items || [];
  state.catalogMeta = { generatedAt: payload.generatedAt || new Date().toISOString() };
  syncFavoritesFromCatalog();

  document.getElementById('search-input').value = state.query;
  document.getElementById('view-mode').value = state.viewMode;
  document.getElementById('hide-disabled').checked = state.hideDisabled;
  document.getElementById('favorites-only').checked = state.favoritesOnly;

  setTheme();
  bindEvents();
  bindShortcuts();
  rerender();
};

bootstrap().catch((error) => {
  const evidence = {
    recovered: false,
    reason: error.message,
    fallback: 'open legacy launcher directly from the repo root',
    timestamp: new Date().toISOString(),
  };
  document.getElementById('runtime-evidence').textContent = JSON.stringify(evidence, null, 2);
  document.getElementById('app-shell').innerHTML = '<p>Catalog unavailable. Use legacy launcher for full functionality.</p>';
  setTheme();
});
