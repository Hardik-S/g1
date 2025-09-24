(function (globalScope, factory) {
  const existing = factory(globalScope);

  if (typeof module === 'object' && typeof module.exports === 'object') {
    module.exports = existing;
    module.exports.default = existing;
  } else if (typeof globalScope.define === 'function' && globalScope.define.amd) {
    globalScope.define([], function () {
      return existing;
    });
  } else {
    globalScope.ZenGoTensorflow = existing;
  }
})(
  typeof globalThis !== 'undefined' ? globalThis : typeof self !== 'undefined' ? self : this,
  function (globalScope) {
  'use strict';

  const DEFAULT_MODEL_SOURCES = Object.freeze({
    kyu: '/apps/zen-go/models/kyu/model.json',
    dan: '/apps/zen-go/models/dan/model.json',
  });
  const TFJS_BROWSER_BUNDLE = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js';

  const modelCache = new Map();
  const state = {
    tfPromise: null,
    modelSources: { ...DEFAULT_MODEL_SOURCES },
    browserScriptPromise: null,
  };

  const isNode = typeof process !== 'undefined' && !!(process.versions && process.versions.node);

  function normalizeModule(mod) {
    if (mod && typeof mod === 'object' && 'default' in mod) {
      return mod.default;
    }
    return mod;
  }

  async function loadBackend() {
    if (state.tfPromise) {
      return state.tfPromise;
    }

    if (isNode) {
      state.tfPromise = import('@tensorflow/tfjs-node').then(normalizeModule);
      return state.tfPromise;
    }

    if (globalScope.tf && typeof globalScope.tf.loadGraphModel === 'function') {
      state.tfPromise = Promise.resolve(globalScope.tf);
      return state.tfPromise;
    }

    state.tfPromise = import('@tensorflow/tfjs')
      .then(normalizeModule)
      .catch((error) => {
        if (globalScope.tf && typeof globalScope.tf.loadGraphModel === 'function') {
          return globalScope.tf;
        }

        if (typeof document === 'undefined') {
          throw error;
        }

        state.browserScriptPromise =
          state.browserScriptPromise ||
          loadBrowserBundle().catch((scriptError) => {
            throw scriptError || error;
          });

        return state.browserScriptPromise;
      });

    return state.tfPromise;
  }

  function loadBrowserBundle() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.async = true;
      script.src = TFJS_BROWSER_BUNDLE;
      script.onload = () => {
        if (globalScope.tf && typeof globalScope.tf.loadGraphModel === 'function') {
          resolve(globalScope.tf);
          return;
        }
        reject(new Error('Zen Go Tensorflow: TensorFlow.js script loaded without exposing a global tf object.'));
      };
      script.onerror = () => {
        reject(new Error(`Zen Go Tensorflow: Failed to load TensorFlow.js bundle from ${TFJS_BROWSER_BUNDLE}.`));
      };

      document.head.appendChild(script);
    });
  }

  async function loadGraphModel(source, loadOptions) {
    if (!source) {
      throw new Error('Zen Go Tensorflow: A model source must be provided to loadGraphModel.');
    }

    const tf = await loadBackend();
    if (!tf || typeof tf.loadGraphModel !== 'function') {
      throw new Error('Zen Go Tensorflow: Failed to load a TensorFlow.js backend.');
    }

    return tf.loadGraphModel(source, loadOptions);
  }

  function getModelSource(key) {
    return state.modelSources[key] ?? null;
  }

  function setModelSource(key, source) {
    if (!key) {
      throw new Error('Zen Go Tensorflow: A model key is required when calling setModelSource.');
    }

    if (source == null) {
      delete state.modelSources[key];
      modelCache.delete(key);
      return;
    }

    state.modelSources[key] = source;
    modelCache.delete(key);
  }

  async function loadModel(key, options = {}) {
    const source = options.source ?? getModelSource(key);

    if (!source) {
      throw new Error(`Zen Go Tensorflow: No model source configured for "${key}".`);
    }

    if (!modelCache.has(key)) {
      modelCache.set(key, loadGraphModel(source, options.loadOptions));
    }

    return modelCache.get(key);
  }

  async function loadKyuModel(options) {
    return loadModel('kyu', options);
  }

  async function loadDanModel(options) {
    return loadModel('dan', options);
  }

  function clearModelCache(key) {
    if (typeof key === 'string') {
      modelCache.delete(key);
      return;
    }

    modelCache.clear();
  }

  function reset() {
    clearModelCache();
    state.tfPromise = null;
    state.browserScriptPromise = null;
  }

  return {
    DEFAULT_MODEL_SOURCES,
    loadBackend,
    loadGraphModel,
    loadModel,
    loadKyuModel,
    loadDanModel,
    setModelSource,
    getModelSource,
    clearModelCache,
    reset,
    isNode: function () {
      return isNode;
    },
  };
});
