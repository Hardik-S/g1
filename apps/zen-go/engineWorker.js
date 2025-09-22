const GNUGO_SCRIPT_URL = 'https://raw.githubusercontent.com/TristanCacqueray/wasm-gnugo/master/javascript/gnugo.js';
const GNUGO_WASM_URL = 'https://raw.githubusercontent.com/TristanCacqueray/wasm-gnugo/pages/gnugo.wasm';

let loaderPromise = null;
let announcedReady = false;
let profiles = {};
let fallbackDifficultyId = null;

self.addEventListener('message', (event) => {
  const data = event.data || {};
  switch (data.type) {
    case 'bootstrap':
      profiles = Array.isArray(data.profiles)
        ? data.profiles.reduce((acc, item) => {
            if (!item || !item.id) {
              return acc;
            }
            acc[item.id] = {
              seeds: Array.isArray(item.seeds) ? item.seeds : [0],
              randomness: typeof item.randomness === 'number' ? item.randomness : 0
            };
            return acc;
          }, {})
        : {};
      fallbackDifficultyId = data.defaultDifficulty || Object.keys(profiles)[0] || null;
      break;
    case 'warmup':
      ensureModule().catch((error) => {
        postMessage({ type: 'error', message: error.message || String(error) });
      });
      break;
    case 'setDifficulty':
      if (data.difficulty && profiles[data.difficulty]) {
        fallbackDifficultyId = data.difficulty;
      }
      break;
    case 'compute':
      handleCompute(data).catch((error) => {
        postMessage({
          type: 'error',
          requestId: data.requestId,
          message: error.message || String(error)
        });
      });
      break;
    default:
      break;
  }
});

async function handleCompute(data) {
  if (!data || !data.sgf) {
    throw new Error('Missing SGF payload.');
  }
  const Module = await ensureModule();
  const profile = profiles[data.difficulty] || profiles[fallbackDifficultyId];
  if (!profile) {
    throw new Error('No difficulty profile available.');
  }

  const seen = new Set();
  const candidates = [];

  for (const seed of profile.seeds) {
    const sgf = Module.ccall('play', 'string', ['number', 'string'], [seed, data.sgf]);
    const move = extractLastMove(sgf);
    if (!move) {
      continue;
    }
    const key = `${move.color}:${move.coord || 'pass'}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    candidates.push({ seed, sgf, move });
  }

  if (!candidates.length) {
    throw new Error('Engine returned no candidates.');
  }

  let chosen = candidates[0];
  if (profile.randomness > 0 && candidates.length > 1) {
    const roll = Math.random();
    if (roll < profile.randomness) {
      const index = 1 + Math.floor(Math.random() * (candidates.length - 1));
      chosen = candidates[index];
    }
  }

  postMessage({
    type: 'result',
    requestId: data.requestId,
    move: chosen.move,
    sgf: chosen.sgf,
    seed: chosen.seed,
    difficulty: data.difficulty || fallbackDifficultyId
  });
}

function extractLastMove(sgf) {
  if (typeof sgf !== 'string') {
    return null;
  }
  const matches = sgf.match(/;[BW]\[[^\]]*\]/g);
  if (!matches || !matches.length) {
    return null;
  }
  const token = matches[matches.length - 1];
  const color = token[1];
  const coord = token.slice(3, token.length - 1);
  return {
    color,
    coord: coord || null,
    isPass: coord.length === 0
  };
}

function ensureModule() {
  if (loaderPromise) {
    return loaderPromise;
  }

  loaderPromise = new Promise((resolve, reject) => {
    try {
      const exportBox = {};
      self.exports = exportBox;
      importScripts(GNUGO_SCRIPT_URL);
      const loader = exportBox;
      delete self.exports;
      loader
        .get(GNUGO_WASM_URL)
        .then((Module) => Module.ready.then(() => Module))
        .then((Module) => {
          announceReadyOnce();
          resolve(Module);
        })
        .catch((error) => {
          loaderPromise = null;
          reject(error);
        });
    } catch (error) {
      loaderPromise = null;
      reject(error);
    }
  });

  return loaderPromise;
}

function announceReadyOnce() {
  if (!announcedReady) {
    announcedReady = true;
    postMessage({ type: 'engine-ready' });
  }
}
