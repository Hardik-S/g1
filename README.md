## g1 — React Micro Apps Collection

A small, modular React playground bundling multiple apps behind a simple launcher. Built with Webpack and React 18, and deployable to GitHub Pages.

### Included apps

- Day Switcher (switch between days of the week)
- NPomodoro (Pomodoro timer)
- Snake (classic snake game)
- CirclePong (futuristic circular pong arena)

## Live demo

[Open on GitHub Pages](https://hardik-s.github.io/g1)

## Getting started

### Prerequisites

- Node.js 16+ (18+ recommended)
- npm

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

Artifacts are emitted to `dist/`.

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
- `npm run build` — Create production build in `dist/`
- `npm run deploy` — Publish `dist/` to `gh-pages`

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
│       ├── DaySwitcherApp/
│       │   ├── DaySwitcherApp.js
│       │   ├── DaySwitcherApp.css
│       │   └── index.js
│       ├── NPomodoroApp/
│       │   ├── NPomodoroApp.js
│       │   ├── NPomodoroApp.css
│       │   └── index.js
│       ├── SnakeApp/
│       │   ├── SnakeApp.js
│       │   ├── SnakeApp.css
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