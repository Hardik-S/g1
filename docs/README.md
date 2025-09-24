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
* **Zen Do**: manage tasks in a zen-styled weekly garden with focus mode, gist sync, and a custom pointer-driven drag system for moving cards between the task tree, weekly buckets, and focus lists. 【F:src/apps/ZenDoApp/views/LandingView.js†L1-L168】【F:src/apps/ZenDoApp/views/TodayView.js†L1-L126】
* **N-Pomodoro**: orchestrate multi-activity pomodoro sessions with a synchronized pop-out mini timer.

### Games

* **Snake**: chase high scores across a responsive grid.
* **Hexa-Snake (Bee Edition)**: guide a bee across a honeycomb board.
* **Neon Pong**: duel classic paddles with a neon glow.
* **Pong Ring**: rally inside a circular quartz arena.
* **CatNap Leap**: glide between dreamy pillows while keeping a sleepy cat alert.
* **Sudoku Roast**: solve handcrafted puzzles in a cozy café setting.

### Learning Tools

* **Cat Typing Speed Test**: practise timed drills with Kimchi, Rythm, and Siella.
* **Quantum Playground**: design interactive circuits, run a four-qubit simulator, and visualize measurements.
* **Cache Lab**: explore cache mapping, replacement, hierarchy, and assessments via `/cache-lab`.
* **Cosmos Simulator**: orbit a scaled solar system with live Newtonian physics, camera fly-to controls, and keyboard navigation (arrows to orbit, WASD to pan, Q/E or +/- to dolly).
* **LangMath**: convert natural-language arithmetic into validated expressions evaluated with Pyodide.
* **Playlist Curator**: translate natural-language music prompts into relational algebra, visualize σ/π/⋈ plans, and inspect execution timelines.

#### Zen Do developer tips

Use the launcher dev server to iterate on drag gestures and console logging:

```bash
npm start
```

Target Zen Do scheduling helpers during debugging with Jest’s path filter or watch mode:

```bash
npm test -- src/apps/ZenDoApp/__tests__/taskUtils.test.js
npm test -- --watch src/apps/ZenDoApp/__tests__/taskUtils.test.js
```

Both commands are provided by the standard launcher scripts in `package.json`. 【F:package.json†L9-L21】

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
npm run dev
```

This launches the webpack dev server at [http://localhost:3000](http://localhost:3000) for the launcher and the Cache Lab Vite
instance at [http://localhost:4173](http://localhost:4173). Use `CACHE_LAB_DEV_URL` to point the iframe to a different Cache Lab
origin when necessary (e.g. a remote tunnel or alternate port).

### Build

```bash
npm run build
```

This step first builds the Cache Lab Vite bundle (`src/apps/cache-lab`), then runs Webpack to emit launcher assets into `dist/`.

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

* `npm run dev`: Run the launcher webpack dev server alongside the Cache Lab Vite dev server (defaults to ports 3000 and 4173).
* `npm start`: Start only the launcher webpack dev server at `http://localhost:3000`.
* `npm run build`: Build Cache Lab and the launcher production bundle into `dist/`.
* `npm run lint`: Lint launcher JavaScript/JSX with React, accessibility, and Testing Library rules.
* `npm run deploy`: Publish `dist/` to `gh-pages`.
* `npm test`: Run Jest suite for launcher React apps.

### Cache Lab Workspace

* `npm run build:cache-lab`: Build Cache Lab assets within `src/apps/cache-lab`.
* `npm run test:cache-lab`: Run Cache Lab unit tests via pnpm.
* `npm run e2e:cache-lab`: Run Playwright E2E tests for Cache Lab via pnpm.
* `CACHE_LAB_DEV_URL`: Optional env var to override the Cache Lab dev iframe URL when running `npm run dev`.

---

## Project Structure

```
g1/
├── apps/         # Other independent micro-app workspaces
├── docs/         # Additional guides and references
├── public/       # Static assets (root index.html)
├── src/          # Launcher source code + integrated apps
│   ├── components/        # Shared UI components
│   ├── apps/
│   │   ├── CacheLabApp/   # Launcher wrapper that embeds the lab
│   │   ├── cache-lab/     # Cache Lab pnpm workspace (Vite + TS)
│   │   └── ...            # Other integrated apps
│   └── registry.js        # App registration for launcher
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

* Custom pointer and HTML Drag and Drop controllers for Zen Do scheduling flows

### Cache Lab Subapp

* Vite + TypeScript + pnpm
* Vitest: unit & component testing
* Playwright: end-to-end testing

