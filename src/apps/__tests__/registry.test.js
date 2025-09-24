import React, { Suspense } from 'react';
import { render, screen } from '@testing-library/react';
import {
  APP_METADATA,
  getAllApps,
  getAppById,
  getAppLoader,
  getAppsByCategory,
  getAppsCount,
  getFeaturedApps,
} from '../registry';
import { appLoaderCache } from '../registry/loaders';

describe('apps registry', () => {
  beforeEach(() => {
    appLoaderCache.clear();
  });

  it('returns all apps defined in metadata', () => {
    const allApps = getAllApps();
    const metadataIds = APP_METADATA.map((app) => app.id);

    expect(allApps.map((app) => app.id)).toEqual(metadataIds);
  });

  it('looks up apps by id with defaults applied', () => {
    const targetId = 'catpad';
    const metadata = APP_METADATA.find((app) => app.id === targetId);
    const app = getAppById(targetId);

    expect(app).toMatchObject({ ...metadata, author: 'Hardik-s' });
  });

  it('filters apps by category and featured flag', () => {
    const games = getAppsByCategory('Games');
    const featured = getFeaturedApps();

    expect(games).not.toHaveLength(0);
    expect(games.every((app) => app.category === 'Games')).toBe(true);

    const featuredIds = featured.map((app) => app.id);
    const expectedFeaturedIds = APP_METADATA.filter((app) => app.featured).map((app) => app.id);

    expect(featuredIds).toEqual(expectedFeaturedIds);
  });

  it('reports the same app count as the metadata source', () => {
    expect(getAppsCount()).toBe(APP_METADATA.length);
  });

  it('caches lazy loaders by app id', () => {
    const first = getAppLoader('day-switcher');
    const second = getAppLoader('day-switcher');

    expect(first).toBe(second);
  });

  it('renders a lazy-loaded app component', async () => {
    const LazyApp = getAppLoader('day-switcher');

    expect(LazyApp).toBeTruthy();

    render(
      <Suspense fallback={<div>Loading...</div>}>
        <LazyApp />
      </Suspense>,
    );

    expect(await screen.findByText(/random day/i)).toBeInTheDocument();
  });
});
