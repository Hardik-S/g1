const DEFAULT_SKILL = 5;
const DEFAULT_WORKER_PATH = 'stockfish/stockfish.js';

const resolveWorkerPath = (path = DEFAULT_WORKER_PATH) => {
  if (typeof window === 'undefined') {
    return path;
  }

  try {
    const url = new URL(path, window.location.href);
    url.hash = '';
    url.search = '';
    return url.toString();
  } catch (error) {
    return path;
  }
};

export default class StockfishService {
  constructor({ createWorker, nowProvider, workerPath } = {}) {
    this.createWorker = createWorker || (() => {
      if (typeof Worker === 'undefined') {
        throw new Error('Web Workers are not supported in this environment.');
      }
      return new Worker(resolveWorkerPath(workerPath));
    });

    this.worker = this.createWorker();
    this.worker.onmessage = (event) => this.handleMessage(event);
    this.messageListeners = [];
    this.bestMoveResolver = null;
    this.currentSkill = DEFAULT_SKILL;
    this.now = typeof nowProvider === 'function' ? nowProvider : () => Date.now();
    this.ready = this.initialize();
  }

  initialize() {
    this.sendCommand('uci');
    return this.waitForMessage((message) => message.includes('uciok'))
      .then(() => this.waitUntilReady());
  }

  handleMessage(event) {
    const message = typeof event === 'string' ? event : event?.data;
    if (typeof message !== 'string') {
      return;
    }

    this.messageListeners = this.messageListeners.filter((listener) => {
      if (listener.predicate(message)) {
        listener.resolve(message);
        return false;
      }
      return true;
    });

    if (message.startsWith('bestmove') && this.bestMoveResolver) {
      const parts = message.split(' ');
      const move = parts[1] || '';
      const resolver = this.bestMoveResolver;
      this.bestMoveResolver = null;
      resolver(move);
    }
  }

  waitForMessage(predicate) {
    return new Promise((resolve) => {
      this.messageListeners.push({ predicate, resolve });
    });
  }

  sendCommand(command) {
    this.worker.postMessage(command);
  }

  async waitUntilReady() {
    this.sendCommand('isready');
    await this.waitForMessage((message) => message.includes('readyok'));
  }

  async setSkillLevel(skillLevel) {
    const target = typeof skillLevel === 'number' ? Math.max(0, Math.min(20, Math.round(skillLevel))) : DEFAULT_SKILL;
    if (this.currentSkill === target) {
      return;
    }

    this.sendCommand(`setoption name Skill Level value ${target}`);
    await this.waitUntilReady();
    this.currentSkill = target;
  }

  async startNewGame() {
    await this.ready;
    this.sendCommand('ucinewgame');
    await this.waitUntilReady();
  }

  async requestMove(fen, { skillLevel = DEFAULT_SKILL } = {}) {
    await this.ready;
    await this.setSkillLevel(skillLevel);
    return new Promise((resolve) => {
      const start = this.now();
      this.bestMoveResolver = (move) => {
        const elapsed = this.now() - start;
        const remaining = Math.max(1000 - elapsed, 0);
        setTimeout(() => resolve(move), remaining);
      };

      const trimmedFen = typeof fen === 'string' ? fen.trim() : '';
      const positionCommand = trimmedFen === 'startpos'
        ? 'position startpos'
        : `position fen ${trimmedFen}`;
      this.sendCommand(positionCommand);
      this.waitUntilReady()
        .then(() => {
          this.sendCommand('go movetime 500');
        })
        .catch(() => {
          this.bestMoveResolver = null;
          resolve('(none)');
        });
    });
  }

  resolveBestMove(move) {
    if (typeof this.bestMoveResolver === 'function') {
      this.bestMoveResolver(move);
    }
  }

  dispose() {
    if (this.worker && typeof this.worker.terminate === 'function') {
      this.worker.terminate();
    }
    this.worker = null;
    this.messageListeners = [];
    this.bestMoveResolver = null;
  }
}
