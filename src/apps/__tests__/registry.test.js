import { getAllApps, getAppById } from '../registry';

describe('app registry', () => {
  it('includes the chess app metadata', () => {
    const chessApp = getAppById('chess');

    expect(chessApp).toBeTruthy();
    expect(chessApp.title).toBe('Chessboard Summit');
    expect(chessApp.category).toBe('Games');
    expect(chessApp.icon).toBe('♟️');
    expect(chessApp.path).toBe('/apps/chess');
  });

  it('lists chess among all apps', () => {
    const allAppIds = getAllApps().map((app) => app.id);

    expect(allAppIds).toContain('chess');
  });
});
