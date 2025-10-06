# HTML Chess Assets

Place the Stockfish runtime files in this directory before running the launcher locally or building for production:

- `sf171-79.wasm`
- `nn-1c0000000000.nnue`
- `nn-37f18f62d772.nnue`

The `HtmlChessApp` dynamically imports `sf171-79.js` from this folder, which in turn expects the `.wasm` and NNUE buffers to live alongside it. Without these binaries, the Stockfish engine will fail to initialise.

Because the engine relies on `SharedArrayBuffer`, serve the launcher with `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` headers. Running `npm start` sets the correct headers automatically; if you use another server make sure it does the same.
