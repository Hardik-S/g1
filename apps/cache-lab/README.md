# Cache Learning Lab

Cache Learning Lab is an interactive React + TypeScript playground that teaches cache memory fundamentals through eight mini-modules, a guided learn track, experiment hub, assessments, and a live performance dashboard. The experience runs entirely on the client and is suitable for static hosting (e.g., GitHub Pages).

## Getting started

```bash
pnpm install
pnpm --filter cache-lab dev
```

Open <http://localhost:4173> to explore the lab. The launcher app in this repository also exposes Cache Lab via the "Cache Lab" tile which embeds the `/cache-lab` route.

## Available scripts

- `pnpm --filter cache-lab dev` – start the Vite dev server
- `pnpm --filter cache-lab build` – type-check and build a static production bundle
- `pnpm --filter cache-lab preview` – preview the production bundle locally
- `pnpm --filter cache-lab test` – run the Vitest unit/property suite
- `pnpm --filter cache-lab test --coverage` – run tests with c8 coverage (90% threshold)
- `pnpm --filter cache-lab exec playwright test` – execute the Playwright end-to-end flow

## Features

- Mapping Explorer: address bit breakdown, cache grid hits, and deterministic walkthroughs.
- Replacement Simulator: compare LRU/FIFO/Random policies using a seeded PRNG (SEED=42).
- Parameter Playground: sweep cache parameters, visualise miss ratio trends, and export CSV.
- Locality Visualizer: built-in patterns, DSL authoring, and real-time miss plots.
- Miss Classifier: three-run compulsory/conflict/capacity analysis per access.
- Hierarchy Explorer: configure L1→L3 stacks, evaluate AMAT, and link into pipeline CPI.
- Pipeline Impact: translate miss behaviour into CPI with live miss-rate linkage.
- Trace Loader: validate CSV uploads, preview sample traces, and share across modules.
- Learn/Experiment/Assess/Dashboard views with persistence and assessments stored under `cache-lab:v1`.

## Screenshots

Add screenshots when available. A11y tooling (axe) reports no critical violations on the main modules.
