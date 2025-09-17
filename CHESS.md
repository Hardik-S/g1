# Chess Sub-App

The Chess experience ships in two phases and is now fully integrated with the g1 React micro-app launcher while remaining
available as a standalone HTML page. The React version is bundled with the rest of the site so it works seamlessly on GitHub
Pages alongside the existing catalog of mini apps.

## Accessing Chess

### Inside the React launcher (recommended)
1. Install dependencies if you have not already: `npm install`.
2. Run `npm start` and open `http://localhost:3000`, or visit the published site at
   [`https://hardik-s.github.io/g1`](https://hardik-s.github.io/g1).
3. In the launcher, open the **Chessboard Summit** tile—featured on the home view and listed under the **Games** category—to
   load the chess experience. The component dynamically loads Chessboard.js, Chess.js, and Stockfish.js from their CDNs and
   shares styling with the standalone build so the look and feel matches the rest of the suite.

### Standalone fallback
- Open `html/chess.html` directly in a browser. It loads the exact same board and engine modules via CDN and is useful for
  smoke testing outside the React bundle.

## Phase 1 – Local Two-Player Chessboard
- Visual board powered by [Chessboard.js](https://github.com/oakmac/chessboardjs) with draggable pieces.
- `js/boardManager.js` keeps board state in sync with [Chess.js](https://github.com/jhlywa/chess.js) so every move is legally
  validated before it lands.
- Status panel surfaces whose turn it is, check, draw, and checkmate states. The **New Game** button resets to the starting
  position.

## Phase 2 – Stockfish Integration
- [Stockfish.js](https://github.com/official-stockfish/Stockfish) is loaded from jsDelivr. No binaries live in the repository,
  satisfying GitHub’s storage restrictions for large compiled artifacts.
- `js/stockfishEngine.js` wraps the global `Stockfish()` worker with cancelation and timing helpers.
- `src/apps/ChessApp/ChessApp.js` orchestrates the UI: toggle between two-player local play and a Stockfish opponent, adjust the
  skill slider (0–20), and reset games. In engine mode Stockfish always answers after one second with 0.5 seconds of thinking
  time, matching the spec.
- The modular design keeps board state separate from engine logic so alternative engines or offline play can be slotted in
  without touching the UI.

## Architecture notes
- Both the React component and standalone HTML page reuse the same `BoardManager` and `StockfishEngine` modules. The React
  wrapper disposes of workers and boards when unmounted to avoid leaking resources as you switch between other apps.
- External scripts and stylesheets are loaded once per session through a lightweight loader so multiple visits (or re-renders)
  do not inject duplicate `<script>` tags.

## Running Tests
1. Install dependencies: `npm install`.
2. Run the Jest suite: `npm test`.

The automated tests cover:
- Local move validation via `BoardManager`.
- Engine timing to ensure Stockfish waits a full second before committing a move.
- Verification that the HTML entry point references the CDN-hosted Stockfish script.

## Future Enhancements
- Clock support for blitz/rapid/classical time controls.
- Move history panel with undo/redo actions.
- Export played games as PGN.
- Highlight last move and show captured material balance.
- Multiplayer over the network with WebRTC or WebSockets.
