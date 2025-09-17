# App Container

A React-powered launcher that bundles multiple micro-apps under a single UI. It currently ships with:

- **Day Switcher** – cycle through the days of the week with animated transitions.
- **N-Pomodoro Timer** – orchestrate multi-activity focus sessions.
- **Snake Game** – revisit the arcade classic with persistent high scores.
- **Chess** – play classic chess either head-to-head or against Stockfish running in a Web Worker.

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Installation

```bash
npm install
```

### Development Server

```bash
npm start
```

The app is available at [http://localhost:3000](http://localhost:3000).

### Running Tests

```bash
npm test
```

## Chess App Setup

The Chess experience relies on the Stockfish 17.1 lite single-threaded WASM build. The Web Worker loader (`public/stockfish/stockfish.js`) expects to find a `stockfish.wasm` file alongside it, but the binary is not committed to the repository.

1. **Download the engine binary (≈7 MB) into the public assets folder:**
   ```bash
   curl -L https://raw.githubusercontent.com/nmrugg/stockfish.js/master/src/stockfish-17.1-lite-single-03e3232.wasm \
     -o public/stockfish/stockfish.wasm
   ```
2. **(PowerShell alternative)**
   ```powershell
   Invoke-WebRequest \
     -Uri "https://raw.githubusercontent.com/nmrugg/stockfish.js/master/src/stockfish-17.1-lite-single-03e3232.wasm" \
     -OutFile "public/stockfish/stockfish.wasm"
   ```
3. **Verify the download** – the resulting file should be roughly 7 MB and start with the bytes `00 61 73 6D` when inspected with a hex viewer.

With the WASM file in place, refresh/rebuild the project and Stockfish-powered single-player games will be available.

## Deployment

Create an optimized build with:

```bash
npm run build
```

The generated assets can be hosted on any static host (e.g., GitHub Pages, Netlify, Vercel). Remember to include the downloaded `public/stockfish/stockfish.wasm` file when publishing the build output.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
