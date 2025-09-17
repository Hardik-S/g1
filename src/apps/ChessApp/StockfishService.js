const DEFAULT_SKILL = 5;

export default class StockfishService {
  constructor({ createWorker, nowProvider } = {}) {
    this.createWorker = createWorker || (() => {
      if (typeof Worker === 'undefined') {
        throw new Error('Web Workers are not supported in this environment.');
      }
      return new Worker('/stockfish/stockfish.js');
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

      this.sendCommand(`position fen ${fen}`);
      this.waitUntilReady()
        .then(() => {
          this.sendCommand('go movetime 500');
        })
        .catch(() => {
          this.bestMoveResolver = null;
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
