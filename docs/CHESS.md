# Chess Sub-App

The Chess sub-application is delivered in two incremental phases. It lives alongside the existing project as a collection of static assets (`html/`, `js/`, and `css/`) so it can be served without impacting the React bundle.

## Phase 1 – Local Two-Player Chessboard

### Setup
1. Open `html/chess.html` in your browser. No local build step is required; all dependencies are loaded via CDNs.
2. The page includes [Chessboard.js](https://github.com/oakmac/chessboardjs) for the visual board and [Chess.js](https://github.com/jhlywa/chess.js) for rules enforcement.
3. `js/boardManager.js` handles board wiring, move validation, and integrates with Chess.js so only legal moves are accepted.

### Usage
- Drag pieces to make moves. Illegal moves automatically snap back.
- The **New Game** button resets the position.
- Status messaging (whose turn, check, mate, draw) updates after every move.

## Phase 2 – Stockfish Integration

### Setup
1. The same HTML entry point (`html/chess.html`) now also loads [Stockfish.js](https://github.com/official-stockfish/Stockfish) via jsDelivr CDN.
2. `js/stockfishEngine.js` wraps the global `Stockfish()` worker so engine logic is isolated from board state.
3. `js/chess.js` composes the board and engine layers and exposes UI controls for the active mode and Stockfish skill level.

### Usage
- Use the **Mode** dropdown to choose between:
  - **2 Player Local** – both sides are human controlled.
  - **Play vs Stockfish** – you play White, Stockfish plays Black.
- In engine mode Stockfish always replies 1 second after your move. It spends 0.5 seconds thinking (`go movetime 500`) before responding.
- Adjust the **Skill Level** slider (0–20) to tweak Stockfish’s strength. The slider is disabled in two-player mode.
- The board logic and engine logic are modular; Stockfish can be swapped or disabled by updating the `StockfishEngine` wrapper without touching the board manager.

### Rationale for CDN Stockfish
Stockfish distributes WebAssembly binaries. GitHub forbids storing large engine binaries in source control, so the app references Stockfish.js directly from a CDN. This keeps the repository lightweight and guarantees users always load the official build.

## Running Tests
1. Install dependencies: `npm install` (if not already done).
2. Execute the automated suite: `npm test`.

The Jest tests cover:
- Local move validation via `BoardManager`.
- Engine timing to ensure Stockfish waits a full second before moving.
- Verification that the HTML entry point references the CDN-hosted Stockfish script.

## Future Enhancements
- Clock support for blitz/rapid/classical time controls.
- Move history panel with undo/redo actions.
- Export played games as PGN.
- Highlight last move and show captured material balance.
- Multiplayer over the network with WebRTC or WebSockets.
