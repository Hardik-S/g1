## g1 — React Micro Apps Collection

A small, modular React playground bundling multiple apps behind a simple launcher. Built with Webpack and React 18, and deployable to GitHub Pages.

### Included apps

- Day Switcher — flip through the week with animated transitions.
- CatPad — jot notes with a cat-themed editor that syncs through GitHub gists.
- Zen Do — manage a zen-styled task garden with weekly buckets, focus mode, and gist sync.
- Cat Typing Speed Test — practise timed typing drills with Kimchi, Rythm, and Siella.
- N-Pomodoro — orchestrate multi-activity pomodoro sessions.
- Snake — chase high scores across a responsive grid.
- Hexa-Snake (Bee Edition) — guide a bee across a honeycomb board.
- Neon Pong — duel classic paddles with a neon glow.
- Pong Ring — rally inside a circular quartz arena.
- CatNap Leap — glide between dreamy pillows while keeping a sleepy cat alert.
- Sudoku Roast — solve handcrafted puzzles in a café setting.
- Chessboard Summit — play local chess or spar with Stockfish.
- Cache Lab — explore cache mapping, replacement, hierarchy, and assessments via the `/cache-lab` subapp.

### Notes

- CirclePong has been renamed to Pong Ring with a refreshed canvas setup so the match starts reliably in the browser.

### Project documentation

- [`AGENTS.md`](AGENTS.md) — contributor handbook outlining required checks, code conventions, and documentation expectations.
- [`APPS.md`](APPS.md) — catalog of bundled micro apps with behaviour notes.
- [`CHESS.md`](CHESS.md) — reference for chess-specific helpers and utilities.
- [`GITSTORY.md`](GITSTORY.md) — chronological log of commits, pushes, merges, and key design decisions.

## Live demo

[Open on GitHub Pages](https://hardik-s.github.io/g1)

## Getting started

### Prerequisites

- Node.js 16+ (18+ recommended)
- npm
- pnpm (required for Cache Lab workspace scripts — [installation guide](https://pnpm.io/installation))

### Install

```bash
git clone https://github.com/Hardik-S/g1.git
cd g1
npm install
```

### Develop

```bash
npm start
```

Then open http://localhost:3000.

### Build

```bash
npm run build
```

This composite step first builds the Cache Lab Vite bundle from `apps/cache-lab`, then runs Webpack to emit launcher assets into `dist/`.

### Deploy (GitHub Pages)

1) Ensure `homepage` is set in `package.json` to your repo page (e.g. `https://hardik-s.github.io/g1`).

2) Deploy:

```bash
npm run deploy
```

3) In GitHub → Settings → Pages, set Source to the `gh-pages` branch if not already configured.

Your site will be available at the `homepage` URL.

## Scripts

- `npm start` — Start webpack dev server at `http://localhost:3000`
- `npm test` — Run the Jest suite for launcher React apps
- `npm run build:cache-lab` — Build the Cache Lab assets within `apps/cache-lab`
- `npm run build` — Build Cache Lab and create the launcher production bundle in `dist/`
- `npm run deploy` — Publish `dist/` to `gh-pages`
- `npm run test:cache-lab` — Run Cache Lab unit tests by invoking the workspace through pnpm
- `npm run e2e:cache-lab` — Execute Cache Lab Playwright E2E tests via the pnpm workspace

## Project structure

```
g1/
├── public/
│   └── index.html
├── src/
│   ├── index.js
│   ├── index.css
│   ├── App.js
│   ├── App.css
│   ├── components/
│   │   ├── AppContainer.js
│   │   ├── AppContainer.css
│   │   ├── AppLauncher.js
│   │   └── AppLauncher.css
│   └── apps/
│       ├── ChessApp/
│       │   ├── ChessApp.js
│       │   └── index.js
│       ├── CatPadApp/
│       │   ├── CatPadApp.js
│       │   ├── CatPadApp.css
│       │   └── index.js
│       ├── DaySwitcherApp/
│       │   ├── DaySwitcherApp.js
│       │   ├── DaySwitcherApp.css
│       │   └── index.js
│       ├── HexaSnakeApp/
│       │   ├── HexaSnakeApp.js
│       │   ├── HexaSnakeApp.css
│       │   └── index.js
│       ├── NPomodoroApp/
│       │   ├── NPomodoroApp.js
│       │   ├── NPomodoroApp.css
│       │   └── index.js
│       ├── PongApp/
│       │   ├── PongApp.js
│       │   ├── PongApp.css
│       │   └── index.js
│       ├── PongRingApp/
│       │   ├── PongRingApp.js
│       │   ├── PongRingApp.css
│       │   └── index.js
│       ├── SnakeApp/
│       │   ├── SnakeApp.js
│       │   ├── SnakeApp.css
│       │   └── index.js
│       ├── SudokuApp/
│       │   ├── SudokuApp.js
│       │   ├── SudokuApp.css
│       │   └── index.js
│       └── registry.js
├── dist/
│   └── ... (build output)
├── webpack.config.js
├── package.json
└── README.md
```

## Tech stack

- React 18
- Webpack 5 + webpack-dev-server
- Babel (`@babel/preset-env`, `@babel/preset-react`)

## Contributing

Pull requests are welcome. For larger changes, please open an issue to discuss the approach first.

## License

MIT — see `LICENSE`.