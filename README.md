# g1 React Micro Apps

A modular collection of experimental React experiences bundled behind a shared launcher. Each app ships fully client-side so the entire workspace can run offline or be deployed to GitHub Pages without a backend.

## Highlights

- **Unified launcher** with search, categories, favourites, and Toronto time badge.
- **Dozens of micro apps** spanning productivity tools, games, and interactive learning sandboxes.
- **Workspace-friendly builds** with webpack powering the launcher and Vite-based sub-workspaces when a project needs its own toolchain.
- **Offline-first exports** for experiences like Namecraft, Playlist Curator, and Cache Lab so researchers and students can collaborate without server dependencies.

## Included apps

### Productivity
- **Day Switcher** – cycle through the week with animated transitions.
- **CatPad** – cat-themed note editor with GitHub Gist syncing.
- **Zen Do** – garden-inspired task planner with focus mode, gist sync, and pointer-driven drag & drop flows.
- **N-Pomodoro** – orchestrate multi-activity pomodoro sessions with a synchronized pop-out mini timer.

### Games
- **Snake** – chase high scores across a responsive grid.
- **Hexa-Snake (Bee Edition)** – guide a bee across a honeycomb board.
- **Neon Pong** and **Pong Ring** – duel paddles across neon and circular arenas.
- **CatNap Leap** – glide between dreamy pillows while keeping a sleepy cat alert.
- **Sudoku Roast** – solve handcrafted puzzles in a cozy café setting.

### Learning tools
- **Cat Typing Speed Test** – practise timed drills with Kimchi, Rythm, and Siella.
- **Quantum Playground** – design circuits, run a four-qubit simulator, and visualize measurements.
- **Cache Lab** – explore cache mapping, replacement strategies, and assessments via `/cache-lab`.
- **Cosmos Simulator** – orbit a scaled solar system with Newtonian physics and fly-to controls.
- **LangMath** – convert natural-language arithmetic into validated expressions via Pyodide.
- **Namecraft** – craft linguistics-focused candidate names and run deterministic PLATO heuristics with export tooling.
- **Playlist Curator** – translate natural-language music prompts into relational algebra plans and execution timelines.
- **Relational Algebra Playground** – compose relational algebra pipelines with drag-and-drop blocks, SQL translation, CSV import, and guided challenges.

## Getting started

```bash
git clone https://github.com/Hardik-S/g1.git
cd g1
npm install
npm run dev
```

`npm run dev` launches the webpack dev server for the launcher and the Cache Lab Vite dev server. Visit [http://localhost:3000](http://localhost:3000) for the launcher grid or switch the Cache Lab iframe with the `CACHE_LAB_DEV_URL` environment variable.

### Common scripts

- `npm start` – start only the launcher webpack dev server.
- `npm run dev` – run the launcher and Cache Lab dev servers together.
- `npm run build` – build Cache Lab and emit the launcher bundle into `dist/`.
- `npm run lint` – lint launcher JavaScript/JSX with React, accessibility, and Testing Library rules.
- `npm test` – run the Jest suite for launcher React apps.
- `npm run deploy` – publish `dist/` to the `gh-pages` branch (ensure `homepage` is set in `package.json`).

## Additional documentation

The `docs/` directory contains deeper guides:

- [`docs/README.md`](docs/README.md) – expanded launcher overview and project structure.
- [`docs/APPS.md`](docs/APPS.md) – catalog of bundled micro apps with behaviour notes.
- [`docs/RelationalAlgebraPlayground.md`](docs/RelationalAlgebraPlayground.md) – quickstart and dataset format for the playground.
- [`docs/namecraft.md`](docs/namecraft.md) – heuristics workbench documentation for the Namecraft experience.
- [`docs/GITSTORY.md`](docs/GITSTORY.md) – chronological log of commits, merges, and design decisions.

## Contributing

Follow the guidelines in [`docs/AGENTS.md`](docs/AGENTS.md) for development conventions, required checks, and workspace-specific workflows. Pull requests that touch runtime code should run `npm test` and `npm run lint` before submission.

## License

This project is licensed under the terms of the [MIT License](LICENSE).
