# HTML Chess Assets

Place the Stockfish runtime files in this directory before running the launcher locally or building for production:

- `sf171-79.wasm`
- `nn-1c0000000000.nnue`
- `nn-37f18f62d772.nnue`

The `HtmlChessApp` dynamically imports `sf171-79.js` from this folder, which in turn expects the `.wasm` and NNUE buffers to live alongside it. Without these binaries, the Stockfish engine will fail to initialise.
