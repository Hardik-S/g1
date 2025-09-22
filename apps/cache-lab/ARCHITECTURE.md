# Cache Learning Lab Architecture

## Overview

Cache Learning Lab is a self-contained Vite + React + TypeScript project housed under `apps/cache-lab`. It ships eight mini-modules and three auxiliary views (Learn, Experiment, Assess, Dashboard) that share a common state store. Everything renders client-side and persists to `localStorage` (key `cache-lab:v1`) when enabled.

## Directory structure

```
apps/cache-lab
├── public/            # static assets (sample traces)
├── src/
│   ├── components/    # cross-module panels (config form, panels, cards)
│   ├── lib/           # pure cache algorithms, parsing, analytics, assessments
│   ├── modules/       # individual teaching modules rendered as tabs
│   ├── state/         # Zustand store with persistence helpers
│   └── styles/        # global + layout CSS modules
├── tests/             # unit, property, and e2e suites
└── vite.config.ts
```

## State management

- `state/useCacheLabStore.ts` wraps Zustand with Immer for convenient immutable updates.
- The store tracks `config`, `trace`, derived `metrics`, persistence flag, and assessment progress.
- Persistence writes a subset of the state (config, trace, assessment, flag) to `localStorage` under `cache-lab:v1` when enabled and the trace is < 50 KB.

## Core algorithms (src/lib)

- `config.ts` – normalises cache parameters, computes address bit breakdown, validates power-of-two requirements, and performs tag/index/offset splitting.
- `cacheSimulator.ts` – generic set-associative simulator with LRU/FIFO/Random policies (Random uses a SEED=42 LCG), optional per-set history tracking, and hooks for miss classification.
- `missClassifier.ts` – implements the three-run method (compulsory/conflict/capacity) by comparing the configured cache against a fully associative baseline.
- `hierarchy.ts` – simulates inclusive L1→L3 hierarchies and reports per-level hit rates plus AMAT.
- `pipeline.ts` – evaluates CPI based on miss rate, miss penalty, and memory references per instruction.
- `traceParser.ts` – CSV ingestion for uploaded traces (supports hex/decimal, comments, optional tick column).
- `traces.ts` – built-in sequential/stride/random traces and a DSL (`seq`, `stride`, `random`).
- `analytics.ts` – helper analytics (block-size sweeps, per-set occupancy).
- `assessments.ts` – deterministic quiz generator using the shared simulator and SEED=42 RNG.

## UI layout

- `App.tsx` defines the high-level layout: a top navbar with section tabs, a left column hosting the modules/learn/experiment/assess/dashboard content, a right-side explanation card, and a bottom metrics strip.
- Modules are rendered via Radix Tabs; each module sets global metrics through the Zustand store so the metrics strip reflects the last interaction.
- Supporting panels (Learn/Experiment/Assess/Dashboard) reuse the same store and analytics functions to stay in sync.

## Integration with the launcher

- The existing launcher app registers Cache Lab in `src/apps/registry.js` and lazily loads `src/apps/CacheLabApp`, which embeds the built `/cache-lab/` route inside an iframe (with a pop-out link). This keeps the Vite app decoupled from the legacy webpack bundle while making it discoverable from the launcher UI.

## Build & deploy

- Run `pnpm --filter cache-lab build` to produce a static bundle under `apps/cache-lab/dist/` (not committed).
- Serve the built assets under the `/cache-lab/` path when deploying (GitHub Pages compatible). The iframe in `CacheLabApp` points to this route via `process.env.PUBLIC_URL` to remain path-aware.

## Testing strategy

- Unit tests cover address decomposition, mapping golden cases, policy behaviour, miss classification, hierarchy AMAT, pipeline CPI, and CSV parsing.
- Property-based tests (fast-check) assert idempotence of trace simulations and compare policy/locality invariants.
- Playwright e2e exercise the main flows: mapping, replacement, parameter sweep, classifier, hierarchy/pipeline linkage, trace loading, and dashboard navigation.
- Coverage is enforced via Vitest + c8 with 90% line/branch thresholds in `vite.config.ts`.
