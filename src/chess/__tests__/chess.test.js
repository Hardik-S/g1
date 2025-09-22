const fs = require('fs');
const path = require('path');
const { Chess } = require('chess.js');

const BoardManager = require('../../../js/boardManager.js');
const StockfishEngine = require('../../../js/stockfishEngine.js');

class FakeWorker {
  constructor() {
    this.postMessage = jest.fn();
    this.listeners = new Set();
  }

  addEventListener(type, handler) {
    if (type === 'message') {
      this.listeners.add(handler);
    }
  }

  removeEventListener(type, handler) {
    if (type === 'message') {
      this.listeners.delete(handler);
    }
  }

  emit(data) {
    this.listeners.forEach((handler) => handler({ data }));
  }
}

describe('BoardManager', () => {
  beforeEach(() => {
    global.Chess = Chess;
  });

  afterEach(() => {
    delete global.Chess;
  });

  test('enforces legal local moves in two-player mode', () => {
    const boardFactory = jest.fn().mockImplementation(() => ({
      position: jest.fn(),
    }));

    const manager = new BoardManager({
      boardFactory,
      createGame: () => new Chess(),
    });

    manager.setPlayers({ white: 'human', black: 'human' });

    const legalMove = manager.attemptLocalMove('e2', 'e4');
    expect(legalMove).not.toBeNull();

    const illegalMove = manager.attemptLocalMove('e2', 'e5');
    expect(illegalMove).toBeNull();

    const blackReply = manager.attemptLocalMove('e7', 'e5');
    expect(blackReply).not.toBeNull();
  });
});

describe('StockfishEngine', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    delete global.Stockfish;
  });

  test('waits one second before resolving the engine move', async () => {
    const worker = new FakeWorker();
    global.Stockfish = jest.fn(() => worker);

    const engine = new StockfishEngine({ moveDelay: 1000, thinkTime: 500 });

    worker.emit('readyok');
    await engine.ready;

    const movePromise = engine.requestMove('startpos');
    await Promise.resolve();

    jest.advanceTimersByTime(500);
    await Promise.resolve();
    const commands = worker.postMessage.mock.calls.map(([command]) => command);
    expect(commands).toContain('go movetime 500');
    const goIndex = commands.lastIndexOf('go movetime 500');
    const positionIndex = commands.lastIndexOf('position fen startpos');
    expect(goIndex).toBeGreaterThan(positionIndex);

    let resolved = false;
    movePromise.then(() => {
      resolved = true;
    });

    worker.emit('bestmove e2e4');

    jest.advanceTimersByTime(499);
    expect(resolved).toBe(false);

    jest.advanceTimersByTime(1);
    await expect(movePromise).resolves.toBe('e2e4');
  });
});

describe('Chess HTML integration', () => {
  test('omits the CDN hosted Stockfish script tag', () => {
    const htmlPath = path.resolve(__dirname, '../../../html/chess.html');
    const html = fs.readFileSync(htmlPath, 'utf8');
    expect(html).not.toMatch(/cdn.jsdelivr.net\/npm\/stockfish/);
  });
});
