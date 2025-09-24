import {
  getAllApps,
  getAppById,
  getAppLoader,
  getAppsByCategory,
  getAppsCount,
  getFeaturedApps,
} from '../registry';
import { APP_METADATA } from '../registry/apps';
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
});
