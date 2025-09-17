import ChessGameManager from '../ChessGameManager';

jest.mock('../StockfishService', () => {
  return jest.fn().mockImplementation(() => ({
    requestMove: jest.fn().mockResolvedValue('e7e5'),
    startNewGame: jest.fn().mockResolvedValue(undefined),
    dispose: jest.fn(),
  }));
});

describe('Chess game logic', () => {
  test('enforces legal moves via game manager', () => {
    const manager = new ChessGameManager();
    expect(manager.attemptMove('e2', 'e5')).toBeNull();
    expect(manager.getFen()).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');

    const legalMove = manager.attemptMove('e2', 'e4');
    expect(legalMove).toBeTruthy();
    expect(manager.getFen()).toContain('4P3');
    expect(manager.getTurn()).toBe('b');
  });

  test('supports switching between single and two-player modes', () => {
    const manager = new ChessGameManager();
    expect(manager.getMode()).toBe('single');
    expect(manager.getLegalTargets('e7', manager.getMode() === 'single')).toHaveLength(0);

    manager.setMode('two');
    manager.attemptMove('e2', 'e4');
    const responseMoves = manager.getLegalTargets('e7', manager.getMode() === 'single');
    expect(responseMoves).toContain('e5');
    const blackMove = manager.attemptMove('e7', 'e5');
    expect(blackMove).toBeTruthy();
    expect(manager.getTurn()).toBe('w');
  });
});
