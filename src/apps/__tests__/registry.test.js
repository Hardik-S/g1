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

  it('registers the CatPad app metadata', () => {
    const catpad = getAppById('catpad');

    expect(catpad).toBeTruthy();
    expect(catpad.title).toBe('CatPad');
    expect(catpad.category).toBe('Productivity');
    expect(catpad.icon).toBe('😺');
    expect(catpad.path).toBe('/apps/catpad');
  });
});
