# EtymoSphere

EtymoSphere is a lightweight Vite + React application designed to ship as a static etymology explorer for GitHub Pages. The
scaffold focuses on a responsive layout, shared selection context, and accessibility-minded building blocks that will evolve
into fully interactive search, tree, timeline, and export experiences.

## Quick start

```bash
npm install
npm run dev
```

The development server runs on <http://localhost:5173>. A shared selection context seeds the UI with a sample entry so the
placeholder panes display meaningful copy during the first load.

## Available scripts

| Script | Description |
| ------ | ----------- |
| `npm run dev` | Start the Vite development server with hot module reloading. |
| `npm run build` | Type-check the project and produce a production build in `dist/`. |
| `npm run preview` | Serve the production build locally for smoke-testing. |
| `npm run test` | Execute Vitest + Testing Library unit tests. |
| `npm run lint` | Run ESLint with TypeScript, React Hooks, a11y, and Prettier alignment rules. |
| `npm run lint:fix` | Apply ESLint autofixes. |
| `npm run format` | Check formatting with Prettier. |
| `npm run format:write` | Format the codebase with Prettier. |

The repository root provides convenience aliases (`npm run etymosphere:dev`, `npm run etymosphere:test`, `npm run etymosphere:build`) so the
workspace integrates with the existing g1 toolchain.

## Tech stack decisions

- **Bundler:** Vite + TypeScript for a fast, typed client-only build.
- **Visualisation library:** [D3.js](https://d3js.org/) will power both the collapsible tree and timeline modules in later subtasks.
- **Testing:** Vitest with `@testing-library/react`, `@testing-library/user-event`, and `@testing-library/jest-dom` for DOM-focused tests.
- **Linting & formatting:** ESLint (TypeScript, React Hooks, JSX a11y) plus Prettier keeps the project aligned with g1 conventions.

## Layout preview

The current shell renders:

- a search and selection panel with accessible combobox scaffolding,
- placeholder tree and timeline panels that echo the chosen word and summarise forthcoming D3 behaviour,
- a toolbar card showing where the Markdown export workflow will live,
- footer messaging that confirms the shared selection state is working.

These panes will be replaced with live data-driven visualisations as tasks S2–S6 land.

## Next steps

1. Introduce the real `data/etymology.json` dataset and validation tooling.
2. Replace placeholders with D3-powered tree and timeline views sharing the central selection context.
3. Implement Markdown export + clipboard/download utilities.
4. Wire GitHub Pages-ready build settings and document deployment in the repository README.
