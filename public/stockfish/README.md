# Stockfish Assets

The Chess app loads `stockfish.js` in a Web Worker. The worker expects to find a `stockfish.wasm` binary in the same folder, but the binary is not included in the repository.

Download the Stockfish 17.1 lite single-threaded WASM build and drop it here:

```bash
curl -L https://raw.githubusercontent.com/nmrugg/stockfish.js/master/src/stockfish-17.1-lite-single-03e3232.wasm \
  -o public/stockfish/stockfish.wasm
```

When deploying, make sure the generated build output also contains this file.
