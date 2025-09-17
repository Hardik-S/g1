(function (global) {
  const DEFAULT_MOVE_DELAY = 1000;
  const DEFAULT_THINK_TIME = 500;
  const DEFAULT_SKILL = 5;
  const MIN_SKILL = 0;
  const MAX_SKILL = 20;

  function now() {
    if (typeof performance !== 'undefined' && performance.now) {
      return performance.now();
    }
    return Date.now();
  }

  class StockfishEngine {
    constructor(options = {}) {
      const {
        moveDelay = DEFAULT_MOVE_DELAY,
        thinkTime = DEFAULT_THINK_TIME,
        skillLevel = DEFAULT_SKILL,
        stockfishFactory,
      } = options;

      const factory =
        stockfishFactory ||
        (() => {
          if (typeof global.Stockfish === 'function') {
            return global.Stockfish();
          }
          throw new Error('Stockfish.js must be loaded before using StockfishEngine');
        });

      this.worker = factory();
      this.moveDelay = moveDelay;
      this.thinkTime = thinkTime;
      this.skillLevel = this.clampSkill(skillLevel);
      this.isReady = false;
      this.messageHandlers = new Set();
      this.pendingRequest = null;

      this.handleMessage = this.handleMessage.bind(this);
      if (typeof this.worker.addEventListener === 'function') {
        this.worker.addEventListener('message', this.handleMessage);
      } else {
        this.worker.onmessage = this.handleMessage;
      }

      this.ready = new Promise((resolve) => {
        this.resolveReady = resolve;
      });

      this.bootstrap();
    }

    bootstrap() {
      this.post('uci');
      this.post('isready');
    }

    clampSkill(level) {
      if (level < MIN_SKILL) return MIN_SKILL;
      if (level > MAX_SKILL) return MAX_SKILL;
      return level;
    }

    post(command) {
      if (this.worker && typeof this.worker.postMessage === 'function') {
        this.worker.postMessage(command);
      }
    }

    cancelPendingRequest(result = null) {
      if (!this.pendingRequest) {
        return;
      }

      const request = this.pendingRequest;
      this.pendingRequest = null;

      if (request.handler) {
        this.messageHandlers.delete(request.handler);
        request.handler = null;
      }

      if (request.timerId) {
        clearTimeout(request.timerId);
        request.timerId = null;
      }

      if (!request.resolved) {
        request.resolved = true;
        request.resolve(result);
      }
    }

    stop() {
      this.post('stop');
      this.cancelPendingRequest(null);
      this.messageHandlers.clear();
    }

    handleMessage(event) {
      const data = typeof event === 'string' ? event : event.data;
      if (typeof data !== 'string') {
        return;
      }

      if (data.includes('readyok') && !this.isReady) {
        this.isReady = true;
        this.setSkillLevel(this.skillLevel);
        if (typeof this.resolveReady === 'function') {
          this.resolveReady();
          this.resolveReady = null;
        }
        return;
      }

      if (data.startsWith('bestmove')) {
        const parts = data.split(' ');
        const move = parts[1];
        this.messageHandlers.forEach((handler) => handler(move));
      }
    }

    async requestMove(fen) {
      await this.ready;
      this.cancelPendingRequest(null);

      const startTime = now();

      this.post(`position fen ${fen}`);

      const thinkDelay = Math.max(0, this.moveDelay - this.thinkTime);

      await new Promise((resolve) => {
        setTimeout(() => {
          this.post(`go movetime ${this.thinkTime}`);
          resolve();
        }, thinkDelay);
      });

      return new Promise((resolve) => {
        const request = {
          resolve,
          handler: null,
          timerId: null,
          resolved: false,
        };

        request.handler = (move) => {
          this.messageHandlers.delete(request.handler);
          const elapsed = now() - startTime;
          const remaining = Math.max(0, this.moveDelay - elapsed);
          request.timerId = setTimeout(() => {
            this.pendingRequest = null;
            if (!request.resolved) {
              request.resolved = true;
              resolve(move);
            }
          }, remaining);
        };

        this.messageHandlers.add(request.handler);
        this.pendingRequest = request;
      });
    }

    setSkillLevel(level) {
      const nextLevel = this.clampSkill(level);
      this.skillLevel = nextLevel;
      if (this.isReady) {
        this.post(`setoption name Skill Level value ${nextLevel}`);
      }
    }

    dispose() {
      this.stop();
      if (this.worker) {
        if (typeof this.worker.terminate === 'function') {
          this.worker.terminate();
        }
        if (typeof this.worker.removeEventListener === 'function') {
          this.worker.removeEventListener('message', this.handleMessage);
        } else {
          this.worker.onmessage = null;
        }
      }
      this.messageHandlers.clear();
    }
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = StockfishEngine;
  } else {
    global.StockfishEngine = StockfishEngine;
  }
})(typeof globalThis !== 'undefined' ? globalThis : window);
