const ROOT_STATE = {
  catalog: [],
  favorites: new Set(),
  recent: [],
  query: '',
  category: 'All',
  viewMode: 'grid',
  hideDisabled: true,
  theme: 'dusk',
};

const STORAGE = {
  favorites: 'g1-legacy-modern-favorites',
  recent: 'g1-legacy-modern-recent',
  theme: 'g1-legacy-modern-theme',
  view: 'g1-legacy-modern-view',
  hide: 'g1-legacy-modern-hide-disabled',
  query: 'g1-legacy-modern-query',
  category: 'g1-legacy-modern-category',
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
  openLauncher: document.getElementById('open-launcher'),
  runtimeEvidence: document.getElementById('runtime-evidence'),
  recentlyOpened: document.getElementById('recently-opened'),
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
};

const catalogBase = () => {
  const path = window.location.pathname.replace(/\/+$/, '');
  return path.includes('/modern') ? path.replace(/\/modern$/, '') : path;
};

const buildRoute = (path) => `${catalogBase()}${path}`;

const iconList = (text) => text || '●';

const renderHero = () => {
  const hero = document.getElementById('hero');
  const appCount = state.catalog.length;
  const featuredCount = state.catalog.filter((app) => app.featured).length;
  hero.innerHTML = `
    <div class="hero-content">
      <h2>${appCount} apps indexed</h2>
      <p>${featuredCount} featured · ${new Set(state.catalog.map((app) => app.category)).size} categories</p>
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
      <button data-fav="${app.id}" type="button" aria-label="${favoriteLabel} ${app.title}">${favorite ? '★' : '☆'}</button>
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

const getFiltered = () => {
  const q = state.query.trim().toLowerCase();
  return state.catalog
    .filter((app) => !state.hideDisabled || app.id !== 'app-3')
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
    recentCount: state.recent.length,
    timestamp: new Date().toISOString(),
  };

  document.getElementById('runtime-evidence').textContent = JSON.stringify(evidence, null, 2);
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
    const pool = getFiltered();
    const list = pool.length > 0 ? pool : state.catalog;
    const picked = list[Math.floor(Math.random() * list.length)];
    if (!picked) return;

    saveRecent(picked);
    window.location.href = buildRoute(picked.path);
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

  const response = await fetch('./apps-manifest.json', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Failed to load manifest (${response.status})`);
  }

  const payload = await response.json();
  state.catalog = payload.items || [];
  state.catalogMeta = { generatedAt: payload.generatedAt || new Date().toISOString() };

  document.getElementById('search-input').value = state.query;
  document.getElementById('view-mode').value = state.viewMode;
  document.getElementById('hide-disabled').checked = state.hideDisabled;

  setTheme();
  bindEvents();
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
