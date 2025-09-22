'use strict';

let cachedModelPromise = null;
let fallbackWarned = false;

function chooseHeuristicMove(legalMoves, boardSize) {
  if (!Array.isArray(legalMoves) || legalMoves.length === 0) {
    return null;
  }
  const size = Number.isInteger(boardSize) && boardSize > 0 ? boardSize : Math.max(legalMoves.length, 9);
  const center = (size - 1) / 2;
  const scored = legalMoves.map((move) => {
    const dx = Math.abs(move.x - center);
    const dy = Math.abs(move.y - center);
    const score = dx + dy;
    return { move, score };
  });
  scored.sort((a, b) => a.score - b.score);
  const bestScore = scored[0].score;
  const bestCandidates = scored.filter((entry) => entry.score === bestScore);
  const pool = bestCandidates.length > 3 ? bestCandidates.slice(0, 3) : bestCandidates;
  const choice = pool[Math.floor(Math.random() * pool.length)];
  return choice ? { x: choice.move.x, y: choice.move.y } : null;
}

function createFallbackModel(reason) {
  return {
    id: 'zen-go-fallback',
    backend: 'heuristic',
    reason,
    async suggestMove(context = {}) {
      const legalMoves = Array.isArray(context.legalMoves) ? context.legalMoves : [];
      const boardSize = context.board && Number.isInteger(context.board.size) ? context.board.size : legalMoves.length || 9;
      const selected = chooseHeuristicMove(legalMoves, boardSize);
      return selected ? { ...selected } : null;
    }
  };
}

async function loadZenGoModel() {
  if (!cachedModelPromise) {
    cachedModelPromise = (async () => {
      const runningInNode = typeof process !== 'undefined' && process.release && process.release.name === 'node';
      if (!runningInNode) {
        return createFallbackModel('non-node-environment');
      }

      let path;
      let fs;
      try {
        path = require('node:path');
        fs = require('node:fs/promises');
      } catch (error) {
        return createFallbackModel('missing-node-apis');
      }

      const modelRoot = process.env.ZENGO_MODEL_PATH || path.resolve(__dirname, '../model');
      let hasArtifacts = false;
      try {
        await fs.access(path.join(modelRoot, 'model.json'));
        hasArtifacts = true;
      } catch (error) {
        hasArtifacts = false;
      }

      if (!hasArtifacts) {
        if (!fallbackWarned && typeof console !== 'undefined' && console.warn) {
          console.warn(`[ZenGo] TFJS model not found at ${modelRoot}. Falling back to heuristic suggestions.`);
          fallbackWarned = true;
        }
        return createFallbackModel('missing-model');
      }

      try {
        const tf = await import('@tensorflow/tfjs-node');
        const modelUrl = `file://${path.resolve(modelRoot, 'model.json')}`;
        const model = await tf.loadGraphModel(modelUrl);
        return {
          id: 'zen-go-tfjs',
          backend: tf.getBackend ? tf.getBackend() : 'tfjs',
          async suggestMove(context = {}) {
            const legalMoves = Array.isArray(context.legalMoves) ? context.legalMoves : [];
            const boardSize = context.board && Number.isInteger(context.board.size) ? context.board.size : legalMoves.length || 9;
            if (legalMoves.length === 0) {
              return null;
            }
            // Placeholder heuristic selection until scoring is wired to the loaded model.
            return chooseHeuristicMove(legalMoves, boardSize);
          },
          dispose() {
            if (model && typeof model.dispose === 'function') {
              model.dispose();
            }
          }
        };
      } catch (error) {
        if (!fallbackWarned && typeof console !== 'undefined' && console.warn) {
          console.warn(`[ZenGo] Failed to load TFJS model: ${error.message}. Using heuristic fallback.`);
          fallbackWarned = true;
        }
        return createFallbackModel(error.message || 'tfjs-load-error');
      }
    })();
  }
  return cachedModelPromise;
}

module.exports = {
  loadZenGoModel
};
