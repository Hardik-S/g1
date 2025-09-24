# Namecraft (MVP)

Namecraft is a deterministic, client-side heuristics workbench for graduate linguistics cohorts. It ships inside the `g1`
launcher so researchers can create rooms, collect candidate names, add stress-test scenarios, and run a reproducible PLATO rubric
without network dependencies or LLM calls. Everything runs in the browser—perfect for GitHub Pages deployments and offline-first
studios.

## Features

- **Room lifecycle**: create/list rooms, capture candidate names, log scenarios, and run deterministic tests in ≤4 clicks.
- **Heuristics engine**: Goal Alignment, Discriminability, Imitation, Transparency, Pronounceability, and Robustness with
  weighted scoring, deterministic rules, and diagnostics summarising any failed thresholds.
- **Exports**: PLATO.md preview + clipboard copy, PDF (via jsPDF), JSON export/restore, and ≤2KB base64 share URLs compressed with
  LZ-string.
- **Collaboration**: import shared or JSON rooms with a merge dialog that resolves conflicts by keeping, replacing, or deduping
  sections.
- **Persistence**: rooms live in `localStorage` under the namespaced key `namecraft::rooms`.
- **Keyboard shortcuts**: `N` focuses the candidate field, `T` runs the heuristics, `E` copies PLATO.md.
- **Diagnostics**: single-line summaries for each heuristic failure plus rubric-driven refinements.

## Getting started

```bash
npm install
npm start
```

This launches the existing webpack dev server on http://localhost:3000 with Namecraft available from the launcher grid (or
`#/apps/namecraft`).

### Tests

```bash
npm test -- src/apps/NamecraftApp
```

The suite includes deterministic heuristics fixtures and the automated acceptance flow that creates a room, runs the engine, and
asserts the PLATO.md headings.

### Build

```bash
npm run build
```

Webpack bundles the launcher into `dist/` and keeps Cache Lab’s sub-build in sync.

### Deploy

```bash
npm run deploy
```

This publishes `dist/` to the `gh-pages` branch. Update the `homepage` field in `package.json` if you fork the repo.

## Data & exports

- `examples/room-sample.json` contains a ready-made cohort room you can import through the sidebar.
- PLATO exports always contain the headings `P`, `L`, `A`, `T`, `O` so documentation remains scannable.
- Share URLs are generated via `lz-string` compression and target the `#/apps/namecraft?share=...` hash route. The share payload is
  validated to stay under 2KB.
- Optional PDF output is produced client-side with `jsPDF` and mirrors the PLATO sections.

## Optional GitHub PAT export (disabled by default)

The codebase includes comments in `src/apps/NamecraftApp/utils/exporters.js` describing how to wire a PAT-backed commit flow using
GitHub’s REST API (`PUT /repos/{owner}/{repo}/contents/{path}`). To enable it safely:

1. Generate a fine-grained PAT with “Contents: Read & Write” scope.
2. Store it manually via the browser console: `localStorage.setItem('namecraft::gh-pat', '<token>')`.
3. Build a custom handler that reads the token and POSTs commit payloads on explicit user action. The shipped UI intentionally
   leaves this step commented out to keep deployments PAT-free by default.

## Demo

Run the quick-start flow to create a room, add a candidate name and scenario, execute the heuristics, and export PLATO.md—the
same sequence covered by the automated acceptance test.

## Keyboard reference

| Key | Action                     |
| --- | -------------------------- |
| N   | Focus the add-candidate field |
| T   | Run deterministic heuristics |
| E   | Copy PLATO.md to clipboard   |

## Storage

- Rooms: `localStorage['namecraft::rooms']`
- Optional PAT (off by default): `localStorage['namecraft::gh-pat']`

Clear storage from the sidebar, or run `localStorage.removeItem('namecraft::rooms')` from the console.

## Bonus experiences

- **Snake 2.0** — A canvas-powered creative redesign of the classic snake, complete with Neon Grid, Organic Garden, and Minimal Elegance themes, Classic/Zen/Survival/Multiplayer modes, combo multipliers, and floating HUD overlays. Launch it from the g1 grid under 🌀 Snake 2.0 (`#/apps/snake-2`).
