# g1: React Micro Apps Collection

A modular collection of React-based micro-apps bundled under a unified launcher.
Built with **React 18** and **Webpack 5**, with select subapps powered by **Vite + TypeScript**.
Deployable to **GitHub Pages** for quick sharing and testing.

---

## Preview

Gif coming soon

---

## Included Apps

### Productivity

* **Day Switcher**: cycle through the week with animated transitions.
* **CatPad**: cat-themed note editor with GitHub gist syncing.
* **Zen Do**: manage tasks in a zen-styled weekly garden with focus mode and gist sync.
* **N-Pomodoro**: orchestrate multi-activity pomodoro sessions.

### Games

* **Snake**: chase high scores across a responsive grid.
* **Hexa-Snake (Bee Edition)**: guide a bee across a honeycomb board.
* **Neon Pong**: duel classic paddles with a neon glow.
* **Pong Ring**: rally inside a circular quartz arena.
* **CatNap Leap**: glide between dreamy pillows while keeping a sleepy cat alert.
* **Sudoku Roast**: solve handcrafted puzzles in a cozy café setting.
* **Chessboard Summit**: play local chess or spar with Stockfish.

### Learning Tools

* **Cat Typing Speed Test**: practise timed drills with Kimchi, Rythm, and Siella.
* **Cache Lab**: explore cache mapping, replacement, hierarchy, and assessments via `/cache-lab`.

---

## Launcher Features

* Universal search filters apps by title or description
* Category filters narrow down experiences
* Grid/List toggle for compact or detailed views
* Featured apps surface in a hero rail
* Toronto time badge keeps global clock visible
* Favorites pin chosen apps to the top (persisted via `localStorage`)

---

## Documentation

* [`AGENTS.md`](AGENTS.md): contribution workflow, checks, and conventions.
* [`APPS.md`](APPS.md): catalog of bundled micro-apps with behavior notes.
* [`CHESS.md`](CHESS.md): chess-specific helpers and utilities.
* [`GITSTORY.md`](GITSTORY.md): chronological log of commits, merges, and design decisions.

---

## Live Demo

[Open on GitHub Pages](https://hardik-s.github.io/g1)

---

## Getting Started

### Prerequisites

* Node.js **16+** (18+ recommended)
* npm
* pnpm *(required only for Cache Lab workspace scripts: [install guide](https://pnpm.io/installation))*

### Quick Start

```bash
git clone https://github.com/Hardik-S/g1.git
cd g1
npm install
npm start
```

Then open [http://localhost:3000](http://localhost:3000).

### Build

```bash
npm run build
```

This step first builds the Cache Lab Vite bundle (`apps/cache-lab`), then runs Webpack to emit launcher assets into `dist/`.

### Deploy (GitHub Pages)

1. Ensure `homepage` in `package.json` points to your repo page (e.g. `https://hardik-s.github.io/g1`).
2. Deploy:

   ```bash
   npm run deploy
   ```
3. In **GitHub → Settings → Pages**, set Source to the `gh-pages` branch.

Your site will be available at the `homepage` URL.

---

## Scripts

### Launcher

* `npm start`: Start webpack dev server at `http://localhost:3000`.
* `npm run build`: Build Cache Lab and the launcher production bundle into `dist/`.
* `npm run deploy`: Publish `dist/` to `gh-pages`.
* `npm test`: Run Jest suite for launcher React apps.

### Cache Lab Workspace

* `npm run build:cache-lab`: Build Cache Lab assets within `apps/cache-lab`.
* `npm run test:cache-lab`: Run Cache Lab unit tests via pnpm.
* `npm run e2e:cache-lab`: Run Playwright E2E tests for Cache Lab via pnpm.

---

## Project Structure

```
g1/
├── apps/         # Independent micro-app workspaces
├── docs/         # Additional guides and references
├── public/       # Static assets (root index.html)
├── src/          # Launcher source code + integrated apps
│   ├── components/   # Shared UI components
│   ├── apps/         # Integrated app directories
│   └── registry.js   # App registration for launcher
├── dist/         # Build output
├── webpack.config.js
├── package.json
└── README.md
```

---

## Tech Stack

### Frontend

* React 18
* Webpack 5 + webpack-dev-server
* Babel (`@babel/preset-env`, `@babel/preset-react`)

### Utilities

* SortableJS: drag-and-drop reordering in shared UIs

### Cache Lab Subapp

* Vite + TypeScript + pnpm
* Vitest: unit & component testing
* Playwright: end-to-end testing

