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

  it('registers the Cat Typing Speed Test metadata', () => {
    const typingTest = getAppById('cat-typing-speed-test');

    expect(typingTest).toBeTruthy();
    expect(typingTest.title).toBe('Cat Typing Speed Test');
    expect(typingTest.category).toBe('Education');
    expect(typingTest.icon).toBe('⌨️');
    expect(typingTest.path).toBe('/apps/cat-typing-speed-test');
  });
});
